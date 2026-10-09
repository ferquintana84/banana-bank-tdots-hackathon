import test from 'node:test';
import assert from 'node:assert/strict';
import {
  afterLookup,
  afterSend,
  customerMessage,
  lookupPhase,
  type Wording,
} from '../src/banking/outcome';
// One row per line of the state table in submission/03-fixes/01-transfer-integrity.md.
test('a send answer settles only on a verified bank fact', () => {
  assert.deepEqual(afterSend(200), { next: 'completed' });
  assert.deepEqual(afterSend(422), { next: 'not_executed', reason: 'insufficient_funds' });
  for (const status of [400, 401, 403])
    assert.deepEqual(afterSend(status), { next: 'not_executed', reason: 'refused' });
  assert.deepEqual(afterSend(409), { next: 'pending_verification', anomaly: true });
  for (const status of [500, 502, 503, 504, null])
    assert.deepEqual(afterSend(status), { next: 'verify' });
});
test('a lookup confirms, allows one resend, or leaves the intent pending', () => {
  for (const phase of ['first', 'unsettled', 'settled'] as const) {
    assert.deepEqual(afterLookup(200, true, phase), { next: 'completed' });
    assert.deepEqual(afterLookup(200, false, phase), {
      next: 'pending_verification',
      anomaly: true,
    });
    for (const status of [500, 503, 504, null])
      assert.deepEqual(afterLookup(status, false, phase), {
        next: 'pending_verification',
        anomaly: false,
      });
  }
  assert.deepEqual(afterLookup(404, false, 'first'), { next: 'resend' });
  assert.deepEqual(afterLookup(404, false, 'unsettled'), {
    next: 'pending_verification',
    anomaly: false,
  });
  assert.deepEqual(afterLookup(404, false, 'settled'), {
    next: 'not_executed',
    reason: 'not_recorded',
  });
});
test('uncertainty never produces a failure or a completion', () => {
  const uncertain = [
    ...[500, 503, 504, null].map((s) => afterSend(s)),
    ...[500, 503, 504, null].map((s) => afterLookup(s, false, 'settled')),
  ];
  for (const step of uncertain) assert.ok(!['completed', 'not_executed'].includes(step.next));
});
test('the settle window runs from the last send, not from intent creation', () => {
  const now = Date.parse('2026-09-24T12:00:00.000Z');
  // An intent created an hour ago and re-sent five seconds ago is still unsettled:
  // an absent operation must leave it pending, not mark it as not executed.
  const lastSentAt = new Date(now - 5000).toISOString();
  assert.equal(lookupPhase(lastSentAt, now), 'unsettled');
  assert.deepEqual(afterLookup(404, false, lookupPhase(lastSentAt, now)), {
    next: 'pending_verification',
    anomaly: false,
  });
  const longAgo = new Date(now - 3600000).toISOString();
  assert.equal(lookupPhase(longAgo, now), 'settled');
  assert.deepEqual(afterLookup(404, false, lookupPhase(longAgo, now)), {
    next: 'not_executed',
    reason: 'not_recorded',
  });
  assert.equal(lookupPhase('not a date', now), 'unsettled');
});
test('customer wording never says failed, and pending says not to repeat the payment', () => {
  const details = {
    amount: '€10.00',
    recipient: 'Bruno Vidal',
    account: 'Aurora account',
    reference: 'ref-1',
  };
  const kinds: Wording[] = [
    'completed',
    'insufficient_funds',
    'refused',
    'not_sent',
    'not_recorded',
    'pending_verification',
    'resolved_completed',
    'resolved_not_executed',
    'identical_pending',
    'identical_completed',
  ];
  for (const kind of kinds) assert.doesNotMatch(customerMessage(kind, details), /fail/i);
  const pending = customerMessage('pending_verification', details);
  assert.match(pending, /do not send it again/);
  assert.match(pending, /ref-1/);
});
