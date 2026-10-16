import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import test from 'node:test';

// These tests mock all database operations and never contact PostgreSQL.
process.env.DATABASE_URL = 'postgresql://localhost:55432/typescript_tests';
process.env.JWT_SECRET = randomBytes(32).toString('hex');
const { default: prisma } = await import('../server/lib/prisma.ts');
const { Prisma } = await import('../server/generated/client/index.js');
const { hashPassword, verifyToken } = await import('../server/lib/auth.ts');
const { login, getMe } = await import('../server/controllers/auth.ts');
const { syncUserLeaderboardStats } = await import('../server/lib/leaderboard-sync.ts');

function response() {
  return { code: undefined, body: undefined,
    status(code) { this.code = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

// Prisma delegates expose lazy methods through a Proxy rather than method
// descriptors, so replace the callable directly and restore it after each test.
function stub(t, delegate, name, implementation) {
  const original = delegate[name];
  const replacement = t.mock.fn(implementation);
  delegate[name] = replacement;
  t.after(() => { delegate[name] = original; });
  return replacement;
}

test('legacy auth reads wallet balance without leaking wallet data', async (t) => {
  const password = randomBytes(16).toString('hex');
  const user = { id: 'test-user', username: 'Test', email: 'test@example.test',
    role: 'USER', rankTier: 'BRONZE', passwordHash: await hashPassword(password),
    wallet: { balance: new Prisma.Decimal('123.45') } };
  const query = stub(t, prisma.user, 'findUnique', async () => user);
  const loggedIn = response();
  await login({ body: { email: user.email, password } }, loggedIn);
  assert.equal(loggedIn.code, 200);
  assert.equal(loggedIn.body.user.demoBalance, 123.45);
  assert.equal(verifyToken(loggedIn.body.token).id, user.id);
  assert.equal(query.mock.calls[0].arguments[0].include.wallet, true);

  query.mock.mockImplementation(async () => ({ id: user.id, role: user.role, wallet: user.wallet }));
  const session = response();
  await getMe({ user: { id: user.id } }, session);
  assert.equal(session.code, 200);
  assert.equal(session.body.user.demoBalance, 123.45);
  assert.equal('wallet' in session.body.user, false);
  const unauthenticated = response();
  await getMe({}, unauthenticated);
  assert.equal(unauthenticated.code, 401);
});

test('leaderboard sync uses the adapter-backed singleton and retains Decimal aggregation', async (t) => {
  stub(t, prisma.trade, 'aggregate', async () => ({
    _sum: { pnlPercentage: new Prisma.Decimal('12.5') }, _count: { id: 2 },
  }));
  const update = stub(t, prisma.participant, 'updateMany', async () => ({ count: 1 }));
  await syncUserLeaderboardStats('test-user', 'test-tournament');
  assert.deepEqual(update.mock.calls[0].arguments[0], {
    where: { userId: 'test-user', tournamentId: 'test-tournament' },
    data: { pnlPercentage: 12.5 },
  });
});
