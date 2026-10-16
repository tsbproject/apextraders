# Northflank staging

Target project: `apextraders`; service: `apextraders-staging`; repository branch:
`feature/tournament-management-backend`.

- Use Node.js 22.12 or later in the 22.x series (Prisma 7 requirement).
- Install with `npm ci` including development dependencies for the build, then
  run `npm run build`. The build generates Prisma Client without a database URL
  and does not run migrations or connect to PostgreSQL.
- Start with `npm run start`. `tsx` is a runtime dependency. Express and Socket.IO
  share the HTTP server, which binds to `0.0.0.0` and reads `PORT` (default 3001).
- Configure the service's HTTP port and `PORT` as `3001`; health check:
  `GET /api/health`. This checks the HTTP server, not database connectivity.
- Supply `DATABASE_URL` **at runtime**, securely, from the Neon **testing**
  database, retaining Neon's TLS parameters (such as `sslmode=require`). The
  Prisma 7 PostgreSQL driver adapter uses this URL unchanged. Do not use the
  production database or disable TLS verification.
- Supply a staging `JWT_SECRET` at runtime. Set `ALLOWED_ORIGINS` and `CLIENT_URL`
  to the staging frontend origin for HTTP CORS and Socket.IO respectively.
- Password recovery additionally uses `RESEND_API_KEY`, `RESET_EMAIL_FROM`, and
  `FRONTEND_URL`. Supply these only if testing email recovery.
- Database migrations are a separate, explicitly targeted operation. Neither
  build nor startup runs migrations or seed scripts. This fix does not change
  database schema, database contents, or Northflank service settings.

Regression check: `node --import tsx --test tests/prisma-config.test.mjs`.
Run `npm run build` with `DATABASE_URL` unset and dotenv file loading disabled
(`DOTENV_CONFIG_PATH=/dev/null` on Linux) to verify a credential-free build.
The build's existing plain `tsc` command does not traverse referenced projects;
run `npx tsc -p tsconfig.app.json --noEmit` and
`npx tsc -p server/tsconfig.json --noEmit` for their separate diagnostics.
