import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'banana-proposals-'));
process.env.DATA_DIR = temp;
// No bank is reachable here: a test that tried to send money would not get a completion.
process.env.BANK_URL = 'http://127.0.0.1:9';
const { cancelTransfer, confirmTransfer, conversationTransfers, reconcileIntents } =
  await import('../src/banking/actions');
const { appDb, closeAppDb } = await import('../src/db');
const payload = JSON.stringify({
  fromAccountId: 'acc-lucia',
  toAccountId: 'acc-bruno',
  amountCents: 1000,
  concept: 'Test',
});
const minutes = (n: number) => new Date(Date.now() + n * 60000).toISOString();
// Writes a proposal and its intent directly, as a request would have left them.
function seed(
  id: string,
  options: {
    expiresAt?: string;
    consumedAt?: string | null;
    status?: string;
    conversationId?: string;
  } = {},
) {
  const db = appDb();
  if (options.conversationId)
    db.prepare('INSERT OR IGNORE INTO conversations VALUES(?,?,?,?)').run(
      options.conversationId,
      'lucia',
      'Test',
      minutes(0),
    );
  db.prepare(
    'INSERT INTO intents(id,user_id,conversation_id,run_id,payload,status,bank_reference,created_at) VALUES(?,?,?,?,?,?,?,?)',
  ).run(
    `intent-${id}`,
    'lucia',
    options.conversationId ?? null,
    'run',
    payload,
    options.status ?? 'proposed',
    `ref-${id}`,
    minutes(0),
  );
  db.prepare('INSERT INTO approvals VALUES(?,?,?,?,?,?)').run(
    `approval-${id}`,
    'lucia',
    `intent-${id}`,
    payload,
    options.expiresAt ?? minutes(10),
    options.consumedAt ?? null,
  );
  return `approval-${id}`;
}
const row = (table: string, id: string) =>
  appDb().prepare(`SELECT * FROM ${table} WHERE id=?`).get(id) as Record<string, any>;
test('an expired proposal cannot be confirmed and sends nothing', async () => {
  const id = seed('expired', { expiresAt: minutes(-1) });
  const result = await confirmTransfer('lucia', id);
  assert.equal(result.status, 'expired');
  assert.equal(row('approvals', id).consumed_at, null);
  assert.equal(row('intents', 'intent-expired').status, 'proposed');
  assert.equal(row('intents', 'intent-expired').last_sent_at, null);
});
test("another customer cannot confirm or cancel someone else's proposal", async () => {
  const id = seed('foreign');
  await assert.rejects(confirmTransfer('bruno', id), { status: 404 });
  assert.throws(() => cancelTransfer('bruno', id), { status: 404 });
  assert.equal(row('approvals', id).consumed_at, null);
});
test('an operator cannot confirm or cancel a proposal', async () => {
  const id = seed('operator');
  await assert.rejects(confirmTransfer('marta', id), { status: 403 });
  assert.throws(() => cancelTransfer('marta', id), { status: 403 });
});
test('a cancelled proposal cannot be confirmed', async () => {
  const id = seed('cancelled');
  assert.equal(cancelTransfer('lucia', id).status, 'cancelled');
  assert.equal(row('intents', 'intent-cancelled').status, 'cancelled');
  assert.equal((await confirmTransfer('lucia', id)).status, 'cancelled');
  assert.equal(cancelTransfer('lucia', id).status, 'cancelled');
  assert.equal(row('intents', 'intent-cancelled').last_sent_at, null);
});
test('a proposal that no longer matches its transfer is refused', async () => {
  const id = seed('tampered');
  appDb()
    .prepare('UPDATE approvals SET payload=? WHERE id=?')
    .run(payload.replace('1000', '999900'), id);
  await assert.rejects(confirmTransfer('lucia', id), { status: 409 });
  assert.equal(row('intents', 'intent-tampered').last_sent_at, null);
});
test('a used proposal of a transfer proposed again authorizes nothing', async () => {
  const id = seed('reused', { consumedAt: minutes(-5) });
  const result = await confirmTransfer('lucia', id);
  assert.equal(result.status, 'expired');
  assert.equal(row('intents', 'intent-reused').status, 'proposed');
  assert.equal(row('intents', 'intent-reused').last_sent_at, null);
});
test('a confirmed transfer cannot be cancelled', () => {
  const id = seed('confirmed', { consumedAt: minutes(-1), status: 'completed' });
  assert.throws(() => cancelTransfer('lucia', id), { status: 409 });
  assert.equal(row('intents', 'intent-confirmed').status, 'completed');
});
test('reconciliation does not treat an unconfirmed proposal as an unverified transfer', async () => {
  seed('untouched');
  assert.deepEqual(await reconcileIntents('lucia'), []);
});
const messages = (conversationId: string) =>
  appDb().prepare('SELECT content FROM messages WHERE conversation_id=?').all(conversationId) as {
    content: string;
  }[];
test('the agent is told which proposals are waiting, expired or cancelled', () => {
  seed('listed-live', { conversationId: 'conv-list' });
  seed('listed-expired', { conversationId: 'conv-list', expiresAt: minutes(-1) });
  cancelTransfer('lucia', seed('listed-cancelled', { conversationId: 'conv-list' }));
  const lines = conversationTransfers('lucia', 'conv-list').join('\n');
  assert.match(lines, /proposed, waiting for the customer to press Confirm transfer, nothing sent/);
  assert.match(lines, /proposal expired without confirmation, nothing sent/);
  assert.match(lines, /cancelled by the customer, nothing sent/);
  assert.doesNotMatch(lines, /completed/);
});
test('a cancellation is written back to the conversation it came from', () => {
  const result = cancelTransfer('lucia', seed('noted', { conversationId: 'conv-note' }));
  // The page uses this to avoid repeating what the conversation already shows (D12).
  assert.equal(result.conversationId, 'conv-note');
  assert.deepEqual(
    messages('conv-note').map((m) => m.content),
    ['You cancelled this transfer. Nothing was sent.'],
  );
});
test('a proposal without a conversation writes nothing and does not break', () => {
  const before = (appDb().prepare('SELECT COUNT(*) n FROM messages').get() as { n: number }).n;
  const result = cancelTransfer('lucia', seed('silent'));
  assert.equal(result.status, 'cancelled');
  assert.equal(result.conversationId, undefined);
  assert.equal(
    (appDb().prepare('SELECT COUNT(*) n FROM messages').get() as { n: number }).n,
    before,
  );
});
after(() => {
  closeAppDb();
  fs.rmSync(temp, { recursive: true, force: true });
});
