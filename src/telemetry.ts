import { randomUUID } from 'node:crypto';
import { appDb } from './db';
import type { ToolContext } from './types';
// Transfer steps keep what an operator needs to reconstruct a case, and nothing else:
// identifiers, the bank's answer status and the verified outcome. Never payloads or secrets.
const TRANSFER_FIELDS = [
  'intentId',
  'reference',
  'step',
  'bankStatus',
  'status',
  'reason',
  'operationId',
  'approvalId',
] as const;
export function recordEvent(ctx: ToolContext, kind: string, data: Record<string, unknown>) {
  const kept = kind.startsWith('transfer.')
    ? Object.fromEntries(
        TRANSFER_FIELDS.filter((k) => data[k] !== undefined).map((k) => [k, data[k]]),
      )
    : { tool: data.tool, status: data.status };
  appDb()
    .prepare('INSERT INTO events VALUES(?,?,?,?,?,?,?)')
    .run(
      randomUUID(),
      ctx.runId,
      ctx.userId,
      ctx.conversationId,
      kind,
      JSON.stringify(kept),
      new Date().toISOString(),
    );
}
