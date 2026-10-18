# Native Windows: one-time superadmin recovery

Prepared on `fix/windows-superadmin-recovery`, based on reviewed `ce0995a1`.
No database URL, password, account hash, or production account ID is embedded.
No production/staging connection or recovery has been performed.

**Current assessment: NO-GO for production execution until the native Windows
checks below pass.** This workspace is Linux, so Windows PowerShell/NTFS tests
cannot be certified here. The database path and recovery cycle were tested on
a disposable local PostgreSQL cluster. No WSL or infrastructure change is needed
for the prepared Windows launcher; Windows platform validation remains required.

## Minimum preparation (your existing isolated worktree)

1. Copy the reviewed tooling patch into the worktree root. Keep its existing
   dependency installation. Node 22.21.1/npm 10.9.4 meet the requirements. Use
   ordinary, non-elevated PowerShell in Windows Terminal, with no recording or
   transcription. Do not weaken execution policy: sign scripts if organizational
   policy requires it. Downloaded files may need an approved, per-file unblock
   after review; do not apply a blanket policy bypass.
2. From that worktree, run the native local-only checks (no database involved):

   ```powershell
   node --import tsx --test tests/windows-recovery.test.ts
   & .\scripts\recover-superadmin-windows.ps1 -Action self-test
   ```

   Expected: three Windows tests pass; the one Linux-only test skips. The first
   test parses the two PowerShell files without executing recovery. The others
   check real NTFS owner-only ACLs, encryption/read-back/overwrite protection,
   rejection of extra ACL principals, and removal of inherited environment
   overrides. Self-test asks only for a temporary TEST phrase twice. Do not use
   production credentials; confirm no characters appear. Repeat self-test and
   cancel with Ctrl-C; ordinary terminal echo must return afterward.
3. Review/confirm the already verified exact account ID and the Neon production
   direct endpoint, database, and approved database identity independently. The
   tool does not discover an account by email or select the first superadmin.
   Check existing database triggers/auditing separately: bind parameters must
   not be logged, and no trigger may change unrelated data. Those external
   properties have not been verified from this workstation.

If any native check fails, stop. Do not replace ACL checks with chmod, weaken
TLS, or change Windows execution policy to force the command through. For
complete native integration qualification, repeat recover/verify/rollback
against a disposable LOCAL PostgreSQL fixture, never an application database.
The guarded database core has already passed that cycle on Linux, but its
Windows terminal/driver integration has not been exercised here.

## Future authorized recovery: one command

The following is for a separately authorized live operation only. It has not
been executed by this preparation task. Use the exact approved account ID:

```powershell
& .\scripts\recover-superadmin-windows.ps1 `
  -AccountId 'EXACT_APPROVED_ACCOUNT_ID' -Apply -AllowRemote
```

The launcher prints the encrypted backup path, automatically creating a new
private directory under LOCALAPPDATA on local fixed NTFS. Keep that path. It
removes inherited NODE_*, PG*, DATABASE_URL, and DOTENV_* variables before
starting native Node, restoring the parent shell's variables afterward.

At the hidden prompts, supply the approved complete PostgreSQL connection URL
with explicit username/password and `sslmode=verify-full`. Only sslmode and
channel_binding query keys are accepted. Never paste the URL or passwords into
a PowerShell command, environment variable, source file, log, or chat. Verify
the non-secret host/port/database/ID displayed before typing its confirmation.
Then enter the new password twice and an independent backup passphrase twice.
Use a password manager: new password at least 16 characters and at most 72 UTF-8
bytes; independent backup passphrase at least 20 characters and at most 1024
UTF-8 bytes. The launcher rejects missing mutation approval and prints no secret.

The existing bcrypt helper (cost 12) is reused. The exact-ID record is locked,
its SUPER_ADMIN role checked, and an AES-256-GCM/scrypt backup flushed, read
back, and authenticated BEFORE updating. The parameterized transaction sets
only passwordHash, confirms exactly one row, reads back the stored hash, and
checks bcrypt before commit. A separate read-only verification follows commit.
Success is reported only after that verification. Email, account ID, role,
permissions, reset-token fields, and updatedAt are not part of the update.

This uses Windows ACLs and FlushFileBuffers, not POSIX UID/mode/directory flags.
There is no claim that a Windows power-loss/crash durability test has been run.
Keep backup storage durable and the workstation powered through verification.

## Only if needed: read-only verify or guarded rollback

After an uncertain outcome, do not blindly repeat recovery. Verify first:

```powershell
& .\scripts\recover-superadmin-windows.ps1 `
  -Action verify -AccountId 'EXACT_APPROVED_ACCOUNT_ID' -AllowRemote
```

Rollback requires separate authorization, the printed ORIGINAL backup path,
the same database target, and its independent passphrase:

```powershell
& .\scripts\recover-superadmin-windows.ps1 `
  -Action rollback -AccountId 'EXACT_APPROVED_ACCOUNT_ID' `
  -BackupFile 'C:\exact\original\rollback.enc' -Apply -AllowRemote
```

Rollback refuses another account/database, a role change, a later password
change, wrong passphrase, tampering, or backup with unsafe ACLs. Only the previous
hash is restored. This restores the old state, not a guaranteed working old
password. Keep the backup/passphrase separately through the approved retention
window; do not commit or display either.

## Security limits

- Existing sessions/JWTs and reset tokens remain valid. Token revocation is a
  different change requiring separate approval; assess outstanding reset links.
- BitLocker is not required to decrypt/use the tool's already encrypted archive,
  but without full-device encryption, process memory, pagefile/hibernation, and
  dumps remain a risk. The independent backup passphrase must be strong and
  stored separately. ACLs do not stop an administrator or offline disk access.
  Use a trusted, appropriately protected workstation; archive encryption alone
  cannot certify a compromised or physically exposed workstation as safe.
- Windows PowerShell 5.1 (the OS-provided helper), local NTFS, current-user ACL
  ownership, and a functioning TTY are required. Redirected/CI sessions, network
  shares, reparse-point paths, and non-NTFS backup storage are refused.
- TLS certificate verification remains enabled. If certificate validation fails,
  stop and resolve approved trust configuration; do not set a TLS bypass.
- No automatic migration, seed, endpoint, deployment, or production-secret
  configuration is added. No push or commit is part of this preparation.
