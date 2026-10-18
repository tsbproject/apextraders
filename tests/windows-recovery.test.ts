import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';
import { encryptBackup, decryptBackup } from '../scripts/lib/superadmin-recovery';
import { prepareWindowsDirectory, readWindowsBackup, writeWindowsBackup } from '../scripts/lib/windows-backup';
import { hashPassword } from '../server/lib/password';

const windows = process.platform === 'win32';
const execute = promisify(execFile);

test('Windows PowerShell files parse without execution', { skip: !windows }, async () => {
  const powershell = join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
  for (const script of ['scripts/windows-backup-acl.ps1', 'scripts/recover-superadmin-windows.ps1']) {
    const result = await execute(powershell, ['-NoProfile', '-NonInteractive', '-Command',
      '$tokens=$null; $problems=$null; [Management.Automation.Language.Parser]::ParseFile($env:APEX_PARSE_FILE,[ref]$tokens,[ref]$problems) | Out-Null; if($problems.Count){exit 1}'],
    { env: { ...process.env, APEX_PARSE_FILE: resolve(script) }, windowsHide: true });
    assert.equal(result.stderr.trim(), '');
  }
});

test('native NTFS private backup, encryption, and overwrite refusal', { skip: !windows }, async (t) => {
  const parent = await mkdtemp(join(tmpdir(), 'apex-windows-recovery-'));
  t.after(() => rm(parent, { recursive: true, force: true }));
  const directory = join(parent, 'private');
  await prepareWindowsDirectory(directory);
  const passphrase = randomBytes(32).toString('hex');
  const backup = { version: 1 as const, accountId: 'local-fixture', databaseIdentity: 'local-fixture',
    previousHash: await hashPassword(randomBytes(24).toString('hex')), replacementDigest: 'b'.repeat(64) };
  const encrypted = encryptBackup(backup, passphrase);
  const file = join(directory, 'rollback.enc');
  await writeWindowsBackup(file, encrypted);
  assert.equal((await readWindowsBackup(file)).equals(encrypted), true);
  assert.equal(decryptBackup(await readWindowsBackup(file), passphrase).previousHash === backup.previousHash, true);
  await assert.rejects(writeWindowsBackup(file, encrypted));

  // An ACL granting read access to another principal must fail closed.
  const powershell = join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
  await execute(powershell, ['-NoProfile', '-NonInteractive', '-Command',
    "$acl=Get-Acl -LiteralPath $env:APEX_ACL_TEST_FILE; $sid=[Security.Principal.SecurityIdentifier]::new('S-1-1-0'); $rule=[Security.AccessControl.FileSystemAccessRule]::new($sid,[Security.AccessControl.FileSystemRights]::Read,[Security.AccessControl.AccessControlType]::Allow); $acl.AddAccessRule($rule); Set-Acl -LiteralPath $env:APEX_ACL_TEST_FILE -AclObject $acl"],
  { env: { ...process.env, APEX_ACL_TEST_FILE: file }, windowsHide: true });
  await assert.rejects(readWindowsBackup(file));
});

test('Windows backup adapter refuses other platforms', { skip: windows }, async () => {
  await assert.rejects(prepareWindowsDirectory('/definitely-not-a-windows-drive'));
});

test('Windows launcher removes ambient overrides before non-TTY self-test', { skip: !windows }, async () => {
  const powershell = join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
  try {
    await execute(powershell, ['-NoProfile', '-NonInteractive', '-File', resolve('scripts/recover-superadmin-windows.ps1'), '-Action', 'self-test'],
      { env: { ...process.env, NODE_OPTIONS: '--no-warnings', PGHOST: 'must-not-contact.invalid',
        DATABASE_URL: 'unused-local-test-sentinel' }, windowsHide: true });
    assert.fail('Redirected self-test must fail.');
  } catch (error: unknown) {
    assert.equal(typeof error === 'object' && error !== null && 'stderr' in error &&
      typeof error.stderr === 'string' && error.stderr.includes('interactive terminal') &&
      !error.stderr.includes('clean launcher environment'), true);
  }
});
