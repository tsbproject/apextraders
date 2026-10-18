import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { mkdtemp, rm, chmod, stat, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import pg from 'pg';
import { hashPassword, comparePassword } from '../server/lib/password';
import { recover, rollback, verify, encryptBackup, decryptBackup, readBackup, writeBackup,
  validatePassword, type Backup } from '../scripts/lib/superadmin-recovery';

const secret = () => randomBytes(24).toString('hex');
const connectionString = process.env.RECOVERY_TEST_DATABASE_URL;

test('recovery password bounds prevent bcrypt truncation', () => {
  assert.throws(() => validatePassword('short'));
  assert.throws(() => validatePassword('x'.repeat(73)));
  assert.throws(() => validatePassword('😀'.repeat(19)));
  assert.throws(() => validatePassword('x'.repeat(20) + '\n'));
  validatePassword('x'.repeat(72));
  validatePassword('😀'.repeat(18));
});

test('encrypted backup authenticates data and protects files', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'apex-recovery-backup-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const passphrase = secret();
  const backup: Backup = { version: 1, accountId: randomUUID(), databaseIdentity: 'local-test',
    previousHash: await hashPassword(secret()), replacementDigest: 'a'.repeat(64) };
  const encrypted = encryptBackup(backup, passphrase);
  assert.equal(encrypted.includes(Buffer.from(backup.previousHash)), false);
  assert.equal(encrypted.includes(Buffer.from(passphrase)), false);
  assert.equal(decryptBackup(encrypted, passphrase).previousHash === backup.previousHash, true);
  assert.throws(() => decryptBackup(encrypted, secret()));
  const corrupted = Buffer.from(encrypted); corrupted[corrupted.length - 1] ^= 1;
  assert.throws(() => decryptBackup(corrupted, passphrase));
  const path = join(directory, 'backup.enc');
  await writeBackup(path, encrypted);
  assert.equal((await stat(path)).mode & 0o777, 0o600);
  await assert.rejects(writeBackup(path, encrypted));
  assert.equal((await readFile(path)).equals(encrypted), true);
  assert.equal((await readBackup(path)).equals(encrypted), true);
  await chmod(path, 0o644);
  await assert.rejects(readBackup(path));
  // Arbitrary plaintext is not accepted as a backup.
  await writeFile(path, 'invalid', { mode: 0o600 });
  assert.throws(() => decryptBackup(Buffer.from('invalid'), passphrase));
});

test('isolated PostgreSQL recovery transactions', { skip: !connectionString }, async (t) => {
  const url = new URL(connectionString!);
  // Never allow this test suite to run against a live or arbitrary database.
  assert.equal(['127.0.0.1', '[::1]'].includes(url.hostname), true);
  assert.equal(url.pathname.startsWith('/apex_recovery_test_'), true);
  const client = new pg.Client({ connectionString });
  await client.connect();
  t.after(() => client.end());
  await client.query(`CREATE TABLE public.users (
    id text PRIMARY KEY, email text UNIQUE NOT NULL, role text NOT NULL,
    "passwordHash" text NOT NULL, username text NOT NULL, bio text,
    "resetTokenHash" text, "resetTokenExpiresAt" timestamptz,
    "updatedAt" timestamptz NOT NULL DEFAULT now());
    CREATE TABLE public.wallets (id text PRIMARY KEY, "userId" text REFERENCES users(id), balance numeric NOT NULL);`);
  async function account(role = 'SUPER_ADMIN') {
    const id = randomUUID(); const password = secret(); const hash = await hashPassword(password);
    await client.query('INSERT INTO users (id,email,role,"passwordHash",username,bio,"resetTokenHash","resetTokenExpiresAt") VALUES ($1,$2,$3,$4,$5,$6,$7,now()+interval \'1 hour\')',
      [id, `${id}@example.test`, role, hash, 'Fixture', 'unchanged', secret()]);
    await client.query('INSERT INTO wallets VALUES ($1,$2,123.45)', [randomUUID(), id]);
    return { id, password, hash };
  }
  const before = async () => (await client.query('SELECT to_jsonb(u) - \'passwordHash\' AS data FROM users u ORDER BY id')).rows;
  const hashes = async () => (await client.query<{id: string; passwordHash: string}>('SELECT id,"passwordHash" FROM users ORDER BY id')).rows;

  await t.test('changes only targeted hash; encrypted rollback restores exactly the old value', async () => {
    const user = await account(); await account();
    const allData = await before(); const allHashes = await hashes();
    const wallets = (await client.query('SELECT * FROM wallets ORDER BY id')).rows;
    const password = secret(); const passphrase = secret(); let encrypted: Buffer | undefined;
    await recover(client, user.id, password, 'local-test', async (b) => { encrypted = encryptBackup(b, passphrase); });
    const afterHashes = await hashes();
    assert.equal(afterHashes.filter((row, i) => row.passwordHash !== allHashes[i].passwordHash).length, 1);
    assert.equal(await verify(client, user.id, password), true);
    assert.equal(await verify(client, user.id, user.password), false);
    assert.equal(JSON.stringify(await before()) === JSON.stringify(allData), true);
    assert.deepEqual((await client.query('SELECT * FROM wallets ORDER BY id')).rows, wallets);
    await rollback(client, user.id, 'local-test', decryptBackup(encrypted!, passphrase));
    assert.equal(JSON.stringify(await hashes()) === JSON.stringify(allHashes), true);
    assert.equal(JSON.stringify(await before()) === JSON.stringify(allData), true);
    await assert.rejects(rollback(client, user.id, 'local-test', decryptBackup(encrypted!, passphrase)));
  });

  await t.test('missing ID and non-superadmin roles cannot be changed', async () => {
    for (const role of ['USER', 'ADMIN']) {
      const user = await account(role);
      await assert.rejects(recover(client, user.id, secret(), 'local-test', async () => { throw new Error('must not reach backup'); }));
      assert.equal((await hashes()).find(row => row.id === user.id)?.passwordHash === user.hash, true);
    }
    await assert.rejects(recover(client, randomUUID(), secret(), 'local-test', async () => {}));
  });

  await t.test('backup failure rolls back without changing any account data', async () => {
    const user = await account(); const allData = await before();
    await assert.rejects(recover(client, user.id, secret(), 'local-test', async () => { throw new Error('simulated storage failure'); }));
    assert.equal((await hashes()).find(row => row.id === user.id)?.passwordHash === user.hash, true);
    assert.equal(JSON.stringify(await before()) === JSON.stringify(allData), true);
  });

  await t.test('zero-row update causes rollback', async () => {
    const user = await account();
    await client.query(`CREATE FUNCTION suppress_update() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN NULL; END $$;
      CREATE TRIGGER suppress_update BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION suppress_update();`);
    try {
      await assert.rejects(recover(client, user.id, secret(), 'local-test', async () => {}));
      assert.equal((await hashes()).find(row => row.id === user.id)?.passwordHash === user.hash, true);
    } finally { await client.query('DROP TRIGGER suppress_update ON users; DROP FUNCTION suppress_update()'); }
  });

  await t.test('no-op recovery refuses a password that already matches', async () => {
    const user = await account(); let called = false;
    await assert.rejects(recover(client, user.id, user.password, 'local-test', async () => { called = true; }));
    assert.equal(called, false);
  });

  await t.test('database-side hash rewriting is detected and rolled back', async () => {
    const user = await account();
    await client.query(`CREATE FUNCTION corrupt_hash() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW."passwordHash" := 'invalid-test-value'; RETURN NEW; END $$;
      CREATE TRIGGER corrupt_hash BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION corrupt_hash();`);
    try {
      await assert.rejects(recover(client, user.id, secret(), 'local-test', async () => {}));
      assert.equal((await hashes()).find(row => row.id === user.id)?.passwordHash === user.hash, true);
    } finally { await client.query('DROP TRIGGER corrupt_hash ON users; DROP FUNCTION corrupt_hash()'); }
  });

  await t.test('rollback refuses wrong target, subsequent password changes, and demotion', async () => {
    const user = await account(); let backup: Backup | undefined;
    await recover(client, user.id, secret(), 'local-test', async (b) => { backup = b; });
    await assert.rejects(rollback(client, randomUUID(), 'local-test', backup!));
    await assert.rejects(rollback(client, user.id, 'other-database', backup!));
    const changedHash = await hashPassword(secret());
    await client.query('UPDATE users SET "passwordHash"=$1 WHERE id=$2', [changedHash, user.id]);
    await assert.rejects(rollback(client, user.id, 'local-test', backup!));
    assert.equal((await hashes()).find(row => row.id === user.id)?.passwordHash === changedHash, true);
    await client.query('UPDATE users SET role=\'USER\' WHERE id=$1', [user.id]);
    await assert.rejects(rollback(client, user.id, 'local-test', backup!));
  });

  await t.test('row lock rechecks role after a concurrent demotion', async () => {
    const user = await account(); const concurrent = new pg.Client({ connectionString }); await concurrent.connect();
    try {
      await concurrent.query('BEGIN');
      await concurrent.query('UPDATE users SET role=\'USER\' WHERE id=$1', [user.id]);
      const pending = assert.rejects(recover(client, user.id, secret(), 'local-test', async () => {}));
      await concurrent.query('COMMIT'); await pending;
      assert.equal((await hashes()).find(row => row.id === user.id)?.passwordHash === user.hash, true);
    } finally { await concurrent.end(); }
  });
});
