import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const prismaClientSingleton = () => {
  // 1. Create the connection pool
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  
  // 2. Create the adapter
  const adapter = new PrismaPg(pool);
  
  // 3. Pass the adapter to the client (Required in Prisma 7)
  return new PrismaClient({ adapter });
};

declare global {
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma;