import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { config } from '../src/config';

// Test harness, not application code. It may call the bank admin API and read
// .data/app.sqlite read-only; code under src/ and app/ must never do either, and
// nothing here opens the bank database. See submission/02-decisions.md (D7).
// Every case is judged against docs/contracts.md, not against current behaviour.

type Reply = { http: number; data: Record<string, any> };
type Transfer = {
  fromAccountId: string;
  toAccountId: string;
  amountCents: number;
  concept: string;
};
type Outcome = { said: string; bank: string; pass: boolean | null };
type Case = {
  id: string;
  story: string;
  scenario: string;
  contract: string;
  run: () => Promise<Outcome>;
};

const argv = process.argv.slice(2);
const option = (name: string) => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : undefined);
const label = option('--label');
const only = option('--only')?.split(',');
const run = Date.now().toString(36);
const appUrl = `http://127.0.0.1:${config.appPort}`;
const json = { 'Content-Type': 'application/json' };
const eur = (cents: number) =>
  `${new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2 }).format(cents / 100)} EUR`;

function stop(message: string): never {
  console.error(message);
  process.exit(2);
}
if (Number(process.versions.node.split('.')[0]) < 24)
  stop(`Se necesita Node 24 o superior (actual: ${process.version}). Ejecuta "nvm use".`);
if (label && !/^[a-z0-9][a-z0-9-]*$/.test(label))
  stop('La etiqueta solo admite minúsculas, cifras y guiones.');
if (!['127.0.0.1', 'localhost'].includes(new URL(config.bankUrl).hostname))
  stop('Este script restablece el banco: solo se ejecuta contra un banco local.');
for (const [name, url] of [
  ['la aplicación', `${appUrl}/api/health`],
  ['el banco', `${config.bankUrl}/health`],
]) {
  const ok = await fetch(url, { signal: AbortSignal.timeout(3000) })
    .then((r) => r.ok)
    .catch(() => false);
  if (!ok) stop(`No responde ${name}. Arranca los servicios con "npm run dev".`);
}

const cookies = new Map<string, string>();
async function app(userId: string, route: string, body?: unknown): Promise<Reply> {
  if (!cookies.has(userId)) {
    const r = await fetch(`${appUrl}/api/session`, {
      method: 'POST',
      headers: json,
      body: JSON.stringify({ userId }),
    });
    const cookie = r.headers.getSetCookie()[0]?.split(';')[0];
    if (!r.ok || !cookie) throw new Error(`No se pudo abrir sesión como ${userId}.`);
    cookies.set(userId, cookie);
  }
  const r = await fetch(`${appUrl}/api/${route}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { ...json, cookie: cookies.get(userId)! },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { http: r.status, data: await r.json() };
}
async function admin(route: string, body: unknown = {}) {
  const r = await fetch(`${config.bankUrl}/admin/${route}`, {
    method: 'POST',
    headers: { ...json, Authorization: `Bearer ${config.adminSecret}` },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`El banco devolvió ${r.status} en /admin/${route}.`);
}
// Each case starts from the seeded ledger with a fresh scenario counter.
async function prepare(profile: string, seed = 17) {
  await admin('reset');
  await admin('scenario', { profile, seed });
}
async function appRows<T>(sql: string, ...params: unknown[]) {
  const Database = (await import('better-sqlite3')).default;
  const db = new Database(path.join(config.dataDir, 'app.sqlite'), {
    readonly: true,
    fileMustExist: true,
  });
  try {
    return db.prepare(sql).all(...params) as T[];
  } finally {
    db.close();
  }
}
const appRow = async <T>(sql: string, ...params: unknown[]) =>
  (await appRows<T>(sql, ...params))[0] as T | undefined;

// What the customer sees: balance and the movements carrying this concept.
async function ledger(userId: string, accountId: string, concept: string) {
  const { http, data } = await app(userId, 'dashboard');
  if (!Array.isArray(data.accounts)) throw new Error(`El panel de ${userId} devolvió ${http}.`);
  return {
    balance: data.accounts.find((a: any) => a.id === accountId)?.balanceCents as number,
    entries: (data.movements as any[]).filter(
      (m) => m.accountId === accountId && String(m.description).includes(concept),
    ),
  };
}
const request = (userId: string, transfer: Transfer, intentId?: string) =>
  app(userId, 'actions', {
    name: 'transfer_money',
    arguments: transfer,
    ...(intentId ? { intentId } : {}),
  });
// Once review is mandatory, the customer confirms the proposal explicitly.
async function confirm(userId: string, transfer: Transfer, result: Reply): Promise<Reply> {
  if (result.data.status !== 'requires_confirmation') return result;
  let id = result.data.approval?.id ?? result.data.approvalId;
  if (!id)
    id = (await app(userId, 'dashboard')).data.approvals?.find(
      (a: any) => a.payload?.concept === transfer.concept,
    )?.id;
  if (!id) throw new Error('La aplicación pide confirmación pero no expone la propuesta.');
  return app(userId, `approvals/${id}/confirm`, {});
}
const send = async (userId: string, transfer: Transfer, intentId?: string) =>
  confirm(userId, transfer, await request(userId, transfer, intentId));
const confirmAs = (userId: string, approvalId: string, body: unknown = {}) =>
  app(userId, `approvals/${approvalId}/confirm`, body);
// Asks for a transfer and stops at the proposal, without confirming it.
async function proposeOnly(userId: string, transfer: Transfer) {
  const reply = await request(userId, transfer);
  return { reply, id: reply.data.approval?.id as string | undefined };
}
// Without a proposal there is nothing to review: the money has already moved, or nothing was offered.
async function noProposal(reply: Reply, transfer: Transfer): Promise<Outcome> {
  const e = await effects(transfer, 'lucia', 'bruno');
  return {
    said: `${said(reply)} · no hay ninguna propuesta que revisar`,
    bank: e.text,
    pass: false,
  };
}
const said = (r: Reply) => {
  const status = r.data.status ? `\`${r.data.status}\`` : `HTTP ${r.http}`;
  return r.data.error ? `${status} · «${r.data.error}»` : status;
};
const failed = (r: Reply) => r.data.status === 'failed' || r.http >= 400;
const toBruno = (id: string, amountCents = 1000): Transfer => ({
  fromAccountId: 'acc-lucia',
  toAccountId: 'acc-bruno',
  amountCents,
  concept: `repro-${id}-${run}`,
});
async function effects(transfer: Transfer, from: string, to: string) {
  const debits = (await ledger(from, transfer.fromAccountId, transfer.concept)).entries.length;
  const credits = (await ledger(to, transfer.toAccountId, transfer.concept)).entries.length;
  return {
    debits,
    credits,
    text: `${debits} cargo(s), ${eur(debits * transfer.amountCents)} en total · ${credits} abono(s) al destinatario`,
  };
}
// One payment, one bank incident: exactly one effect and no false failure.
async function singlePayment(id: string, from = 'lucia', to = 'bruno', transfer = toBruno(id)) {
  const result = await send(from, transfer);
  const e = await effects(transfer, from, to);
  return {
    said: said(result),
    bank: e.text,
    pass: e.debits === 1 && e.credits === 1 && !failed(result),
  };
}

const cases: Case[] = [
  {
    id: 'R0',
    story: 'El equipo comprueba que lo que ya funcionaba sigue funcionando.',
    scenario: '—',
    contract: 'Las pruebas públicas y la comprobación de tipos pasan.',
    run: async () => {
      const results = [['test'], ['run', 'typecheck']].map((args) => ({
        name: `npm ${args.join(' ')}`,
        code: spawnSync('npm', args, { encoding: 'utf8', shell: process.platform === 'win32' })
          .status,
      }));
      return {
        said: results.map((r) => `${r.name}: salida ${r.code}`).join(' · '),
        bank: '—',
        pass: results.every((r) => r.code === 0),
      };
    },
  },
  {
    id: 'R1',
    story: 'Lucía envía 10 EUR a Bruno y se pierde la respuesta del banco: ¿paga una sola vez?',
    scenario: 'lost-response',
    contract: 'Un solo cargo y ningún «fallida» sobre un pago hecho.',
    run: async () => {
      await prepare('lost-response');
      return singlePayment('R1');
    },
  },
  {
    id: 'R2',
    story:
      'Lucía hace tres pagos iguales de 10 EUR a Bruno en un día con incidencias: ¿paga 30 EUR, ni más ni menos?',
    scenario: 'intermittent 17',
    contract: 'Tres órdenes distintas, tres cargos: 30,00 EUR.',
    run: async () => {
      await prepare('intermittent', 17);
      const transfer = toBruno('R2');
      const replies: Reply[] = [],
        charged: number[] = [];
      let balance = (await ledger('lucia', 'acc-lucia', transfer.concept)).balance;
      for (let i = 0; i < 3; i++) {
        replies.push(await send('lucia', transfer));
        const now = (await ledger('lucia', 'acc-lucia', transfer.concept)).balance;
        charged.push(balance - now);
        balance = now;
      }
      const e = await effects(transfer, 'lucia', 'bruno');
      return {
        said: replies.map(said).join(' / '),
        bank: `${e.text} · por pago: ${charged.map(eur).join(' / ')}`,
        pass: e.debits === 3 && e.credits === 3 && !replies.some(failed),
      };
    },
  },
  {
    id: 'R3',
    story: 'Lucía envía 10 EUR a Bruno y el banco tarda en responder: ¿paga una sola vez?',
    scenario: 'slow-response',
    contract: 'Un solo cargo y ningún «fallida» sobre un pago hecho.',
    run: async () => {
      await prepare('slow-response');
      return singlePayment('R3');
    },
  },
  {
    id: 'R4',
    story:
      'La aplicación de Lucía reenvía la misma orden de 10 EUR tras un corte de red: ¿se ejecuta una sola vez?',
    scenario: 'normal',
    contract: 'La misma orden (mismo intentId) produce un solo cargo.',
    run: async () => {
      await prepare('normal');
      const transfer = toBruno('R4'),
        intentId = `repro-R4-${run}`;
      const first = await send('lucia', transfer, intentId);
      const second = await send('lucia', transfer, intentId);
      const e = await effects(transfer, 'lucia', 'bruno');
      const op = (r: Reply) => String(r.data.operation?.id ?? 'sin operación').slice(0, 8);
      return {
        said: `1.ª: ${said(first)} (op ${op(first)}) · 2.ª: ${said(second)} (op ${op(second)})`,
        bank: e.text,
        pass: e.debits === 1 && e.credits === 1,
      };
    },
  },
  {
    id: 'R5',
    story:
      'Lucía pide una transferencia de 10 EUR: ¿puede revisar importe, origen y destino antes de que salga el dinero?',
    scenario: 'normal',
    contract: 'Sin confirmación explícita no se mueve dinero.',
    run: async () => {
      await prepare('normal');
      const transfer = toBruno('R5');
      const result = await request('lucia', transfer);
      const e = await effects(transfer, 'lucia', 'bruno');
      const proposals = ((await app('lucia', 'dashboard')).data.approvals ?? []).filter(
        (a: any) => a.payload?.concept === transfer.concept,
      ).length;
      return {
        said: `${said(result)} · propuestas pendientes visibles: ${proposals}`,
        bank: `${e.text} (antes de confirmar)`,
        pass: result.data.status === 'requires_confirmation' && e.debits === 0 && proposals === 1,
      };
    },
  },
  {
    id: 'R7',
    story:
      'Diego, con 75 EUR, envía 50 EUR a Inés y se pierde la respuesta del banco: ¿se le dice la verdad sobre su dinero?',
    scenario: 'lost-response',
    contract: 'Un solo cargo y ningún «fondos insuficientes» sobre un pago hecho.',
    run: async () => {
      await prepare('lost-response');
      const transfer: Transfer = {
        fromAccountId: 'acc-diego',
        toAccountId: 'acc-ines',
        amountCents: 5000,
        concept: `repro-R7-${run}`,
      };
      const outcome = await singlePayment('R7', 'diego', 'ines', transfer);
      const balance = (await ledger('diego', 'acc-diego', transfer.concept)).balance;
      return { ...outcome, bank: `${outcome.bank} · saldo de Diego: ${eur(balance)}` };
    },
  },
  {
    id: 'R8',
    story:
      'El viernes se le dijo a Lucía que su pago de 85 EUR había fallado: ¿coincide lo que guarda la aplicación con lo que hizo el banco?',
    scenario: 'normal (sin mover dinero)',
    contract: 'El estado guardado coincide con el hecho verificado en el banco.',
    run: async () => {
      await prepare('normal');
      const bank = await app('lucia', 'actions', {
        name: 'operation_status',
        arguments: { reference: 'ref-historic-lucia' },
      });
      const intent = await appRow<{ status: string; error: string | null }>(
        'SELECT status,error FROM intents WHERE id=?',
        'intent-historic-lucia',
      );
      const bankText = `operación ${said(bank)}${bank.data.amountCents ? `, ${eur(bank.data.amountCents)}` : ''}`;
      if (!intent || bank.data.status !== 'completed')
        return {
          said: 'No se encontró la orden histórica de los datos iniciales.',
          bank: bankText,
          pass: null,
        };
      return {
        said: `orden guardada como \`${intent.status}\`${intent.error ? ` · «${intent.error}»` : ''}`,
        bank: bankText,
        pass: intent.status === 'completed',
      };
    },
  },
  {
    id: 'R10',
    story: 'Marta abre el caso de Lucía: ¿ve la conversación, la orden y la operación del banco?',
    scenario: 'normal (sin mover dinero)',
    contract: 'El operador ve conversación, pasos y efectos.',
    run: async () => {
      await prepare('normal');
      const { http, data } = await app('marta', 'incidents/case-lucia');
      if (http !== 200) return { said: `HTTP ${http}`, bank: '—', pass: null };
      const history = data.history?.length ?? 0,
        intents = data.intents?.length ?? 0,
        operations = data.bank?.operations?.length ?? 0;
      // Informative only: what the app keeps about the last transfer step it recorded.
      const event = await appRow<{ kind: string; data: string }>(
        "SELECT kind,data FROM events WHERE kind LIKE 'transfer.%' ORDER BY created_at DESC LIMIT 1",
      );
      const recorded = event
        ? `último paso registrado (\`${event.kind}\`) guarda: ${Object.keys(JSON.parse(event.data)).join(', ') || 'nada'}`
        : 'sin pasos de transferencia registrados';
      return {
        said: `mensajes: ${history} · órdenes: ${intents} · operaciones del banco: ${operations}`,
        bank: `Informativo: ${recorded}`,
        pass: history > 0 && intents > 0 && operations > 0,
      };
    },
  },
  {
    id: 'R13',
    story:
      'Lucía envía 10 EUR a Bruno, se pierde la respuesta y el banco tampoco deja consultar el estado: ¿evita la aplicación afirmar lo que no sabe y pagar dos veces?',
    scenario: 'read-unavailable',
    contract: 'Un solo cargo, ningún «fallida», y repetir la misma orden no paga de nuevo.',
    run: async () => {
      await prepare('read-unavailable');
      const transfer = toBruno('R13'),
        intentId = `repro-R13-${run}`;
      const first = await send('lucia', transfer, intentId);
      const second = await send('lucia', transfer, intentId);
      const e = await effects(transfer, 'lucia', 'bruno');
      return {
        said: `1.ª respuesta: ${said(first)} · al repetir la misma orden: ${said(second)}`,
        bank: e.text,
        pass: e.debits === 1 && e.credits === 1 && !failed(first) && !failed(second),
      };
    },
  },
  {
    id: 'R14',
    story:
      'Lucía envía 10 EUR a Bruno y el banco rechaza el primer intento sin llegar a ejecutarlo: ¿se completa el pago una sola vez?',
    scenario: 'reject-before',
    contract: 'Un solo cargo y ningún «fallida» sobre un pago hecho.',
    run: async () => {
      await prepare('reject-before');
      return singlePayment('R14');
    },
  },
  {
    id: 'R15',
    story:
      'Con un pago de 10 EUR a Bruno pendiente de verificar, Lucía pide otro idéntico: ¿se le avisa antes de pagar dos veces?',
    scenario: 'read-unavailable',
    contract:
      'La segunda petición no mueve dinero por sí sola y su propuesta lleva una advertencia (D11).',
    run: async () => {
      await prepare('read-unavailable');
      const transfer = toBruno('R15');
      const first = await send('lucia', transfer);
      // A new request without intentId and without confirming: a distinct, identical intent.
      const second = await request('lucia', transfer);
      const e = await effects(transfer, 'lucia', 'bruno');
      const warning = second.data.approval?.warning?.text;
      return {
        said: `1.ª petición: ${said(first)} · 2.ª petición idéntica, sin confirmar: ${said(second)} · advertencia: ${warning ? `«${warning}»` : 'ninguna'}`,
        bank: e.text,
        pass:
          second.data.status === 'requires_confirmation' &&
          typeof warning === 'string' &&
          e.debits === 1 &&
          e.credits === 1,
      };
    },
  },
  {
    id: 'R16',
    story:
      'A Lucía le dicen que su pago de 10 EUR a Bruno está pendiente de verificar y después abre sus cuentas: ¿le confirma la aplicación lo que pasó sin que ella haga nada más?',
    scenario: 'read-unavailable',
    contract:
      'Al abrir las cuentas se comprueba con el banco y se informa del resultado; un solo cargo.',
    run: async () => {
      await prepare('read-unavailable');
      const transfer = toBruno('R16');
      const first = await send('lucia', transfer);
      const opened = (await app('lucia', 'dashboard')).data.transfers?.find(
        (t: any) => t.intentId === first.data.intentId,
      );
      const e = await effects(transfer, 'lucia', 'bruno');
      return {
        said: `al enviar: ${said(first)} · al abrir las cuentas: ${opened ? `\`${opened.status}\` · «${opened.message}»` : 'ninguna noticia de la transferencia'}`,
        bank: e.text,
        pass:
          first.data.status === 'pending_verification' &&
          opened?.status === 'completed' &&
          e.debits === 1 &&
          e.credits === 1,
      };
    },
  },
  {
    id: 'R17',
    story:
      'Lucía envía 10 EUR a Bruno y se pierde la respuesta del banco: si mañana pregunta, ¿queda constancia de cada paso?',
    scenario: 'lost-response',
    contract:
      'Quedan registrados el envío, la consulta y el resultado verificado, con referencia y operación.',
    run: async () => {
      await prepare('lost-response');
      const result = await send('lucia', toBruno('R17'));
      const steps = (
        await appRows<{ kind: string; data: string }>(
          "SELECT kind,data FROM events WHERE json_extract(data,'$.intentId')=? ORDER BY created_at,rowid",
          String(result.data.intentId),
        )
      ).map((e): Record<string, any> => ({ kind: e.kind, ...JSON.parse(e.data) }));
      const find = (kind: string, step?: string) =>
        steps.find((s) => s.kind === kind && (!step || s.step === step));
      const outcome = find('transfer.completed');
      return {
        said: said(result),
        bank: steps.length
          ? `Registro: ${steps.map((s) => `${s.kind.replace('transfer.', '')}${s.step ? ` ${s.step}` : ''}${'bankStatus' in s ? ` (${s.bankStatus ?? 'sin respuesta'})` : ''}`).join(' → ')}`
          : 'Registro: ningún paso asociado a la orden',
        pass:
          find('transfer.bank_answer', 'send')?.bankStatus === 504 &&
          find('transfer.bank_answer', 'lookup')?.bankStatus === 200 &&
          !!outcome?.reference &&
          !!outcome?.operationId,
      };
    },
  },
  {
    id: 'R18',
    story: 'Lucía pulsa confirmar dos veces seguidas en su pago de 10 EUR: ¿paga una sola vez?',
    scenario: 'normal',
    contract: 'Confirmar dos veces a la vez, y una tercera después, produce un solo cargo.',
    run: async () => {
      await prepare('normal');
      const transfer = toBruno('R18');
      const proposal = await proposeOnly('lucia', transfer);
      if (!proposal.id) return noProposal(proposal.reply, transfer);
      const replies = await Promise.all([
        confirmAs('lucia', proposal.id),
        confirmAs('lucia', proposal.id),
      ]);
      replies.push(await confirmAs('lucia', proposal.id));
      const e = await effects(transfer, 'lucia', 'bruno');
      const operations = new Set(replies.map((r) => r.data.operation?.id).filter(Boolean));
      return {
        said: `confirmaciones: ${replies.map(said).join(' / ')} · operaciones distintas: ${operations.size}`,
        bank: e.text,
        pass: e.debits === 1 && e.credits === 1 && operations.size === 1 && !replies.some(failed),
      };
    },
  },
  {
    id: 'R20',
    story: 'Bruno intenta confirmar la propuesta de pago de Lucía: ¿se le impide?',
    scenario: 'normal',
    contract: 'Otra persona recibe 404 y no se mueve dinero; la titular aún puede confirmar.',
    run: async () => {
      await prepare('normal');
      const transfer = toBruno('R20');
      const proposal = await proposeOnly('lucia', transfer);
      if (!proposal.id) return noProposal(proposal.reply, transfer);
      const foreign = await confirmAs('bruno', proposal.id);
      const afterForeign = (await effects(transfer, 'lucia', 'bruno')).debits;
      const own = await confirmAs('lucia', proposal.id);
      const e = await effects(transfer, 'lucia', 'bruno');
      return {
        said: `Bruno: ${said(foreign)} · después Lucía: ${said(own)}`,
        bank: `tras el intento de Bruno: ${afterForeign} cargo(s) · al final: ${e.text}`,
        pass: foreign.http === 404 && afterForeign === 0 && e.debits === 1 && !failed(own),
      };
    },
  },
  {
    id: 'R21',
    story:
      'Alguien altera la confirmación para enviar 9.999 EUR a Diego: ¿se ejecuta solo lo que Lucía revisó?',
    scenario: 'normal',
    contract: 'Se ejecuta exactamente la propuesta: 10,00 EUR a Bruno y nada a nadie más.',
    run: async () => {
      await prepare('normal');
      const transfer = toBruno('R21');
      const proposal = await proposeOnly('lucia', transfer);
      if (!proposal.id) return noProposal(proposal.reply, transfer);
      const before = (await ledger('lucia', 'acc-lucia', transfer.concept)).balance;
      const tampered = { ...transfer, toAccountId: 'acc-diego', amountCents: 999900 };
      const reply = await confirmAs('lucia', proposal.id, {
        ...tampered,
        arguments: tampered,
        payload: tampered,
      });
      const e = await effects(transfer, 'lucia', 'bruno');
      const charged = before - (await ledger('lucia', 'acc-lucia', transfer.concept)).balance;
      const toDiego = (await ledger('diego', 'acc-diego', transfer.concept)).entries.length;
      return {
        said: said(reply),
        bank: `${e.text} · cargado a Lucía: ${eur(charged)} · abonos a Diego: ${toDiego}`,
        pass: e.debits === 1 && e.credits === 1 && charged === 1000 && toDiego === 0,
      };
    },
  },
  {
    id: 'R22',
    story: 'Lucía cancela su propuesta de pago y después llega una confirmación: ¿se envía algo?',
    scenario: 'normal',
    contract: 'Una propuesta cancelada no se puede confirmar: ningún cargo.',
    run: async () => {
      await prepare('normal');
      const transfer = toBruno('R22');
      const proposal = await proposeOnly('lucia', transfer);
      if (!proposal.id) return noProposal(proposal.reply, transfer);
      const cancelled = await app('lucia', `approvals/${proposal.id}/cancel`, {});
      const late = await confirmAs('lucia', proposal.id);
      const e = await effects(transfer, 'lucia', 'bruno');
      return {
        said: `cancelar: ${said(cancelled)} · confirmar después: ${said(late)}`,
        bank: e.text,
        pass:
          cancelled.data.status === 'cancelled' &&
          late.data.status === 'cancelled' &&
          e.debits === 0,
      };
    },
  },
  {
    id: 'R23',
    story:
      'Lucía confirma un pago de 10 EUR que nació en una conversación: ¿queda el resultado escrito en esa conversación?',
    scenario: 'normal',
    contract: 'La conversación recoge el resultado verificado, con la referencia del banco.',
    run: async () => {
      await prepare('normal');
      const transfer = toBruno('R23');
      const conversationId = (await app('lucia', 'conversations', {})).data.id as string;
      const proposal = await app('lucia', 'actions', {
        name: 'transfer_money',
        arguments: transfer,
        conversationId,
      });
      const result = await confirm('lucia', transfer, proposal);
      const messages = ((await app('lucia', `conversations/${conversationId}`)).data.messages ??
        []) as { role: string; content: string }[];
      const reference = String(result.data.reference ?? '');
      const written = messages.find((m) => reference && m.content.includes(reference));
      return {
        said: `${said(result)} · mensajes en la conversación: ${messages.length}`,
        bank: written
          ? `En la conversación: «${written.content}»`
          : 'En la conversación: ningún mensaje con el resultado',
        pass: result.data.status === 'completed' && !!written,
      };
    },
  },
];

const cell = (value: string) => value.replace(/\|/g, '\\|').replace(/\s+/g, ' ');
const git = (...args: string[]) => spawnSync('git', args, { encoding: 'utf8' }).stdout.trim();
const rows: string[] = [];
let met = 0,
  total = 0;
for (const c of cases.filter((c) => !only || only.includes(c.id))) {
  let outcome: Outcome;
  try {
    outcome = await c.run();
  } catch (e) {
    outcome = {
      said: e instanceof Error ? e.message : 'Error desconocido.',
      bank: '—',
      pass: null,
    };
  }
  const verdict =
    outcome.pass === null ? 'NO EVALUABLE' : outcome.pass ? 'CUMPLE' : '**NO CUMPLE**';
  total++;
  if (outcome.pass) met++;
  rows.push(
    `| ${[c.id, c.story, c.scenario, outcome.said, outcome.bank, c.contract, verdict].map(cell).join(' | ')} |`,
  );
  console.error(`${c.id}: ${verdict.replace(/\*/g, '')}`);
}
// Leave the bank as a fresh setup would: seeded ledger, intermittent profile, seed 17.
await admin('reset');

const report = [
  '# Reproducción determinista',
  '',
  `- **Etiqueta:** ${label ?? 'sin etiqueta'}`,
  `- **Fecha:** ${new Date().toISOString()}`,
  `- **Commit:** ${git('rev-parse', '--short', 'HEAD')}${git('status', '--porcelain', '--', '.', ':!submission/03-fixes/evidence') ? ' (con cambios sin confirmar)' : ''}`,
  `- **Node:** ${process.version}`,
  `- **Resultado:** ${met} de ${total} casos cumplen el contrato.`,
  '',
  'Cada caso parte del banco recién restablecido. «Qué dijo la aplicación» es la respuesta que recibe el cliente; «Qué hizo el banco» es lo que el cliente ve después en sus movimientos.',
  '',
  '| ID | Historia del cliente | Escenario | Qué dijo la aplicación | Qué hizo el banco | Contrato | Resultado |',
  '|---|---|---|---|---|---|---|',
  ...rows,
  '',
].join('\n');
console.log(report);
if (label) {
  const file = path.join('submission', '03-fixes', 'evidence', `${label}.md`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, report);
  console.error(`Evidencia guardada en ${file}`);
}
process.exitCode = met === total ? 0 : 1;
