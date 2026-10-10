import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'banana-products-'));
process.env.DATA_DIR = temp;
// A blank key: selecting documents by product must not need any external call.
process.env.OPENAI_API_KEY = ' ';
const { newFacts } = await import('../src/agent/evidence');
const { attachProductDocuments, learn } = await import('../src/agent/run');
const { productDocuments } = await import('../src/retrieval/search');
const { closeAppDb } = await import('../src/db');
// What list_accounts returns for a customer, reduced to what matters here.
const accountsOf = (...labels: string[]) => ({
  accounts: labels.map((label, i) => ({ id: `acc-${i}`, label, balanceCents: 1000 })),
  contacts: [{ id: 'acc-other', label: 'Aurora account', name: 'Someone else' }],
});
test('as Bruno, looking up his accounts puts the Horizon documents on the table, and no Aurora one', () => {
  const facts = newFacts();
  learn(facts, 'list_accounts', attachProductDocuments(accountsOf('Horizon account')));
  const ids = [...facts.documents.keys()];
  assert.ok(ids.includes('horizon-fees-2026'), 'the Horizon fee document is a fact of the turn');
  assert.ok(
    ids.every((id) => !id.includes('aurora')),
    `no Aurora document: ${ids.join(', ')}`,
  );
  assert.ok(facts.amounts.has(300), 'the EUR 3 fee can now be stated and checked');
});
test('only documents in force and meant for customers are selected for a product', () => {
  const sources = productDocuments(['Horizon account']);
  assert.ok(sources.length > 0);
  for (const s of sources) {
    assert.match(String(s.title), /^Horizon /);
    assert.equal(s.validTo, null);
    assert.doesNotMatch(s.documentId, /^archive-/);
  }
  assert.ok(sources.some((s) => /The monthly fee for Horizon is EUR 3\./.test(s.text)));
});
test('a product with no published document adds nothing, and a contact does not count', () => {
  assert.deepEqual(productDocuments(['Personal savings']), []);
  const facts = newFacts();
  learn(facts, 'list_accounts', attachProductDocuments(accountsOf('Personal savings')));
  assert.equal(facts.documents.size, 0);
});
test('a customer with two products gets the documents of both, each once', () => {
  const ids = productDocuments(['Aurora account', 'Aurora account', 'Horizon account']).map(
    (s) => s.documentId,
  );
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.includes('aurora-fees-2026') && ids.includes('horizon-fees-2026'));
});
after(() => {
  closeAppDb();
  fs.rmSync(temp, { recursive: true, force: true });
});
