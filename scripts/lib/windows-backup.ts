import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { lstat, open } from 'node:fs/promises';
import { RecoveryError } from './superadmin-recovery';

const execute = promisify(execFile);

export async function windowsAcl(action: 'CreateDirectory' | 'CheckDirectory' | 'CheckFile', path: string): Promise<void> {
  if (process.platform !== 'win32') throw new RecoveryError('Windows backup operations require Windows.');
  const helper = fileURLToPath(new URL('../windows-backup-acl.ps1', import.meta.url));
  const powershell = join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
  try {
    await execute(powershell, ['-NoLogo', '-NoProfile', '-NonInteractive', '-File', helper, '-Action', action, '-Path', path],
      { timeout: 15000, windowsHide: true, maxBuffer: 4096 });
  } catch { throw new RecoveryError('Windows backup security check failed; no update should be retried until the backup path is reviewed.'); }
}

export async function prepareWindowsDirectory(path: string): Promise<void> {
  try { await lstat(path); }
  catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      await windowsAcl('CreateDirectory', path);
      return;
    }
    throw new RecoveryError('Cannot inspect Windows backup directory.');
  }
  await windowsAcl('CheckDirectory', path);
}

export async function writeWindowsBackup(path: string, encrypted: Buffer): Promise<void> {
  await windowsAcl('CheckDirectory', dirname(path));
  const file = await open(path, 'wx');
  try {
    // The empty file must inherit only the private directory owner's access.
    await windowsAcl('CheckFile', path);
    await file.writeFile(encrypted);
    await file.sync(); // FlushFileBuffers on Windows; no POSIX directory-open flags.
  } finally { await file.close(); }
  const persisted = await readWindowsBackup(path);
  if (!persisted.equals(encrypted)) throw new RecoveryError('Encrypted backup read-back failed.');
}

export async function readWindowsBackup(path: string): Promise<Buffer> {
  await windowsAcl('CheckDirectory', dirname(path));
  await windowsAcl('CheckFile', path);
  const file = await open(path, 'r');
  try {
    const info = await file.stat();
    if (!info.isFile() || info.size > 16384 || info.nlink !== 1) throw new RecoveryError('Invalid Windows backup file.');
    return await file.readFile();
  } finally { await file.close(); }
}
