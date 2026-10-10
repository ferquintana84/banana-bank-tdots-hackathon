import { z } from 'zod';
import type { FunctionTool, ResponseInputItem } from 'openai/resources/responses/responses';
import { toResponseInputItems } from 'openai/lib/responses/ResponseInputItems';
import { openai } from '../src/retrieval/embeddings';
import { config } from '../src/config';

// Experiment for Part 2 (D13): does the configured model accept tools and a strict JSON
// schema in the same request, call the tool first, and then answer in that schema?
// It talks only to the model, with the same request options as src/agent/run.ts:
// no bank, no database. It never prints the key.
const source = {
  type: 'object',
  properties: {
    kind: { type: 'string', enum: ['document', 'account', 'movement'] },
    id: { type: 'string' },
  },
  required: ['kind', 'id'],
  additionalProperties: false,
};
const schema = {
  type: 'object',
  properties: {
    answer: { type: 'string' },
    verified: {
      type: 'array',
      items: {
        type: 'object',
        properties: { claim: { type: 'string' }, sources: { type: 'array', items: source } },
        required: ['claim', 'sources'],
        additionalProperties: false,
      },
    },
    notVerified: {
      type: 'array',
      items: {
        type: 'object',
        properties: { claim: { type: 'string' }, reason: { type: 'string' } },
        required: ['claim', 'reason'],
        additionalProperties: false,
      },
    },
    nextStep: { type: ['string', 'null'] },
  },
  required: ['answer', 'verified', 'notVerified', 'nextStep'],
  additionalProperties: false,
};
const Evidence = z
  .object({
    answer: z.string(),
    verified: z.array(
      z.object({
        claim: z.string(),
        sources: z.array(
          z.object({ kind: z.enum(['document', 'account', 'movement']), id: z.string() }),
        ),
      }),
    ),
    notVerified: z.array(z.object({ claim: z.string(), reason: z.string() })),
    nextStep: z.string().nullable(),
  })
  .strict();
const tools: FunctionTool[] = [
  {
    type: 'function',
    name: 'list_movements',
    description: "Get the current customer's recent account movements.",
    parameters: { type: 'object', properties: {}, required: [], additionalProperties: false },
    strict: true,
  },
];
// Fixed inputs taken from the seed data, so the result does not depend on the bank.
const movements = [
  {
    id: 'movement-lucia-0',
    accountId: 'acc-lucia',
    amountCents: 175000,
    description: 'September salary',
    createdAt: '2026-09-02T10:00:00.000Z',
  },
  {
    id: 'movement-lucia-1',
    accountId: 'acc-lucia',
    amountCents: -1175,
    description: 'Groceries',
    createdAt: '2026-09-05T10:00:00.000Z',
  },
];
const instructions = `You are the assistant for Banana Bank, a simulated bank. Document reference date: 2026-09-24. The customer holds one Aurora account (acc-lucia).
Use only the documentation below and tool results. Call list_movements before answering a question about the customer's own situation. Put a claim under "verified" only with the source that supports it; put what cannot be checked under "notVerified" with the reason; never fill a gap with an estimate.
DOCUMENTATION:
{"documentId":"aurora-fees-2026","version":2,"validFrom":"2026-09-01","text":"The Aurora account monthly fee is EUR 6. It is fully waived (EUR 0) only when BOTH requirements are met in the same month: a salary payment of at least EUR 1,200 and three settled card purchases."}`;

async function attempt() {
  const started = Date.now();
  const seconds = () => (Date.now() - started) / 1000;
  const input: ResponseInputItem[] = [
    { role: 'user', content: 'Will I pay the Aurora account fee this month?' },
  ];
  let toolCalls = 0,
    tokens = 0;
  for (let round = 0; round < 4; round++) {
    const response = await openai().responses.create({
      model: config.chatModel,
      instructions,
      input,
      tools,
      parallel_tool_calls: false,
      reasoning: { effort: 'low' },
      max_output_tokens: 2000,
      store: false,
      include: ['reasoning.encrypted_content'],
      text: { format: { type: 'json_schema', name: 'evidence_answer', schema, strict: true } },
    });
    tokens += response.usage?.total_tokens ?? 0;
    input.push(...toResponseInputItems(response.output));
    const calls = response.output.filter((x) => x.type === 'function_call');
    if (!calls.length) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(response.output_text);
      } catch {
        return {
          toolCalls,
          tokens,
          seconds: seconds(),
          valid: false as const,
          note: 'the final answer is not JSON',
        };
      }
      const evidence = Evidence.safeParse(parsed);
      if (!evidence.success)
        return {
          toolCalls,
          tokens,
          seconds: seconds(),
          valid: false as const,
          note: 'the final answer does not match the schema',
        };
      const cited = evidence.data.verified.flatMap((v) => v.sources.map((s) => s.id));
      return {
        toolCalls,
        tokens,
        seconds: seconds(),
        valid: true as const,
        citesDocument: cited.includes('aurora-fees-2026'),
        citesMovement: cited.includes('movement-lucia-0'),
        notVerified: evidence.data.notVerified.length,
        nextStep: !!evidence.data.nextStep,
        evidence: evidence.data,
      };
    }
    for (const call of calls) {
      toolCalls++;
      input.push({
        type: 'function_call_output',
        call_id: call.call_id,
        output: JSON.stringify({ movements }),
      });
    }
  }
  return {
    toolCalls,
    tokens,
    seconds: seconds(),
    valid: false as const,
    note: 'no final answer after 4 rounds',
  };
}

const yes = (value: unknown) => (value ? 'sí' : 'no');
try {
  const results = [];
  for (let i = 0; i < 3; i++) results.push(await attempt());
  console.log('# Experimento: respuesta estructurada con herramientas\n');
  console.log(`- **Fecha:** ${new Date().toISOString()}`);
  console.log(`- **Modelo configurado:** ${config.chatModel}`);
  console.log(
    '- **Pregunta:** «Will I pay the Aurora account fee this month?», con una fuente y una herramienta fijas.',
  );
  console.log('- **Script:** `scripts/experiment-structured-answer.ts`\n');
  console.log(
    '| Intento | Llamó a la herramienta | Respuesta válida según la estructura | Cita el documento | Cita el movimiento | No verificadas | Siguiente paso | Tokens | Segundos |',
  );
  console.log('|---|---|---|---|---|---|---|---|---|');
  results.forEach((r, i) =>
    console.log(
      `| ${i + 1} | ${yes(r.toolCalls > 0)} (${r.toolCalls}) | ${r.valid ? 'sí' : `no: ${r.note}`} | ${r.valid ? yes(r.citesDocument) : '—'} | ${r.valid ? yes(r.citesMovement) : '—'} | ${r.valid ? r.notVerified : '—'} | ${r.valid ? yes(r.nextStep) : '—'} | ${r.tokens} | ${r.seconds.toFixed(1)} |`,
    ),
  );
  const sample = results.find((r) => r.valid);
  if (sample?.valid)
    console.log(
      `\n**Ejemplo de respuesta (intento válido):**\n\n\`\`\`json\n${JSON.stringify(sample.evidence, null, 2)}\n\`\`\``,
    );
  process.exitCode = results.every((r) => r.valid && r.toolCalls > 0) ? 0 : 1;
} catch (e) {
  // The provider's status and message say whether the combination is unsupported.
  const error = e as { status?: number; message?: string };
  console.log(
    `# Experimento: respuesta estructurada con herramientas\n\n**La petición falló:** estado ${error.status ?? 'desconocido'}. ${error.message ?? ''}`,
  );
  process.exitCode = 1;
}
