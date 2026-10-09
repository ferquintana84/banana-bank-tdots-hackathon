import { createHash, randomUUID } from 'node:crypto';
import { z } from 'zod';
import { appDb } from '../db';
import { HttpError } from '../auth';
import { person } from '../people';
import { authorizeTransfer } from './authorization';
import { bankRequest, BankError } from './client';
import { dispatchTransfer, verifyTransfer, type Outcome, type Trace } from './dispatch';
import {
  CANCELLED_MESSAGE,
  customerMessage,
  EXPIRED_MESSAGE,
  lookupPhase,
  proposalMessage,
  SETTLE_MS,
  warningMessage,
  type Wording,
} from './outcome';
import { recordEvent } from '../telemetry';
import type { Account, ActionResult, ToolContext, TransferInput } from '../types';
export const transferSchema = z
  .object({
    fromAccountId: z.string().min(1),
    toAccountId: z.string().min(1),
    amountCents: z.number().int().positive().max(10000000),
    concept: z.string().max(200),
  })
  .strict();
type Intent = {
  id: string;
  user_id: string;
  conversation_id: string | null;
  payload: string;
  status: string;
  bank_reference: string | null;
  operation_id: string | null;
  error: string | null;
  created_at: string;
  last_sent_at: string | null;
};
type Approval = {
  id: string;
  user_id: string;
  intent_id: string;
  payload: string;
  expires_at: string;
  consumed_at: string | null;
};
const APPROVAL_TTL_MS = 10 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
// A check that fails must never do so silently. Error name only: never data or secrets.
const logFailure = (where: string, e: unknown) =>
  console.error(where, e instanceof Error ? e.name : 'unknown');
const money = (cents: number) =>
  new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' }).format(cents / 100);
// Within one customer message, identical details are one intent however often the tool is called.
export function intentKey(args: unknown) {
  const parsed = transferSchema.safeParse(args);
  return createHash('sha256')
    .update(JSON.stringify(parsed.success ? parsed.data : args))
    .digest('hex')
    .slice(0, 24);
}
async function describe(userId: string, input: TransferInput, reference: string) {
  const details = {
    amount: money(input.amountCents),
    recipient: input.toAccountId,
    account: input.fromAccountId,
    reference,
  };
  try {
    const [accounts, contacts] = await Promise.all([
      bankRequest<Account[]>(userId, '/v1/accounts'),
      bankRequest<(Account & { name?: string })[]>(userId, '/v1/contacts'),
    ]);
    const to = contacts.find((c) => c.id === input.toAccountId);
    if (to) details.recipient = `${to.name || to.id} (${to.label})`;
    details.account = accounts.find((a) => a.id === input.fromAccountId)?.label || details.account;
  } catch {}
  return details;
}
const tracer =
  (ctx: ToolContext, intent: Intent): Trace =>
  (step, bankStatus) =>
    recordEvent(ctx, 'transfer.bank_answer', {
      intentId: intent.id,
      reference: intent.bank_reference,
      step,
      bankStatus,
    });
// What the customer did in the app, and what the bank verified, belongs in the conversation
// where the transfer was asked for: otherwise the chat ends at "please confirm".
function noteInConversation(intent: Intent, text: string) {
  if (!intent.conversation_id) return;
  try {
    appDb()
      .prepare('INSERT INTO messages VALUES(?,?,?,?,?,?)')
      .run(randomUUID(), intent.conversation_id, 'assistant', text, new Date().toISOString(), null);
  } catch (e) {
    logFailure('conversation_note_failed', e);
  }
}
// Stores the outcome and builds what the customer is told.
async function settle(
  ctx: ToolContext,
  intent: Intent,
  input: TransferInput,
  outcome: Outcome,
  wording?: Wording,
): Promise<ActionResult> {
  const db = appDb(),
    reference = intent.bank_reference!,
    base = { intentId: intent.id, reference },
    details = await describe(ctx.userId, input, reference);
  if (outcome.state === 'completed') {
    db.prepare('UPDATE intents SET status=?,operation_id=?,error=NULL WHERE id=?').run(
      'completed',
      outcome.operation.id,
      intent.id,
    );
    recordEvent(ctx, 'transfer.completed', {
      status: 'completed',
      intentId: intent.id,
      reference,
      operationId: outcome.operation.id,
    });
    return {
      status: 'completed',
      operation: outcome.operation,
      ...base,
      message: customerMessage(wording ?? 'completed', details),
    };
  }
  if (outcome.state === 'not_executed') {
    db.prepare('UPDATE intents SET status=?,error=? WHERE id=?').run(
      'failed',
      outcome.error,
      intent.id,
    );
    recordEvent(ctx, 'transfer.failed', {
      status: 'failed',
      reason: outcome.reason,
      intentId: intent.id,
      reference,
    });
    return {
      status: 'failed',
      error: outcome.error,
      reason: outcome.reason,
      ...base,
      message: customerMessage(wording ?? outcome.reason, details),
    };
  }
  db.prepare('UPDATE intents SET status=?,error=NULL WHERE id=?').run(
    'pending_verification',
    intent.id,
  );
  recordEvent(ctx, 'transfer.pending', {
    status: 'pending_verification',
    reason: outcome.anomaly ? 'anomaly' : undefined,
    intentId: intent.id,
    reference,
  });
  return {
    status: 'pending_verification',
    needsReview: outcome.anomaly,
    ...base,
    message: customerMessage(wording ?? 'pending_verification', details),
  };
}
// Asks the bank about an intent whose outcome is still unknown. Never sends money.
async function recheck(ctx: ToolContext, intent: Intent, input: TransferInput) {
  // A confirmed intent with no send recorded may be about to be sent: nothing is settled yet.
  const phase = intent.last_sent_at
    ? lookupPhase(intent.last_sent_at)
    : ['confirmed', 'processing'].includes(intent.status)
      ? 'unsettled'
      : lookupPhase(intent.created_at);
  let outcome: Outcome = { state: 'pending_verification', anomaly: false };
  try {
    const verified = await verifyTransfer(
      ctx.userId,
      input,
      intent.bank_reference!,
      phase,
      tracer(ctx, intent),
    );
    if (verified !== 'resend') outcome = verified;
  } catch (e) {
    logFailure('transfer_recheck_failed', e);
  }
  const wording: Wording =
    outcome.state === 'completed'
      ? 'resolved_completed'
      : outcome.state === 'not_executed'
        ? 'resolved_not_executed'
        : 'pending_verification';
  const result = await settle(ctx, intent, input, outcome, wording);
  // A conversation must never end on "pending": the resolution is written where it was asked.
  if (outcome.state !== 'pending_verification') noteInConversation(intent, String(result.message));
  return result;
}
// What an older build left without a verified outcome.
const LEGACY_TRANSPORT_ERROR = 'No response received from the bank.';
// Reconciliation on read: asks the bank about this customer's unverified intents.
// Never sends money.
export async function reconcileIntents(userId: string, reference?: string) {
  const rows = appDb()
    .prepare(
      `SELECT * FROM intents WHERE user_id=?1 AND bank_reference IS NOT NULL
         AND (?2 IS NULL OR bank_reference=?2)
         AND (status='pending_verification'
           OR (status IN ('processing','confirmed') AND COALESCE(last_sent_at,created_at)<?3)
           OR (status='failed' AND operation_id IS NULL AND error=?4))
       ORDER BY created_at LIMIT 5`,
    )
    .all({
      1: userId,
      2: reference ?? null,
      3: new Date(Date.now() - SETTLE_MS).toISOString(),
      4: LEGACY_TRANSPORT_ERROR,
    }) as Intent[];
  const results: ActionResult[] = [];
  for (const intent of rows) {
    const ctx = {
      userId,
      conversationId: intent.conversation_id,
      runId: randomUUID(),
      intentId: intent.id,
    };
    try {
      results.push(await recheck(ctx, intent, JSON.parse(intent.payload)));
    } catch (e) {
      logFailure('reconcile_intent_failed', e);
    }
  }
  return results.map(({ intentId, status, message, reference }) => ({
    intentId,
    status,
    message,
    reference,
  }));
}
// For callers that must not break when a check fails: the customer is shielded, the failure is logged.
export const reconcileSafely = (userId: string, reference?: string) =>
  reconcileIntents(userId, reference).catch((e) => {
    logFailure('reconcile_failed', e);
    // null, not an empty list: "the check failed" is not "nothing to report".
    return null;
  });
// Verified status of the transfers already requested in a conversation, for the agent's context.
export function conversationTransfers(userId: string, conversationId: string) {
  const label: Record<string, string> = {
    completed: 'completed, confirmed by the bank',
    failed: 'not executed, no money moved',
    pending_verification: 'pending verification, outcome unknown',
    proposed: 'proposed, waiting for the customer to press Confirm transfer, nothing sent',
    expired: 'proposal expired without confirmation, nothing sent',
    cancelled: 'cancelled by the customer, nothing sent',
    confirmed: 'confirmed by the customer, being sent',
    processing: 'confirmed by the customer, being sent',
  };
  const live = appDb().prepare(
    'SELECT 1 FROM approvals WHERE intent_id=? AND consumed_at IS NULL AND expires_at>?',
  );
  const rows = appDb()
    .prepare(
      'SELECT * FROM intents WHERE user_id=? AND conversation_id=? ORDER BY created_at DESC LIMIT 5',
    )
    .all(userId, conversationId) as Intent[];
  return rows.map((intent) => {
    const input = JSON.parse(intent.payload) as TransferInput;
    // A proposal nobody confirmed in time is no longer waiting for anything.
    const status =
      intent.status === 'proposed' && !live.get(intent.id, new Date().toISOString())
        ? 'expired'
        : intent.status;
    return `- ${label[status] || 'in progress'}: ${money(input.amountCents)} from ${input.fromAccountId} to ${input.toAccountId}, description ${JSON.stringify(input.concept)}, reference ${intent.bank_reference}`;
  });
}
// An identical transfer of this customer that is unverified or was completed recently (D11).
// Computed when the proposal is shown, so it reflects the state at decision time.
export function identicalWarning(userId: string, payload: string, intentId: string) {
  const other = appDb()
    .prepare(
      `SELECT status,bank_reference,COALESCE(last_sent_at,created_at) AS at FROM intents
       WHERE user_id=? AND payload=? AND id<>?
         AND (status='pending_verification'
           OR (status='completed' AND COALESCE(last_sent_at,created_at)>?))
       ORDER BY status='pending_verification' DESC, at DESC LIMIT 1`,
    )
    .get(userId, payload, intentId, new Date(Date.now() - DAY_MS).toISOString()) as
    { status: string; bank_reference: string; at: string } | undefined;
  if (!other) return null;
  const kind = other.status === 'completed' ? ('completed' as const) : ('pending' as const);
  return {
    kind,
    reference: other.bank_reference,
    at: other.at,
    text: warningMessage(kind, other.bank_reference),
  };
}
async function propose(ctx: ToolContext, intent: Intent, input: TransferInput) {
  const db = appDb(),
    now = Date.now();
  // One live proposal per intent: asking again returns the same one.
  let approval = db
    .prepare(
      'SELECT * FROM approvals WHERE intent_id=? AND consumed_at IS NULL AND expires_at>? ORDER BY expires_at DESC LIMIT 1',
    )
    .get(intent.id, new Date(now).toISOString()) as Approval | undefined;
  if (!approval) {
    const created: Approval = {
      id: randomUUID(),
      user_id: ctx.userId,
      intent_id: intent.id,
      payload: intent.payload,
      expires_at: new Date(now + APPROVAL_TTL_MS).toISOString(),
      consumed_at: null,
    };
    db.transaction(() => {
      db.prepare('INSERT INTO approvals VALUES(?,?,?,?,?,?)').run(
        created.id,
        created.user_id,
        created.intent_id,
        created.payload,
        created.expires_at,
        null,
      );
      db.prepare('UPDATE intents SET status=?,error=NULL WHERE id=?').run('proposed', intent.id);
    })();
    approval = created;
    recordEvent(ctx, 'transfer.proposed', {
      status: 'proposed',
      intentId: intent.id,
      reference: intent.bank_reference,
      approvalId: created.id,
    });
  }
  const details = await describe(ctx.userId, input, intent.bank_reference!);
  const minutes = Math.max(1, Math.ceil((Date.parse(approval.expires_at) - now) / 60000));
  return {
    status: 'requires_confirmation',
    intentId: intent.id,
    approval: {
      id: approval.id,
      expiresAt: approval.expires_at,
      payload: input,
      summary: {
        amount: details.amount,
        account: details.account,
        recipient: details.recipient,
        concept: input.concept,
      },
      warning: identicalWarning(ctx.userId, intent.payload, intent.id),
    },
    message: proposalMessage(details, minutes),
  };
}
// The verified result of an intent that already completed. Never sends anything.
async function completedResult(ctx: ToolContext, intent: Intent, input: TransferInput) {
  const reference = intent.bank_reference!;
  const found = await verifyTransfer(
    ctx.userId,
    input,
    reference,
    'unsettled',
    tracer(ctx, intent),
  ).catch(() => null);
  return {
    status: 'completed',
    operation:
      found && found !== 'resend' && found.state === 'completed'
        ? found.operation
        : {
            id: intent.operation_id,
            userId: ctx.userId,
            reference,
            ...input,
            status: 'completed',
          },
    intentId: intent.id,
    reference,
    message: customerMessage('completed', await describe(ctx.userId, input, reference)),
  };
}
// From here on Fix 1 applies: one reference, verify before stating, pending when in doubt.
// Only a confirmed proposal reaches this point.
async function execute(ctx: ToolContext, intent: Intent, input: TransferInput) {
  const db = appDb();
  try {
    const permission = await authorizeTransfer(ctx, input);
    if (permission) return permission;
  } catch (e) {
    // Nothing has left the application yet: both cases are a verified "not executed".
    if (e instanceof BankError && e.status >= 500)
      return settle(ctx, intent, input, {
        state: 'not_executed',
        reason: 'not_sent',
        error: 'The bank could not be reached before sending.',
      });
    if (e instanceof HttpError)
      return settle(ctx, intent, input, {
        state: 'not_executed',
        reason: 'refused',
        error: e.message,
      });
    throw e;
  }
  db.prepare('UPDATE intents SET status=? WHERE id=?').run('processing', intent.id);
  recordEvent(ctx, 'transfer.started', {
    status: 'processing',
    intentId: intent.id,
    reference: intent.bank_reference,
  });
  let outcome: Outcome;
  try {
    outcome = await dispatchTransfer(
      ctx.userId,
      input,
      intent.bank_reference!,
      () =>
        db
          .prepare('UPDATE intents SET last_sent_at=? WHERE id=?')
          .run(new Date().toISOString(), intent.id),
      tracer(ctx, intent),
    );
  } catch (e) {
    logFailure('transfer_dispatch_failed', e);
    // Once sent, an unexpected error proves nothing about the bank.
    outcome = { state: 'pending_verification', anomaly: false };
  }
  return settle(ctx, intent, input, outcome);
}
// Asking for a transfer only ever creates a proposal: the model proposes, the person decides.
export async function transferMoney(ctx: ToolContext, args: unknown): Promise<ActionResult> {
  if (person(ctx.userId)?.role !== 'customer')
    throw new HttpError(403, 'A customer account is required.');
  const input = transferSchema.parse(args),
    db = appDb(),
    payload = JSON.stringify(input);
  const byId = db.prepare('SELECT * FROM intents WHERE id=?');
  const previous = byId.get(ctx.intentId) as Intent | undefined;
  if (previous && (previous.user_id !== ctx.userId || previous.payload !== payload))
    throw new HttpError(409, 'This intent belongs to a different payload.');
  // Same intent again: a verified or in-flight one reports its state and never proposes anew.
  if (previous?.status === 'completed' && previous.operation_id)
    return completedResult(ctx, previous, input);
  if (previous && ['pending_verification', 'confirmed', 'processing'].includes(previous.status))
    return recheck(ctx, previous, input);
  if (!previous) {
    // D11: an identical unverified transfer is reconciled first, so the warning is accurate.
    const pending = db
      .prepare(
        "SELECT * FROM intents WHERE user_id=? AND payload=? AND status='pending_verification' ORDER BY created_at LIMIT 1",
      )
      .get(ctx.userId, payload) as Intent | undefined;
    if (pending) await recheck(ctx, pending, input);
    db.prepare(
      'INSERT OR IGNORE INTO intents(id,user_id,conversation_id,run_id,payload,status,bank_reference,created_at) VALUES(?,?,?,?,?,?,?,?)',
    ).run(
      ctx.intentId,
      ctx.userId,
      ctx.conversationId,
      ctx.runId,
      payload,
      'proposed',
      randomUUID(),
      new Date().toISOString(),
    );
  }
  let intent = byId.get(ctx.intentId) as Intent;
  if (!intent.bank_reference) {
    db.prepare('UPDATE intents SET bank_reference=? WHERE id=?').run(randomUUID(), intent.id);
    intent = byId.get(ctx.intentId) as Intent;
  }
  try {
    const permission = await authorizeTransfer(ctx, input);
    if (permission) return permission;
  } catch (e) {
    // The bank could not be reached, so ownership is unverified: nothing is proposed or sent.
    if (e instanceof BankError && e.status >= 500)
      return settle(ctx, intent, input, {
        state: 'not_executed',
        reason: 'not_sent',
        error: 'The bank could not be reached before sending.',
      });
    throw e;
  }
  return propose(ctx, intent, input);
}
export async function confirmTransfer(userId: string, approvalId: string): Promise<ActionResult> {
  if (person(userId)?.role !== 'customer')
    throw new HttpError(403, 'A customer account is required.');
  const db = appDb();
  const approval = db
    .prepare('SELECT * FROM approvals WHERE id=? AND user_id=?')
    .get(approvalId, userId) as Approval | undefined;
  if (!approval) throw new HttpError(404, 'Proposal not found.');
  const byId = db.prepare('SELECT * FROM intents WHERE id=? AND user_id=?');
  let intent = byId.get(approval.intent_id, userId) as Intent | undefined;
  if (!intent) throw new HttpError(404, 'Intent not found.');
  // What is executed is exactly what was reviewed: the stored proposal, never the request.
  if (intent.payload !== approval.payload)
    throw new HttpError(409, 'This proposal no longer matches its transfer.');
  const input = transferSchema.parse(JSON.parse(approval.payload));
  const ctx = {
    userId,
    conversationId: intent.conversation_id,
    runId: randomUUID(),
    intentId: intent.id,
    approvalId: approval.id,
  };
  const now = new Date().toISOString();
  // Single use: of two simultaneous confirmations only one consumes the proposal.
  const won = db.transaction(() => {
    const used =
      db
        .prepare(
          'UPDATE approvals SET consumed_at=? WHERE id=? AND consumed_at IS NULL AND expires_at>?',
        )
        .run(now, approval.id, now).changes === 1;
    if (used)
      db.prepare('UPDATE intents SET status=? WHERE id=?').run('confirmed', approval.intent_id);
    return used;
  })();
  if (won) {
    recordEvent(ctx, 'transfer.confirmed', {
      status: 'confirmed',
      intentId: intent.id,
      reference: intent.bank_reference,
      approvalId: approval.id,
    });
    const result = await execute(ctx, intent, input);
    noteInConversation(
      intent,
      `You confirmed this transfer in the app. ${String(result.message ?? '')}`.trim(),
    );
    return result;
  }
  intent = byId.get(approval.intent_id, userId) as Intent;
  const used = !!(
    db.prepare('SELECT consumed_at FROM approvals WHERE id=?').get(approval.id) as Approval
  ).consumed_at;
  const base = { intentId: intent.id };
  if (intent.status === 'cancelled')
    return { status: 'cancelled', ...base, message: CANCELLED_MESSAGE };
  if (!used) return { status: 'expired', ...base, message: EXPIRED_MESSAGE };
  // Already confirmed: report the outcome of that same intent. Never a second payment.
  if (intent.status === 'completed' && intent.operation_id)
    return completedResult(ctx, intent, input);
  if (intent.status === 'pending_verification') return recheck(ctx, intent, input);
  if (intent.status === 'failed')
    return {
      status: 'failed',
      error: intent.error,
      ...base,
      reference: intent.bank_reference,
      message: customerMessage(
        'resolved_not_executed',
        await describe(userId, input, intent.bank_reference!),
      ),
    };
  // Still being sent by the first confirmation: the same reference makes it the same payment.
  if (['confirmed', 'processing'].includes(intent.status)) return execute(ctx, intent, input);
  // A used proposal whose transfer has since been proposed again authorizes nothing.
  return { status: 'expired', ...base, message: EXPIRED_MESSAGE };
}
export function cancelTransfer(userId: string, approvalId: string): ActionResult {
  if (person(userId)?.role !== 'customer')
    throw new HttpError(403, 'A customer account is required.');
  const db = appDb();
  const approval = db
    .prepare('SELECT * FROM approvals WHERE id=? AND user_id=?')
    .get(approvalId, userId) as Approval | undefined;
  if (!approval) throw new HttpError(404, 'Proposal not found.');
  // Cancelling and confirming compete for the same single use: only one can win.
  const cancelled = db.transaction(() => {
    const used =
      db
        .prepare('UPDATE approvals SET consumed_at=? WHERE id=? AND consumed_at IS NULL')
        .run(new Date().toISOString(), approval.id).changes === 1;
    if (used)
      db.prepare("UPDATE intents SET status='cancelled' WHERE id=? AND status='proposed'").run(
        approval.intent_id,
      );
    return used;
  })();
  const intent = db.prepare('SELECT * FROM intents WHERE id=?').get(approval.intent_id) as Intent;
  if (cancelled) {
    recordEvent(
      { userId, conversationId: intent.conversation_id, runId: randomUUID(), intentId: intent.id },
      'transfer.cancelled',
      { status: 'cancelled', intentId: intent.id, reference: intent.bank_reference, approvalId },
    );
    noteInConversation(intent, CANCELLED_MESSAGE);
  }
  if (cancelled || intent.status === 'cancelled')
    return { status: 'cancelled', intentId: intent.id, message: CANCELLED_MESSAGE };
  throw new HttpError(409, 'This transfer was already confirmed and cannot be cancelled.');
}
