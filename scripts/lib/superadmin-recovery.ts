import { createCipheriv, createDecipheriv, createHash, randomBytes, scryptSync } from 'node:crypto';
import { constants } from 'node:fs';
import { open } from 'node:fs/promises';
import type { Client } from 'pg';
import { hashPassword, comparePassword } from '../../server/lib/password';

export class RecoveryError extends Error {}

export interface Backup {
  version: 1;
  accountId: string;
  databaseIdentity: string;
  previousHash: string;
  replacementDigest: string;
}

const digest = (value: string): string => createHash('sha256').update(value).digest('hex');

export function validatePassword(password: string): void {
  if (password.length < 16 || Buffer.byteLength(password, 'utf8') > 72 || /[\r\n\0]/.test(password)) {
    throw new RecoveryError('Use at least 16 characters and at most 72 UTF-8 bytes, without line breaks or NUL.');
  }
}

export function validatePassphrase(passphrase: string): void {
  if (passphrase.length < 20 || Buffer.byteLength(passphrase) > 1024) {
    throw new RecoveryError('Use an independent backup passphrase of 20–1024 UTF-8 bytes.');
  }
}

export function encryptBackup(backup: Backup, passphrase: string): Buffer {
  validatePassphrase(passphrase);
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = scryptSync(passphrase, salt, 32, { N: 32768, maxmem: 128 * 1024 * 1024 });
  try {
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const plaintext = Buffer.from(JSON.stringify(backup));
    try {
      const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
      // Fixed binary format; no attacker-controlled KDF parameters.
      return Buffer.concat([Buffer.from('APEXREC1'), salt, iv, cipher.getAuthTag(), ciphertext]);
    } finally { plaintext.fill(0); }
  } finally { key.fill(0); }
}

export function decryptBackup(data: Buffer, passphrase: string): Backup {
  validatePassphrase(passphrase);
  if (data.length < 53 || data.length > 16384 || data.subarray(0, 8).toString() !== 'APEXREC1') {
    throw new RecoveryError('Invalid encrypted backup.');
  }
  const key = scryptSync(passphrase, data.subarray(8, 24), 32, { N: 32768, maxmem: 128 * 1024 * 1024 });
  try {
    const decipher = createDecipheriv('aes-256-gcm', key, data.subarray(24, 36));
    decipher.setAuthTag(data.subarray(36, 52));
    const plaintext = Buffer.concat([decipher.update(data.subarray(52)), decipher.final()]);
    try {
      const value: unknown = JSON.parse(plaintext.toString('utf8'));
      if (!value || typeof value !== 'object') throw new Error();
      const b = value as Partial<Backup>;
      if (b.version !== 1 || typeof b.accountId !== 'string' || typeof b.databaseIdentity !== 'string' ||
          typeof b.previousHash !== 'string' || typeof b.replacementDigest !== 'string' ||
          !/^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(b.previousHash) || !/^[a-f0-9]{64}$/.test(b.replacementDigest)) throw new Error();
      return b as Backup;
    } finally { plaintext.fill(0); }
  } catch { throw new RecoveryError('Cannot authenticate encrypted backup.'); }
  finally { key.fill(0); }
}

export async function writeBackup(path: string, encrypted: Buffer): Promise<void> {
  const file = await open(path, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
  try {
    await file.writeFile(encrypted);
    await file.sync();
  } finally { await file.close(); }
  // Persist the directory entry before a database commit can occur.
  const { dirname } = await import('node:path');
  const directory = await open(dirname(path), constants.O_RDONLY | constants.O_DIRECTORY);
  try { await directory.sync(); } finally { await directory.close(); }
}

export async function readBackup(path: string): Promise<Buffer> {
  const file = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const stat = await file.stat();
    if (!stat.isFile() || stat.uid !== process.getuid?.() || (stat.mode & 0o077) !== 0 || stat.size > 16384) {
      throw new RecoveryError('Backup must be an owner-only regular file owned by this operator.');
    }
    return await file.readFile();
  } finally { await file.close(); }
}

interface Account { id: string; role: string; passwordHash: string }

async function lockedAccount(client: Client, accountId: string): Promise<Account> {
  const result = await client.query<Account>('SELECT id, role, "passwordHash" FROM public.users WHERE id = $1 FOR UPDATE', [accountId]);
  if (result.rowCount !== 1 || result.rows[0].role !== 'SUPER_ADMIN') {
    throw new RecoveryError('Exactly one existing SUPER_ADMIN with the supplied ID is required.');
  }
  return result.rows[0];
}

async function transaction<T>(client: Client, operation: () => Promise<T>): Promise<T> {
  await client.query('BEGIN');
  try {
    await client.query("SET LOCAL lock_timeout = '5s'");
    await client.query("SET LOCAL statement_timeout = '15s'");
    const result = await operation();
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch { /* Connection may be lost; do not leak driver errors. */ }
    throw error;
  }
}

export async function recover(client: Client, accountId: string, password: string,
  databaseIdentity: string, persistBackup: (backup: Backup) => Promise<void>): Promise<void> {
  validatePassword(password);
  const replacement = await hashPassword(password);
  if (!await comparePassword(password, replacement)) throw new RecoveryError('Hash verification failed.');
  await transaction(client, async () => {
    const user = await lockedAccount(client, accountId);
    if (!/^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(user.passwordHash)) {
      throw new RecoveryError('Existing password format is not recognized; stop for separate review.');
    }
    if (await comparePassword(password, user.passwordHash)) {
      throw new RecoveryError('The proposed password already matches; no recovery was performed.');
    }
    await persistBackup({ version: 1, accountId, databaseIdentity,
      previousHash: user.passwordHash, replacementDigest: digest(replacement) });
    const updated = await client.query(
      'UPDATE public.users SET "passwordHash" = $1 WHERE id = $2 AND role = $3 AND "passwordHash" = $4 RETURNING id',
      [replacement, accountId, 'SUPER_ADMIN', user.passwordHash]);
    if (updated.rowCount !== 1 || updated.rows[0]?.id !== accountId) throw new RecoveryError('Update count was not exactly one.');
    const stored = await client.query<{ passwordHash: string }>('SELECT "passwordHash" FROM public.users WHERE id = $1', [accountId]);
    if (stored.rowCount !== 1 || stored.rows[0].passwordHash !== replacement ||
        !await comparePassword(password, stored.rows[0].passwordHash)) throw new RecoveryError('Stored password verification failed; transaction rolled back.');
  });
}

export async function rollback(client: Client, accountId: string, databaseIdentity: string, backup: Backup): Promise<void> {
  if (backup.accountId !== accountId || backup.databaseIdentity !== databaseIdentity) {
    throw new RecoveryError('Backup account/database does not match this operation.');
  }
  await transaction(client, async () => {
    const user = await lockedAccount(client, accountId);
    if (digest(user.passwordHash) !== backup.replacementDigest) {
      throw new RecoveryError('Password changed since recovery, or recovery did not commit; rollback refused.');
    }
    const updated = await client.query(
      'UPDATE public.users SET "passwordHash" = $1 WHERE id = $2 AND role = $3 AND "passwordHash" = $4 RETURNING id',
      [backup.previousHash, accountId, 'SUPER_ADMIN', user.passwordHash]);
    if (updated.rowCount !== 1 || updated.rows[0]?.id !== accountId) throw new RecoveryError('Rollback count was not exactly one.');
  });
}

export async function verify(client: Client, accountId: string, password: string): Promise<boolean> {
  await client.query('BEGIN READ ONLY');
  try {
    const result = await client.query<Account>('SELECT id, role, "passwordHash" FROM public.users WHERE id = $1', [accountId]);
    if (result.rowCount !== 1 || result.rows[0].role !== 'SUPER_ADMIN') {
      throw new RecoveryError('Exactly one existing SUPER_ADMIN with the supplied ID is required.');
    }
    const matches = await comparePassword(password, result.rows[0].passwordHash);
    await client.query('COMMIT');
    return matches;
  } catch (error) { try { await client.query('ROLLBACK'); } catch {} throw error; }
}
