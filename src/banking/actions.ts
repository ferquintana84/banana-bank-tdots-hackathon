import { createHash, randomUUID } from 'node:crypto';
import { z } from 'zod';
import { appDb } from '../db';
import { HttpError } from '../auth';
import { person } from '../people';
import { authorizeTransfer } from './authorization';
import { bankRequest, BankError } from './client';
import { dispatchTransfer, verifyTransfer, type Outcome } from './dispatch';
import { customerMessage, lookupPhase, type Wording } from './outcome';
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
  payload: string;
  status: string;
  bank_reference: string | null;
  operation_id: string | null;
  created_at: string;
  last_sent_at: string | null;
};
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
      operation: outcome.operation,
      intentId: intent.id,
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
      error: outcome.error,
      intentId: intent.id,
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
  recordEvent(ctx, 'transfer.pending', { status: 'pending_verification', intentId: intent.id });
  return {
    status: 'pending_verification',
    needsReview: outcome.anomaly,
    ...base,
    message: customerMessage(wording ?? 'pending_verification', details),
  };
}
// Asks the bank about an intent whose outcome is still unknown. Never sends money.
async function recheck(ctx: ToolContext, intent: Intent, input: TransferInput, identical = false) {
  let outcome: Outcome = { state: 'pending_verification', anomaly: false };
  try {
    const verified = await verifyTransfer(
      ctx.userId,
      input,
      intent.bank_reference!,
      lookupPhase(intent.last_sent_at ?? intent.created_at),
    );
    if (verified !== 'resend') outcome = verified;
  } catch {}
  const wording: Wording =
    outcome.state === 'completed'
      ? identical
        ? 'identical_completed'
        : 'resolved_completed'
      : outcome.state === 'not_executed'
        ? 'resolved_not_executed'
        : identical
          ? 'identical_pending'
          : 'pending_verification';
  return settle(ctx, intent, input, outcome, wording);
}
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
  // Same intent again: a completed one returns its verified result, a pending one is rechecked.
  if (previous?.status === 'completed' && previous.operation_id) {
    const reference = previous.bank_reference!;
    const found = await verifyTransfer(ctx.userId, input, reference, 'unsettled').catch(() => null);
    return {
      status: 'completed',
      operation:
        found && found !== 'resend' && found.state === 'completed'
          ? found.operation
          : {
              id: previous.operation_id,
              userId: ctx.userId,
              reference,
              ...input,
              status: 'completed',
            },
      intentId: previous.id,
      reference,
      message: customerMessage('completed', await describe(ctx.userId, input, reference)),
    };
  }
  if (previous?.status === 'pending_verification') return recheck(ctx, previous, input);
  if (!previous) {
    // D8: an identical request while one is unverified is reconciled first, never sent blindly.
    const pending = db
      .prepare(
        "SELECT * FROM intents WHERE user_id=? AND payload=? AND status='pending_verification' ORDER BY created_at LIMIT 1",
      )
      .get(ctx.userId, payload) as Intent | undefined;
    if (pending) {
      const result = await recheck(ctx, pending, input, true);
      if (result.status !== 'failed') return result;
    }
    db.prepare(
      'INSERT OR IGNORE INTO intents(id,user_id,conversation_id,run_id,payload,status,bank_reference,created_at) VALUES(?,?,?,?,?,?,?,?)',
    ).run(
      ctx.intentId,
      ctx.userId,
      ctx.conversationId,
      ctx.runId,
      payload,
      'created',
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
    // The bank could not be reached before sending: nothing left the application.
    if (e instanceof BankError && e.status >= 500)
      return settle(ctx, intent, input, {
        state: 'not_executed',
        reason: 'not_sent',
        error: e.message,
      });
    throw e;
  }
  db.prepare('UPDATE intents SET status=? WHERE id=?').run('processing', intent.id);
  recordEvent(ctx, 'transfer.started', { status: 'processing', input, intentId: intent.id });
  let outcome: Outcome;
  try {
    outcome = await dispatchTransfer(ctx.userId, input, intent.bank_reference!, () =>
      db
        .prepare('UPDATE intents SET last_sent_at=? WHERE id=?')
        .run(new Date().toISOString(), intent.id),
    );
  } catch {
    // Once sent, an unexpected error proves nothing about the bank.
    outcome = { state: 'pending_verification', anomaly: false };
  }
  return settle(ctx, intent, input, outcome);
}
