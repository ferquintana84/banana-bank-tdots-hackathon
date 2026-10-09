import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'banana-reconcile-'));
process.env.DATA_DIR = temp;
const { reconcileIntents } = await import('../src/banking/actions');
const { closeAppDb } = await import('../src/db');
// Callers shield the customer from a failed check, so a broken query would go unnoticed
// without this: it must run, and with nothing to verify it needs no bank.
test('reconciliation runs its query and finds nothing to verify in an empty database', async () => {
  assert.deepEqual(await reconcileIntents('lucia'), []);
  assert.deepEqual(await reconcileIntents('lucia', 'some-reference'), []);
});
after(() => {
  closeAppDb();
  fs.rmSync(temp, { recursive: true, force: true });
});
