import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';
import { encryptBackup, decryptBackup } from '../scripts/lib/superadmin-recovery';
import { prepareWindowsDirectory, readWindowsBackup, writeWindowsBackup } from '../scripts/lib/windows-backup';
import { hashPassword } from '../server/lib/password';

const windows = process.platform === 'win32';
const execute = promisify(execFile);

function launcherFailure(error: unknown): { expected: boolean; category: string } {
  if (!error || typeof error !== 'object') return { expected: false, category: 'missing-child-error' };
  const result = error as { code?: unknown; stderr?: unknown; signal?: unknown };
  // PowerShell formats/wraps native stderr. Whitespace differences must not
  // obscure which guard ran. Never return raw output, argv, or environment.
  const message = typeof result.stderr === 'string' ? result.stderr.replace(/\s+/g, ' ') : '';
  if (message.includes('clean launcher environment')) return { expected: false, category: 'environment-isolation-guard' };
  if (result.signal) return { expected: false, category: 'child-terminated-by-signal' };
  if (result.code !== 1) return { expected: false, category: 'unexpected-child-exit-status' };
  if (message.includes('interactive terminal')) return { expected: true, category: 'expected-non-tty-guard' };
  if (/running scripts is disabled|digitally signed|PSSecurityException|UnauthorizedAccess/i.test(message)) return { expected: false, category: 'powershell-execution-policy' };
  if (/Use native Windows Node/.test(message)) return { expected: false, category: 'node-version-guard' };
  if (/ERR_MODULE_NOT_FOUND|Cannot find (?:package|module)/.test(message)) return { expected: false, category: 'node-module-resolution' };
  if (/not recognized|CommandNotFoundException/i.test(message)) return { expected: false, category: 'command-resolution' };
  return { expected: false, category: 'unclassified-launcher-error' };
}

test('launcher diagnostics accept wrapped TTY errors without accepting other failures', () => {
  assert.equal(launcherFailure({ code: 1, stderr: 'An interactive\r\n terminal is required.' }).expected, true);
  assert.equal(launcherFailure({ code: 0, stderr: 'An interactive terminal is required.' }).expected, false);
  assert.equal(launcherFailure({ code: 1, stderr: 'Self-test requires the clean launcher environment and no flags.\ninteractive terminal' }).expected, false);
  assert.equal(launcherFailure({ code: 1, stderr: 'ERR_MODULE_NOT_FOUND' }).category, 'node-module-resolution');
  assert.equal(launcherFailure({ code: 1, stderr: 'running scripts is disabled' }).category, 'powershell-execution-policy');
  assert.equal(launcherFailure(new Error('unrelated failure')).expected, false);
});

test('Windows PowerShell files parse without execution', { skip: !windows }, async () => {
  const powershell = join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
  for (const script of ['scripts/windows-backup-acl.ps1', 'scripts/recover-superadmin-windows.ps1', 'scripts/lib/resolve-windows-node.ps1']) {
    const result = await execute(powershell, ['-NoProfile', '-NonInteractive', '-Command',
      '$tokens=$null; $problems=$null; [Management.Automation.Language.Parser]::ParseFile($env:APEX_PARSE_FILE,[ref]$tokens,[ref]$problems) | Out-Null; if($problems.Count){exit 1}'],
    { env: { ...process.env, APEX_PARSE_FILE: resolve(script) }, windowsHide: true });
    assert.equal(result.stderr.trim(), '');
  }
});

test('multiple Node installations resolve to exactly the first executable, including paths with spaces', { skip: !windows }, async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'apex-node-selection-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const first = join(directory, 'first installation', 'node.exe');
  const second = join(directory, 'second installation', 'node.exe');
  await mkdir(join(directory, 'first installation'));
  await mkdir(join(directory, 'second installation'));
  // Empty fixture files are only resolved, never executed. No real Node
  // installation, PATH setting, or database configuration is changed.
  await writeFile(first, '');
  await writeFile(second, '');
  const powershell = join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
  await execute(powershell, ['-NoProfile', '-NonInteractive', '-Command', `
    $ErrorActionPreference='Stop'
    . $env:APEX_RESOLVER_FILE
    # Get-Item may expand an 8.3 TEMP path (for example MARVEL~1) to its
    # long spelling. Compare the selected file's FullName, not the input spelling.
    $expectedFirst=(Get-Item -LiteralPath $env:APEX_FIRST_NODE -Force -ErrorAction Stop).FullName
    $expectedSecond=(Get-Item -LiteralPath $env:APEX_SECOND_NODE -Force -ErrorAction Stop).FullName
    $script:candidates=@([pscustomobject]@{Source=$env:APEX_FIRST_NODE},[pscustomobject]@{Source=$env:APEX_SECOND_NODE})
    function Get-Command { param($Name,$CommandType,[switch]$All,$ErrorAction) $script:candidates }
    $selected=@(Resolve-ApexNodeExecutable)
    if($selected.Count -ne 1 -or $selected[0] -isnot [string] -or $selected[0] -ne $expectedFirst){throw 'Multiple-installation regression'}
    $script:candidates=@([pscustomobject]@{Source=$env:APEX_SECOND_NODE},[pscustomobject]@{Source=$env:APEX_FIRST_NODE})
    $selected=@(Resolve-ApexNodeExecutable)
    if($selected.Count -ne 1 -or $selected[0] -isnot [string] -or $selected[0] -ne $expectedSecond){throw 'Search order regression'}
    $script:candidates=@([pscustomobject]@{Source=@($env:APEX_FIRST_NODE,$env:APEX_SECOND_NODE)})
    $refused=$false
    try { Resolve-ApexNodeExecutable | Out-Null } catch { $refused=$true }
    if(-not $refused){throw 'Array-valued executable was accepted'}
    $script:candidates=@([pscustomobject]@{Source=(Join-Path $env:APEX_FIRST_NODE 'missing.exe')})
    $refused=$false
    try { Resolve-ApexNodeExecutable | Out-Null } catch { $refused=$true }
    if(-not $refused){throw 'Missing executable was accepted'}
  `], { env: { ...process.env, APEX_RESOLVER_FILE: resolve('scripts/lib/resolve-windows-node.ps1'),
    APEX_FIRST_NODE: first, APEX_SECOND_NODE: second }, windowsHide: true });
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
    const failure = launcherFailure(error);
    assert.equal(failure.expected, true, `Launcher failure category: ${failure.category}. No raw child output is displayed.`);
  }
});
