// Use only with a newly created disposable local PostgreSQL database.
// The operator/test harness supplies the connection via environment, not argv.
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { readdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import pg from 'pg';
import { hashPassword } from '../server/lib/password.ts';

async function run(command, args, env) {
  const child = spawn(command, args, { env, stdio: 'inherit' });
  const status = await new Promise((resolve, reject) => {
    child.once('error', reject); child.once('exit', resolve);
  });
  if (status !== 0) throw new Error('Local test subprocess failed.');
}

async function main() {
  const connectionString = process.env.RECOVERY_TEST_DATABASE_URL;
  if (!connectionString) throw new Error('A dedicated local test database is required.');
  const url = new URL(connectionString);
  if (url.hostname !== '127.0.0.1' || !url.pathname.startsWith('/apex_recovery_test_') || url.search) {
    throw new Error('Refusing a non-local or ambiguous test target.');
  }
  const env = { ...process.env, DOTENV_CONFIG_PATH: '/dev/null' };
  delete env.DATABASE_URL;
  const tests = (await readdir('tests')).filter(name => /\.test\.(mjs|ts)$/.test(name)).map(name => `tests/${name}`);
  await run(process.execPath, ['--import', 'tsx', '--test', ...tests], env);
  const client = new pg.Client({ connectionString });
  client.on('error', () => {});
  try {
    await client.connect();
    const id = randomUUID();
    const passwordHash = await hashPassword(randomBytes(24).toString('hex'));
    await client.query('INSERT INTO public.users (id,email,role,"passwordHash",username) VALUES ($1,$2,\'SUPER_ADMIN\',$3,\'TTY fixture\')',
      [id, `${id}@example.test`, passwordHash]);
    const before = await client.query('SELECT to_jsonb(u) AS snapshot FROM public.users u WHERE id=$1', [id]);
    await run('python3', ['tests/superadmin-recovery-tty.test.py'], {
      ...env, RECOVERY_TEST_ACCOUNT_ID: id, RECOVERY_TEST_NODE: process.execPath,
    });
    const after = await client.query('SELECT to_jsonb(u) AS snapshot FROM public.users u WHERE id=$1', [id]);
    // Boolean comparison avoids dumping password hashes on assertion failure.
    assert.equal(JSON.stringify(before.rows) === JSON.stringify(after.rows), true);
    console.log('PASS: interactive cycle restored the complete fixture exactly. No live database accessed.');
  } finally { try { await client.end(); } catch {} }
}

main().catch(() => {
  console.error('Local recovery test runner failed. Sensitive driver details are suppressed.');
  process.exitCode = 1;
});
