# One-time SUPER_ADMIN recovery (preparation only)

For the separately prepared native Windows launcher and current validation
limits, see [Windows instructions](windows-superadmin-recovery.md). The POSIX
commands and filesystem requirements below describe the original Linux path.

Prepared from production revision
`fa72f012040b3e5f7fabaa35c5b04f21c33460f6` on
`fix/secure-superadmin-recovery`. No live recovery is authorized by this work.
No Neon/staging connection, migration, push, merge, or deployment was performed.

## Files and behavior

- `scripts/recover-superadmin.ts`: interactive recover/verify/rollback CLI.
- `scripts/lib/superadmin-recovery.ts`: transactional database operations and
  authenticated encrypted backups.
- `server/lib/password.ts`: existing bcrypt helpers moved here unchanged
  (bcryptjs, random salt, cost 12).
- `server/lib/auth.ts`: re-exports those helpers; existing auth imports and
  behavior remain compatible. Recovery does not need JWT configuration.
- `scripts/tsconfig.json`: strict standalone check of the CLI, library, and
  integration tests. The script is not part of any startup/build hook or route.
- `tests/superadmin-recovery.test.ts`: crypto/filesystem and local DB tests.
- `tests/superadmin-recovery-tty.test.py`: real terminal tests.
- `tests/run-superadmin-recovery.mjs`: guarded local-only test orchestrator.

Only the supplied exact ID is selected; there is no account discovery by role,
email, or username. Under a row lock, the script verifies SUPER_ADMIN and writes
exactly one `public.users.passwordHash` using parameterized SQL. It deliberately
does not use Prisma's User update, which would also change `updatedAt`.
Role, permissions, email, ID, reset-token fields, timestamps, and wallet data
are untouched. No user/schema/migration/secret/deployment setting changes are
part of the patch. No public recovery endpoint is added.

The previous hash is held internally and written ONLY in an encrypted backup
(AES-256-GCM with a random IV and a scrypt-derived key, random salt, fixed KDF
cost). The backup also binds to the confirmed host/port/database, exact ID, and
a SHA-256 fingerprint of the replacement hash. Neither old nor new hash is
printed. The file is created exclusively with mode 0600, without following a
file symlink. File and directory are fsynced before the SQL update/commit. The
CLI requires an existing operator-owned private directory (0700), refuses
backup overwrite, and refuses permissive/unowned backup files on rollback.

## Future operator prerequisites — obtain separate authorization first

These are instructions for a later, explicitly approved operation. Do not run
against production or staging merely to test the tool.

1. Obtain separate approval for the exact account ID and database target. Verify
   that ID through the authorized administrative record; do not infer it from
   an email, choose the first SUPER_ADMIN, or share credentials/hashes in chat.
2. Use a trusted Linux/POSIX administrative workstation with Node 22.12+ in the
   22.x series, an unrecorded interactive terminal, and durable protected disk.
   Do not rely on an ephemeral service/container filesystem for the backup.
   Do not use session recording, `script`, CI, input logging, or redirected I/O.
3. Review the source diff against the specified production revision. Install
   this reviewed copy's dependencies with `npm ci --include=dev`; this avoids
   production-mode omission of type/build packages. No production URL is needed
   for installation, `npx prisma generate`, or type checks. Do not run seeds or
   migrations. Use a reviewed copy containing this patch, not an unmodified
   production image whose script is absent.
4. Obtain the approved direct database connection through the secure secret
   channel. Never put it in commands, files, shell history, or logs. The CLI
   intentionally ignores DATABASE_URL and dotenv and asks for a hidden URL.
   Remote URLs require `sslmode=verify-full` and `--allow-remote`; CA/TLS
   verification must succeed. Accepted URL query keys are only sslmode and
   channel_binding; routing overrides and duplicates are rejected. Prefer
   the direct Neon endpoint for this one-time interactive transaction.
5. Database privileges must permit SELECT/UPDATE on the target user record.
   Verify existing DB-side triggers and query/bind-parameter auditing will not
   change unrelated data or log password hashes; the script cannot control
   server-side auditing. It requests a 5-second lock timeout and 15-second
   statement timeout. It does not retry mutations automatically.
6. Use a password manager to prepare a unique new password (at least 16
   characters, no line breaks/NUL, at most 72 UTF-8 bytes to avoid bcrypt
   truncation). Prepare a separate strong backup passphrase (at least 20
   characters, at most 1024 UTF-8 bytes). Store that passphrase securely and
   separately from the encrypted backup. Losing it prevents this rollback.

## Exact future recovery commands

Replace the non-secret ID and directory placeholders with approved values.
Neither the database URL nor any password/passphrase belongs in an argument.
The backup path must be a NEW file on durable storage in the private directory.

```sh
cd /path/to/reviewed/apextraders
set +x
ulimit -c 0
ACCOUNT_ID='EXACT_ACCOUNT_ID_FROM_APPROVED_RECORD'
BACKUP_DIR='/absolute/durable/private/recovery-directory'
mkdir -m 700 "$BACKUP_DIR"
# If this already exists, inspect its ownership/0700 permissions; do not widen them.
BACKUP_FILE="$BACKUP_DIR/superadmin-recovery.enc"
node --import tsx scripts/recover-superadmin.ts recover \
  --account-id "$ACCOUNT_ID" --backup "$BACKUP_FILE" --apply --allow-remote
```

The CLI prompts for the connection URL without echoing it, displays only
host/port/database and the supplied ID, and requires an exact typed confirmation
such as `RECOVER <id> <host>:<port>/<database>`. Check those non-secret fields
against the authorization before confirming. It then prompts for the new
password twice and the independent backup passphrase twice, all without echo.
Ctrl-C or Ctrl-D cancels and restores terminal mode. Pipes/redirects are refused.
No database connection is opened until these prompts are complete.

Success explicitly reports one committed update and an encrypted backup. A
missing ID, wrong role, invalid existing bcrypt format, already-matching
password, backup error, or wrong row count aborts. Pre-commit errors roll back.
Do not rerun with a different ID if it fails; investigate the authorization and
safe error category. Never print an exception object or a database URL/hash.

## Verification (read-only)

After a separately authorized recovery, invoke the read-only verifier:

```sh
node --import tsx scripts/recover-superadmin.ts verify \
  --account-id "$ACCOUNT_ID" --allow-remote
```

Supply the same target URL through its hidden prompt, type the VERIFY target
confirmation, and enter the new password at its hidden prompt. This checks the
exact ID, SUPER_ADMIN role, and bcrypt comparison within a read-only transaction.
It issues no JWT and changes no data. Success prints only a match confirmation.
The account owner may subsequently perform the normal browser login and check
admin access. Do not capture or share browser passwords/tokens.

## Guarded rollback

If rollback is explicitly authorized, use the SAME database identity, exact ID,
original encrypted backup, and its independent passphrase:

```sh
node --import tsx scripts/recover-superadmin.ts rollback \
  --account-id "$ACCOUNT_ID" --backup "$BACKUP_FILE" --apply --allow-remote
```

This authenticates/decrypts the file internally, verifies its account/database
binding, locks the user row, rechecks SUPER_ADMIN, and refuses unless the current
hash matches the recovered-hash fingerprint. It then restores ONLY the prior
passwordHash and requires exactly one row. A subsequent password reset/change,
role change, wrong target, wrong passphrase, tampering, or a second rollback
fails closed. This restores the old state; it does not make an unknown or
previously failing old password usable. No broad database restore is needed.

Keep the backup and independent passphrase through the approved verification
window. Delete them under the operator's secure retention policy afterward;
ordinary deletion is not guaranteed secure erasure on snapshots/SSDs. Do not
commit, upload, email, or display the backup contents/passphrase.

## Commit uncertainty and scope limits

A connection loss during COMMIT can leave an unknown outcome. Keep the backup
and use the read-only verifier before deciding whether to retry or roll back.
The guarded rollback refuses to overwrite an unrelated later password. An
artifact from an uncommitted attempt cannot be replayed against the old hash.

Existing JWTs remain valid. Existing password-reset tokens are not cleared and
could still change the password until they expire (normally 30 minutes). This
is intentional to honor the passwordHash-only requirement. Before any future
live operation, assess outstanding reset requests; token/session revocation
would require separate authorization and is not implemented here. Password
strings exist briefly in process memory; JavaScript cannot guarantee their
zeroization. Run the one-off process on the trusted host and exit afterward.

## Local test reproduction

No production credentials are needed. Prepare a NEW empty disposable PostgreSQL
database bound only to 127.0.0.1 with a name starting `apex_recovery_test_`.
The runner refuses other hosts/names or URL query parameters. Do not point it at
an existing application database: it creates local fixture tables without
running migrations. It requires Node 22, project dependencies, and Python 3.

Enter the disposable LOCAL connection URL without echoing it:

```sh
set +x
IFS= read -r -s -p 'Disposable local test database URL: ' RECOVERY_TEST_DATABASE_URL
printf '\n'
export RECOVERY_TEST_DATABASE_URL
node --import tsx tests/run-superadmin-recovery.mjs
unset RECOVERY_TEST_DATABASE_URL
```

Dispose of that scratch database/cluster afterward. Running the individual
Node test suite without the variable intentionally skips the DB integration
part; that alone does not validate recovery. In this task all integration
checks ran with no skips on a newly created local PostgreSQL 18 cluster. The
cluster and its randomly generated credentials were destroyed after testing.

In this prepared workspace, the isolated bootstrap used for verification can
also be rerun with:

```sh
/workspace/apextraders-tools/node_modules/node/bin/node /workspace/apextraders-tools/test-recovery.mjs
```

That helper is local test tooling, not part of the application or production
installation. It creates a fresh cluster, runs the committed test orchestrator,
and removes the cluster. It never uses the environment's DATABASE_URL.

## Validation in this task

- Node 22, existing bcryptjs implementation/cost, real isolated PostgreSQL.
- 21 Node tests passed, 0 failed, 0 skipped, including the existing regressions.
- Real pseudo-terminal recovery, verify, and rollback passed; secret input did
  not appear in captured terminal output. Echo restoration, Ctrl-C cancellation,
  wrong confirmation/password confirmation, routing overrides, insecure remote
  TLS, and redirected input were tested. Remote guard tests reject before any
  network connection; no remote database was contacted.
- The complete targeted fixture, including its original hash, was identical
  after rollback. Other user fields (including updatedAt and reset fields),
  other accounts, and wallet data remained unchanged during recovery.
- Missing/wrong-role account, zero-row update, backup failure, encrypted-backup
  tampering/wrong passphrase/unsafe permissions/overwrite, wrong rollback
  account/database, repeat rollback, later password change, and concurrent
  demotion all fail closed.
- Script/library/tests strict TypeScript check, root/client/server/Vite checks,
  and credential-free production build passed. Existing Vite warnings remain.
- No live recovery, login, database access, infrastructure change, migration,
  push, merge, or deployment was performed.

Logs: `/workspace/superadmin-recovery-results/`. They contain test results and
build diagnostics, never credentials, password hashes, or recovery tokens.
