import { emitKeypressEvents } from 'node:readline';
import { parseArgs } from 'node:util';
import { isAbsolute, dirname } from 'node:path';
import { lstat } from 'node:fs/promises';
import pg from 'pg';
import { RecoveryError, recover, rollback, verify, encryptBackup, decryptBackup,
  readBackup, writeBackup, validatePassword, validatePassphrase } from './lib/superadmin-recovery';

// This entry point intentionally does not load dotenv or DATABASE_URL. The
// operator must supply the target connection through the hidden TTY prompt.
async function prompt(label: string, hidden = false): Promise<string> {
  const input = process.stdin;
  if (!input.isTTY || !process.stdout.isTTY || !process.stderr.isTTY) {
    throw new RecoveryError('An interactive terminal is required; pipes and redirected sessions are refused.');
  }
  emitKeypressEvents(input);
  const previousRaw = input.isRaw;
  input.setRawMode(true);
  input.resume();
  process.stderr.write(label);
  return new Promise((resolve, reject) => {
    let value = '';
    const cleanup = () => {
      input.removeListener('keypress', onKey);
      process.removeListener('SIGTERM', onSignal);
      process.removeListener('SIGHUP', onSignal);
      input.setRawMode(previousRaw);
      input.pause();
      process.stderr.write('\n');
    };
    const onSignal = () => { value = ''; cleanup(); reject(new RecoveryError('Cancelled.')); };
    const onKey = (text: string | undefined, key: { name?: string; ctrl?: boolean; meta?: boolean }) => {
      if (key.ctrl && (key.name === 'c' || key.name === 'd')) return onSignal();
      if (key.name === 'return' || key.name === 'enter') {
        const result = value; value = ''; cleanup(); resolve(result); return;
      }
      if (key.name === 'backspace') {
        if (value) { value = Array.from(value).slice(0, -1).join(''); if (!hidden) process.stderr.write('\b \b'); }
        return;
      }
      if (text && !key.ctrl && !key.meta && !/[\x00-\x1f\x7f]/.test(text)) {
        value += text;
        if (Buffer.byteLength(value) > 16384) return onSignal();
        if (!hidden) process.stderr.write(text);
      }
    };
    input.on('keypress', onKey);
    process.once('SIGTERM', onSignal);
    process.once('SIGHUP', onSignal);
  });
}

async function main(): Promise<void> {
  const { values, positionals } = parseArgs({ options: {
    'account-id': { type: 'string' }, backup: { type: 'string' },
    apply: { type: 'boolean' }, 'allow-remote': { type: 'boolean' }, help: { type: 'boolean' },
  }, allowPositionals: true, strict: true });
  if (values.help) {
    console.log('Usage: node --import tsx scripts/recover-superadmin.ts <recover|verify|rollback> --account-id <exact-id> [--backup /absolute/private/file] [--apply] [--allow-remote]');
    return;
  }
  const action = positionals[0];
  const accountId = values['account-id'];
  if (positionals.length !== 1 || !['recover', 'verify', 'rollback'].includes(action) ||
      !accountId || accountId.length > 128 || /\s|[\x00-\x1f\x7f]/.test(accountId)) {
    throw new RecoveryError('Supply an explicit command and exact account ID; use --help.');
  }
  if (action !== 'verify' && (!values.apply || !values.backup || !isAbsolute(values.backup))) {
    throw new RecoveryError('Mutating commands require --apply and an absolute --backup path.');
  }
  if (action === 'verify' && (values.apply || values.backup)) throw new RecoveryError('Verify is read-only; omit --apply and --backup.');
  if (!process.stdin.isTTY || !process.stdout.isTTY || !process.stderr.isTTY) throw new RecoveryError('An unredirected interactive terminal is required.');
  if (values.backup) {
    const directory = await lstat(dirname(values.backup));
    if (!directory.isDirectory() || directory.isSymbolicLink() || directory.uid !== process.getuid?.() || (directory.mode & 0o077) !== 0) {
      throw new RecoveryError('The backup directory must already exist, be operator-owned, and have mode 0700.');
    }
  }
  let connectionString = await prompt('Target PostgreSQL URL (hidden): ', true);
  const target = new URL(connectionString);
  if (!['postgres:', 'postgresql:'].includes(target.protocol) || !target.hostname || target.pathname.length <= 1) {
    throw new RecoveryError('A PostgreSQL URL with an explicit database is required.');
  }
  // libpq-style query parameters can override routing fields in a URL. Refuse
  // them so the connection cannot differ from the displayed/confirmed target.
  for (const name of target.searchParams.keys()) {
    if (!['sslmode', 'channel_binding'].includes(name) || target.searchParams.getAll(name).length !== 1) {
      throw new RecoveryError('Only single sslmode and channel_binding URL parameters are accepted.');
    }
  }
  const local = ['127.0.0.1', '[::1]'].includes(target.hostname);
  if (!local && (!values['allow-remote'] || target.searchParams.get('sslmode') !== 'verify-full')) {
    throw new RecoveryError('Remote connections require --allow-remote and sslmode=verify-full; TLS verification cannot be disabled.');
  }
  const database = decodeURIComponent(target.pathname.slice(1));
  if (/[\x00-\x1f\x7f]/.test(database)) throw new RecoveryError('Database name contains control characters.');
  const identity = `${target.hostname}:${target.port || '5432'}/${database}`;
  // Only non-secret target metadata is shown. Never print the URL or username.
  const confirmation = `${action.toUpperCase()} ${accountId} ${identity}`;
  if (await prompt(`Type exactly ${JSON.stringify(confirmation)} to confirm: `) !== confirmation) {
    throw new RecoveryError('Confirmation did not match.');
  }
  let password = '';
  let passphrase = '';
  if (action === 'recover' || action === 'verify') {
    password = await prompt(action === 'recover' ? 'New password (hidden): ' : 'Password to verify (hidden): ', true);
  }
  if (action === 'recover') {
    validatePassword(password);
    if (await prompt('Confirm new password (hidden): ', true) !== password) throw new RecoveryError('Passwords did not match.');
  }
  if (action !== 'verify') {
    passphrase = await prompt('Independent backup passphrase (hidden): ', true);
    validatePassphrase(passphrase);
    if (action === 'recover') {
      if (passphrase === password) throw new RecoveryError('Backup passphrase must differ from the account password.');
      if (await prompt('Confirm backup passphrase (hidden): ', true) !== passphrase) throw new RecoveryError('Backup passphrases did not match.');
    }
  }
  const backup = action === 'rollback' ? decryptBackup(await readBackup(values.backup!), passphrase) : undefined;
  const client = new pg.Client({ connectionString, connectionTimeoutMillis: 10000,
    application_name: 'apextraders-one-time-superadmin-recovery' });
  connectionString = '';
  // Driver exception text can contain connection details; it is never logged.
  client.on('error', () => {});
  try {
    await client.connect();
    const actual = await client.query<{ database: string }>('SELECT current_database() AS database');
    if (actual.rows[0]?.database !== database) throw new RecoveryError('Connected database does not match the confirmed target.');
    if (action === 'recover') {
      await recover(client, accountId, password, identity,
        async (data) => writeBackup(values.backup!, encryptBackup(data, passphrase)));
      console.log('Committed: exactly one SUPER_ADMIN passwordHash updated. Encrypted rollback backup saved.');
    } else if (action === 'rollback') {
      await rollback(client, accountId, identity, backup!);
      console.log('Committed: exactly one passwordHash restored.');
    } else {
      if (!await verify(client, accountId, password)) throw new RecoveryError('Password verification did not match.');
      console.log('Verified: exact SUPER_ADMIN account and password match. No data changed.');
    }
  } finally {
    password = ''; passphrase = '';
    try { await client.end(); } catch { /* Never display driver details. */ }
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof RecoveryError ? error.message : 'Operation failed. No sensitive error details are displayed. A connection failure during commit can have an uncertain outcome; verify before retrying.');
  process.exitCode = 1;
});
