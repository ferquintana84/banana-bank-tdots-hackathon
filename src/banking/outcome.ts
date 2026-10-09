// Decision table for a transfer intent. See submission/03-fixes/01-transfer-integrity.md.
// Only a verified bank fact yields completed or not_executed; anything else stays pending.
export type Reason = 'insufficient_funds' | 'refused' | 'not_sent' | 'not_recorded';
export type Step =
  | { next: 'completed' }
  | { next: 'not_executed'; reason: Reason }
  | { next: 'pending_verification'; anomaly: boolean }
  | { next: 'verify' }
  | { next: 'resend' };
// status is null when no readable answer arrived.
export function afterSend(status: number | null): Step {
  if (status !== null && status >= 200 && status < 300) return { next: 'completed' };
  if (status === 409) return { next: 'pending_verification', anomaly: true };
  if (status === 422) return { next: 'not_executed', reason: 'insufficient_funds' };
  if (status !== null && status >= 400 && status < 500)
    return { next: 'not_executed', reason: 'refused' };
  return { next: 'verify' };
}
// first: right after the first send, when resending the same reference is safe.
// unsettled: the bank may still be processing a send, so an absent operation proves nothing.
// settled: long after the last send, when an absent operation means it never happened.
export type LookupPhase = 'first' | 'unsettled' | 'settled';
export const SETTLE_MS = 30000;
// Measured from the last send, not from intent creation: an old intent can be re-sent.
export function lookupPhase(lastSentAt: string, now = Date.now()): 'unsettled' | 'settled' {
  return now - Date.parse(lastSentAt) > SETTLE_MS ? 'settled' : 'unsettled';
}
export function afterLookup(status: number | null, matches: boolean, phase: LookupPhase): Step {
  if (status === 200)
    return matches ? { next: 'completed' } : { next: 'pending_verification', anomaly: true };
  if (status === 404 && phase === 'first') return { next: 'resend' };
  if (status === 404 && phase === 'settled')
    return { next: 'not_executed', reason: 'not_recorded' };
  return { next: 'pending_verification', anomaly: false };
}
export type Wording =
  | Reason
  | 'completed'
  | 'pending_verification'
  | 'resolved_completed'
  | 'resolved_not_executed'
  | 'identical_pending'
  | 'identical_completed';
export type Details = { amount: string; recipient: string; account: string; reference: string };
export function customerMessage(kind: Wording, d: Details) {
  const transfer = `your transfer of ${d.amount} to ${d.recipient}`;
  switch (kind) {
    case 'completed':
      return `Your transfer of ${d.amount} to ${d.recipient} is complete. The bank has confirmed it. Reference: ${d.reference}.`;
    case 'insufficient_funds':
      return `Your transfer was not made: there is not enough money in ${d.account}. No money has left your account.`;
    case 'refused':
      return 'Your transfer was not made: the bank did not accept these details. No money has left your account.';
    case 'not_sent':
      return 'We could not reach the bank, so your transfer was not sent. No money has left your account. You can try again in a few minutes.';
    case 'pending_verification':
      return `We sent ${transfer}, but the bank has not confirmed it yet, so we cannot tell you whether it went through. Please do not send it again: you could pay twice. We will check with the bank (reference ${d.reference}) when you next open your accounts or ask us. If you need an answer now, ask for a person to review it.`;
    case 'resolved_completed':
      return `We have checked with the bank: ${transfer} was completed, once. Reference: ${d.reference}.`;
    case 'not_recorded':
    case 'resolved_not_executed':
      return `We have checked with the bank: ${transfer} was not made and no money has left your account. If you still want to send it, you can start it again.`;
    case 'identical_pending':
      return `You already have an identical transfer being verified (${d.amount} to ${d.recipient}). We have not sent a second one, so you cannot pay twice.`;
    case 'identical_completed':
      return `We have checked with the bank: your earlier transfer of ${d.amount} to ${d.recipient} was completed, once. Reference: ${d.reference}. We have not sent it again. If you want to make a second, separate payment, ask us again and we will send it.`;
  }
}
