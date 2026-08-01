// Replace: import { PrismaClient } from '@prisma/client';
// With the generated client output path:
import { PrismaClient, Role } from '../generated/client'; 
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const prismaClientSingleton = () => {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
};

declare global {
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

export { prisma, Role };
export default prisma;

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma;