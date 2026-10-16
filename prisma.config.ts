import { defineConfig } from 'prisma/config';
import 'dotenv/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    seed: 'npx tsx server/prisma/seed.ts',
  },
  datasource: {
    // Client generation does not connect to a database. Database commands and
    // the API still require DATABASE_URL to be supplied at runtime.
    url: process.env.DATABASE_URL,
  },
});
