import test from 'node:test';
import assert from 'node:assert/strict';
import {
  amountsIn,
  answerText,
  collectAmounts,
  newFacts,
  validateEvidence,
  type RawEvidence,
} from '../src/agent/evidence';
// The facts of one turn: one document in force, one archived, the customer's account and salary.
function turn() {
  const facts = newFacts();
  facts.documents.set('aurora-fees-2026', {
    documentId: 'aurora-fees-2026',
    title: 'Aurora · current fees',
    version: 2,
    validFrom: '2026-09-01',
    validTo: null,
    text: 'The Aurora account monthly fee is EUR 6. It is fully waived (EUR 0) with a salary payment of at least EUR 1,200 and three settled card purchases.',
  });
  facts.documents.set('archive-aurora-1', {
    documentId: 'archive-aurora-1',
    title: 'Aurora · archived conditions 1',
    version: 1,
    validFrom: '2026-01-01',
    validTo: '2026-08-31',
    text: 'The Aurora fee during this period was EUR 8 per month.',
  });
  facts.accounts.set('acc-lucia', {
    id: 'acc-lucia',
    label: 'Aurora account',
    balanceCents: 400750,
  });
  facts.movements.set('movement-lucia-0', {
    id: 'movement-lucia-0',
    accountId: 'acc-lucia',
    amountCents: 175000,
    description: 'September salary',
    createdAt: '2026-09-02T10:00:00.000Z',
  });
  collectAmounts(
    [...facts.documents.values()].map((d) => d.text),
    facts.amounts,
  );
  collectAmounts([...facts.movements.values()], facts.amounts);
  return facts;
}
const raw = (
  verified: RawEvidence['verified'],
  answer = 'Here is what applies to you.',
): RawEvidence => ({ answer, verified, notVerified: [], nextStep: null });
const doc = (id: string) => ({ kind: 'document' as const, id });
const movement = (id: string) => ({ kind: 'movement' as const, id });
test('a statement backed by a document in force and a movement stays verified', () => {
  const evidence = validateEvidence(
    raw([
      { claim: 'The Aurora fee is EUR 6 per month.', sources: [doc('aurora-fees-2026')] },
      {
        claim: 'An incoming EUR 1,750.00 described as "September salary" on 2 September.',
        sources: [movement('movement-lucia-0')],
      },
    ]),
    turn(),
  );
  assert.equal(evidence.downgraded, 0);
  assert.deepEqual(evidence.verified[0].sources, [
    {
      kind: 'document',
      id: 'aurora-fees-2026',
      title: 'Aurora · current fees',
      version: 2,
      validFrom: '2026-09-01',
      validTo: null,
    },
  ]);
  assert.equal(evidence.verified[1].sources[0].kind, 'movement');
});
test('a source that was not retrieved this turn does not back a statement', () => {
  const evidence = validateEvidence(
    raw([{ claim: 'Horizon costs EUR 3.', sources: [doc('horizon-fees-2026')] }]),
    turn(),
  );
  assert.equal(evidence.verified.length, 0);
  assert.deepEqual(evidence.notVerified, [
    { claim: 'Horizon costs EUR 3.', reason: 'No valid source supports this statement.' },
  ]);
});
test('a statement with no source at all is not verified', () => {
  const evidence = validateEvidence(raw([{ claim: 'You will pay nothing.', sources: [] }]), turn());
  assert.equal(evidence.verified.length, 0);
  assert.equal(evidence.downgraded, 1);
});
test('an archived document cannot back a statement, even when it was supplied', () => {
  const evidence = validateEvidence(
    raw([{ claim: 'The Aurora fee is EUR 8 per month.', sources: [doc('archive-aurora-1')] }]),
    turn(),
  );
  assert.equal(evidence.verified.length, 0);
  assert.equal(evidence.notVerified[0].reason, 'No valid source supports this statement.');
});
test("another customer's movement or account cannot be cited", () => {
  const evidence = validateEvidence(
    raw([
      { claim: 'Bruno received a payment.', sources: [movement('movement-bruno-0')] },
      { claim: 'Bruno holds an account.', sources: [{ kind: 'account', id: 'acc-bruno' }] },
    ]),
    turn(),
  );
  assert.equal(evidence.verified.length, 0);
  assert.equal(evidence.downgraded, 2);
});
test('an amount that is not in the cited source downgrades the statement', () => {
  const evidence = validateEvidence(
    raw([
      { claim: 'The Aurora fee is EUR 4 per month.', sources: [doc('aurora-fees-2026')] },
      { claim: 'You received EUR 2,000.', sources: [movement('movement-lucia-0')] },
    ]),
    turn(),
  );
  assert.equal(evidence.verified.length, 0);
  for (const item of evidence.notVerified)
    assert.equal(item.reason, 'An amount in this statement does not appear in its source.');
});
test('an invented amount in the answer text makes the server rebuild the answer', () => {
  const facts = turn();
  const invented = raw(
    [{ claim: 'The Aurora fee is EUR 6 per month.', sources: [doc('aurora-fees-2026')] }],
    'It is common to receive EUR 30 for a referral.',
  );
  invented.notVerified.push({
    claim: 'Whether a referral reward exists.',
    reason: 'Not published.',
  });
  invented.nextStep = 'Ask for a person to confirm it.';
  const text = answerText(invented, validateEvidence(invented, facts), facts);
  assert.doesNotMatch(text, /30/);
  assert.match(text, /^What we could verify: The Aurora fee is EUR 6 per month\./);
  assert.match(text, /What we could not verify: Whether a referral reward exists\./);
  assert.match(text, /Next step: Ask for a person to confirm it\./);
  const nothing = raw([], 'You will get EUR 30.');
  assert.equal(
    answerText(nothing, validateEvidence(nothing, facts), facts),
    'We could not verify an answer to this. Please ask for a person to review it.',
  );
});
test('an amount the customer wrote, or one a source contains, may be repeated', () => {
  const facts = turn();
  collectAmounts('Send EUR 10 to Bruno', facts.amounts);
  const asked = raw([], 'Which account should I use to send the EUR 10?');
  assert.equal(answerText(asked, validateEvidence(asked, facts), facts), asked.answer);
  const policy = raw([], 'The fee is EUR 6, or EUR 0 with a salary of at least EUR 1,200.');
  assert.equal(answerText(policy, validateEvidence(policy, facts), facts), policy.answer);
});
test('euro amounts are read in the forms the assistant and the documents use', () => {
  assert.deepEqual(amountsIn('EUR 1,750 and €10.00, then 6 EUR.'), [175000, 1000, 600]);
  assert.deepEqual(amountsIn('The limit per transfer is EUR 100,000.'), [10000000]);
  assert.deepEqual(amountsIn('EUR 11.75, 3 euros and (EUR 0)'), [1175, 300, 0]);
  assert.deepEqual(amountsIn('three purchases on 2 September 2026'), []);
  const found = new Set<number>();
  collectAmounts({ amountCents: -1175, balanceCents: 400750, note: 'fee EUR 6', count: 3 }, found);
  assert.deepEqual(
    [...found].sort((a, b) => a - b),
    [600, 1175, 400750],
  );
});
