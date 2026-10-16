# TypeScript cleanup validation

Branch: `fix/typescript-cleanup`, based on
`26b5851284386ad9ab94f7254554db5c2df44c7f`.

## Changes

- Add the existing schema's nullable `realizedPnl` to the frontend trade DTO,
  accepting Prisma Decimal JSON strings as well as numbers.
- Preserve exact role matching in ProtectedRoute using an equality predicate;
  legacy `SUPERADMIN` is still rejected when `SUPER_ADMIN` is required.
- Type Quidax candle array values as `unknown[]`, preserving both upstream
  formats and the existing numeric validation, response, and sorting.
- Give tournament enrollment an explicit request body whose ID is `unknown`
  until the existing runtime string validation narrows it.
- Express tournament settlement's ACTIVE/PAUSED restriction as equivalent
  comparisons, avoiding a narrower inferred array element type.
- Complete the unmounted admin backup's status table with terminal CANCELLED.
- Use the existing generated Prisma types and adapter-backed singleton in the
  unmounted legacy auth controller and leaderboard helper. Correct the legacy
  controller's missing auth import and use `AuthenticatedRequest` instead of
  an `any` cast. Read its balance from Wallet, matching the schema; preserve
  its existing missing-wallet fallback and keep the nested wallet out of the
  response. Mounted authentication routes are unchanged.
- Replace the invalid TypeScript 6 deprecation setting in the server config
  with ESNext/bundler module resolution, matching the existing tsx runtime.
  Strict checking remains enabled.
- Make root `tsc` check application, server, Prisma config, and Vite config
  sources. Previously the empty root project checked no source files.
  The root inherits the existing application's no-emit settings, so the
  existing build now performs a real type check without emitting server JS.

No schema, migrations, secret files, dependency versions, deployment settings,
frontend layout, or active trading algorithms were changed. Generated client
files are regenerated for checks in the runtime copy, not committed.

## Commands and results

Validated with Node 22.23.3, TypeScript 5.9.3, and Prisma 7.9.1. Run Prisma
Client generation before checking a fresh checkout: the checked-in generated
client is older than the current schema. No database connection is needed.

| Command | Result |
| --- | --- |
| `npx prisma generate` without DATABASE_URL or dotenv file loading | Passed |
| `npx tsc --noEmit` | Passed, now checks source |
| `npx tsc -p tsconfig.app.json --noEmit` | Passed |
| `npx tsc -p tsconfig.node.json --noEmit` | Passed |
| `npx tsc -p server/tsconfig.json --noEmit` | Passed |
| `node --import tsx --test tests/*.test.mjs` | 6 passed, 0 failed/skipped |
| `npm run build` without DATABASE_URL or dotenv file loading | Passed |
| `npm run start`, production-mode local HTTP/database smoke check | Passed |
| `git diff --check` | Passed |

The regression tests cover credential-free Prisma config loading, preserving a
supplied URL, role access decisions, both Quidax candle formats and invalid
input, legacy auth wallet mapping, and leaderboard Decimal aggregation. The
local database smoke check covered health, registration, login, session,
tournament lists, leaderboard, and trade open/close with 10% PnL. It applied
existing migrations only to a newly created disposable local database and
removed that database afterward. It did not contact Neon or production.
Quidax parsing tests use fixtures; live exchange availability and browser visual
regressions were not tested. Vite still reports its existing dependency
`use client` directive and large-chunk warnings; these do not fail the build.

## Diagnostics captured

Complete command output is retained in this task at
`/workspace/typescript-cleanup-results/`: `before-*.log`, `after-*.log`,
`prisma-generate.log`, `build.log`, `tests.log`, and `integration.log`.

Initial checks: client 10 errors; server rejected the invalid deprecation
setting; root and Vite config passed (root checked no source). Expanding the
server check exposed 32 errors, of which 18 disappeared after regenerating
Prisma Client from the existing schema. The remaining 14 server diagnostics
concerned obsolete client/auth imports, the incomplete enum table, enum
narrowing, unknown candle rows, and the unknown enrollment body. Fixing the
legacy imports then exposed outdated User balance accesses, corrected to the
existing Wallet relation. All final TypeScript checks are clean.

The first new test run passed 4 tests and failed 2 because Node's method mock
helper could not intercept lazy Prisma Proxy methods. The test harness was
corrected to replace and restore those methods directly; all 6 then passed.

No push, merge, or deployment is part of this cleanup.
