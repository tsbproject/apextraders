import { PrismaClient, Role } from '../generated/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

// ==========================================
// DATABASE CONFIGURATION
// ==========================================

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error(
    'DATABASE_URL is not configured. Add DATABASE_URL to the server environment.'
  );
}

// ==========================================
// PRISMA CLIENT FACTORY
// ==========================================

const createPrismaClient = () => {
  const pool = new pg.Pool({
    connectionString: DATABASE_URL,

    // Keep a reasonable pool size during development.
    max: 10,

    idleTimeoutMillis: 30_000,

    connectionTimeoutMillis: 10_000,
  });

  const adapter = new PrismaPg(pool);

  return new PrismaClient({
    adapter,
  });
};

// ==========================================
// GLOBAL SINGLETON
// ==========================================

declare global {
  var prismaGlobal:
    | ReturnType<typeof createPrismaClient>
    | undefined;
}

/**
 * Reuse Prisma during development reloads.
 *
 * Prevents repeatedly creating PostgreSQL pools
 * when the development server restarts/reloads.
 */
const prisma =
  globalThis.prismaGlobal ??
  createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalThis.prismaGlobal = prisma;
}

// ==========================================
// EXPORTS
// ==========================================

export {
  prisma,
  Role,
};

export default prisma;