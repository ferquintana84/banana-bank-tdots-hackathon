import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'banana-retrieval-'));
process.env.DATA_DIR = temp;
// A blank key: these tests must find every query vector in the local cache.
process.env.OPENAI_API_KEY = ' ';
const { seedApp } = await import('../src/seed');
const { closeAppDb } = await import('../src/db');
const { allChunks } = await import('../src/retrieval/store');
const { documents } = await import('../src/ingestion/pipeline');
const { inForce, searchDocuments, sourcesForAnswer } = await import('../src/retrieval/search');
seedApp();
const manifest = new Map(documents().map((d) => [d.id, d]));
const chunkOf = (documentId: string, containing: string) => {
  const chunk = allChunks().find((c) => c.documentId === documentId && c.text.includes(containing));
  assert.ok(chunk, `chunk of ${documentId} containing "${containing}"`);
  return chunk;
};
test('a document is in force from its first to its last day', () => {
  const archived = { validFrom: '2026-01-01', validTo: '2026-08-31' };
  assert.equal(inForce(archived, '2025-12-31'), false);
  assert.equal(inForce(archived, '2026-01-01'), true);
  assert.equal(inForce(archived, '2026-08-31'), true);
  assert.equal(inForce(archived, '2026-09-01'), false);
  assert.equal(inForce(archived), false);
  const current = { validFrom: '2026-09-01', validTo: null };
  assert.equal(inForce(current, '2026-08-31'), false);
  assert.equal(inForce(current), true);
});
test('a query identical to an archived text returns only documents in force', async () => {
  const archived = chunkOf('archive-aurora-1', 'EUR 8 per month');
  const results = await searchDocuments(archived.text);
  assert.ok(results.length > 0);
  for (const r of results) {
    assert.ok(inForce(manifest.get(r.documentId)!), `${r.documentId} is in force`);
    assert.doesNotMatch(r.text, /EUR 8 per month/);
  }
});
test('every result carries title, version and validity, whatever its position in the document', async () => {
  const second = chunkOf('aurora-fees-2026', 'fully waived');
  assert.equal(second.title, null, 'the index itself keeps no title for this chunk');
  const results = await searchDocuments(second.text);
  assert.equal(results[0].documentId, 'aurora-fees-2026');
  for (const r of results) {
    const doc = manifest.get(r.documentId)!;
    assert.equal(r.title, doc.title);
    assert.equal(r.version, doc.version);
    assert.equal(r.validFrom, doc.validFrom);
    assert.equal(r.validTo, doc.validTo);
  }
});
test('customers never get internal documents; operators can', async () => {
  const internal = allChunks().find((c) => c.audience === 'internal')!;
  const asCustomer = await searchDocuments(internal.text);
  assert.ok(asCustomer.every((r) => r.audience === 'public'));
  const asOperator = await searchDocuments(internal.text, 'operator');
  assert.equal(asOperator[0].documentId, internal.documentId);
});
test('the answer is built from whole documents, each one once', async () => {
  const results = await searchDocuments(chunkOf('aurora-fees-2026', 'fully waived').text);
  const sources = sourcesForAnswer([...results, ...results]);
  assert.equal(sources.length, new Set(results.map((r) => r.documentId)).size);
  const aurora = sources.find((s) => s.documentId === 'aurora-fees-2026')!;
  assert.equal(aurora.version, 2);
  assert.equal(aurora.validFrom, '2026-09-01');
  assert.match(aurora.text, /^# Aurora · current fees/);
  assert.match(aurora.text, /three settled card purchases/);
  assert.match(aurora.text, /## Support and continuity/);
});
after(() => {
  closeAppDb();
  fs.rmSync(temp, { recursive: true, force: true });
});
