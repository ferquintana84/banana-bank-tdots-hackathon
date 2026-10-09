import { bankRequest, BankError } from './client';
import { afterLookup, afterSend, type LookupPhase, type Reason } from './outcome';
import type { Operation, TransferInput } from '../types';
export type Outcome =
  | { state: 'completed'; operation: Operation }
  | { state: 'not_executed'; reason: Reason; error: string }
  | { state: 'pending_verification'; anomaly: boolean };
// Reports each bank answer as it happens. null means no answer arrived at all.
export type Trace = (step: 'send' | 'lookup', bankStatus: number | null) => void;
type Answer = { status: number; received: boolean; operation?: Operation; error?: string };
async function ask(userId: string, path: string, method = 'GET', body?: unknown): Promise<Answer> {
  try {
    return {
      status: 200,
      received: true,
      operation: await bankRequest<Operation>(userId, path, method, body),
    };
  } catch (e) {
    if (!(e instanceof BankError)) throw e;
    return { status: e.status, received: !e.noResponse, error: e.message };
  }
}
const same = (op: Operation, input: TransferInput) =>
  op.fromAccountId === input.fromAccountId &&
  op.toAccountId === input.toAccountId &&
  op.amountCents === input.amountCents &&
  op.concept === input.concept;
// Read-only: asks the bank what it recorded under this reference. Never moves money.
export async function verifyTransfer(
  userId: string,
  input: TransferInput,
  reference: string,
  phase: LookupPhase,
  trace?: Trace,
): Promise<Outcome | 'resend'> {
  const found = await ask(userId, `/v1/operations/${encodeURIComponent(reference)}`);
  trace?.('lookup', found.received ? found.status : null);
  const step = afterLookup(found.status, !!found.operation && same(found.operation, input), phase);
  if (step.next === 'completed') return { state: 'completed', operation: found.operation! };
  if (step.next === 'not_executed')
    return {
      state: 'not_executed',
      reason: step.reason,
      error: 'The bank has no record of this operation.',
    };
  if (step.next === 'resend') return 'resend';
  return { state: 'pending_verification', anomaly: 'anomaly' in step && step.anomaly };
}
// One reference per intent, for life: the bank's idempotency key makes a resend harmless.
export async function dispatchTransfer(
  userId: string,
  input: TransferInput,
  reference: string,
  beforeSend: () => void,
  trace: Trace,
): Promise<Outcome> {
  for (let phase: LookupPhase = 'first'; ; phase = 'unsettled') {
    beforeSend();
    const sent = await ask(userId, '/v1/transfers', 'POST', { ...input, reference });
    trace('send', sent.received ? sent.status : null);
    const step = afterSend(sent.status);
    if (step.next === 'completed') return { state: 'completed', operation: sent.operation! };
    if (step.next === 'not_executed')
      return {
        state: 'not_executed',
        reason: step.reason,
        error: sent.error || 'Bank service error.',
      };
    if (step.next === 'pending_verification')
      return { state: 'pending_verification', anomaly: step.anomaly };
    const verified = await verifyTransfer(userId, input, reference, phase, trace);
    if (verified !== 'resend') return verified;
  }
}
