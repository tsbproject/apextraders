import { PrismaClient, Role, RankTier } from '../generated/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Starting database seed script...');

  // 1. Password Hashing Helper
  const hashPassword = async (password: string) => {
    const salt = await bcrypt.genSalt(12);
    return bcrypt.hash(password, salt);
  };

  // 2. Super Admin Credentials from Env or Defaults
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'superadmin@apextraders.com';
  const superAdminUsername = process.env.SUPER_ADMIN_USERNAME || 'superadmin';
  const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD || 'ApexSuperSecret2026!';

  const hashedSuperPassword = await hashPassword(superAdminPassword);

  // 3. Upsert Super Admin User
  const superAdmin = await prisma.user.upsert({
    where: { email: superAdminEmail },
    update: {
      role: Role.SUPER_ADMIN,
      rankTier: RankTier.ELITE,
    },
    create: {
      email: superAdminEmail,
      username: superAdminUsername,
      passwordHash: hashedSuperPassword,
      role: Role.SUPER_ADMIN,
      rankTier: RankTier.ELITE,
      bio: 'System Administrator & Platform Overseer',
      wallet: {
        create: {
          balance: 100000.00,
        },
      },
    },
  });

  console.log(`✅ Super Admin created/verified: ${superAdmin.email} (Role: ${superAdmin.role})`);

  // 4. Create Demo Regular Trader User
  const demoUserEmail = 'demo@apextraders.com';
  const demoUserPassword = await hashPassword('TraderDemo2026!');

  const demoUser = await prisma.user.upsert({
    where: { email: demoUserEmail },
    update: {},
    create: {
      email: demoUserEmail,
      username: 'DemoTrader1',
      passwordHash: demoUserPassword,
      role: Role.USER,
      rankTier: RankTier.BRONZE,
      bio: 'Trading my way to the top of Apex Leaderboard.',
      wallet: {
        create: {
          balance: 25400.00,
        },
      },
    },
  });

  console.log(`✅ Demo Trader created/verified: ${demoUser.email}`);

  // 5. Seed Initial Global Tournament
  const existingTournament = await prisma.tournament.findFirst({
    where: { status: 'ACTIVE' },
  });

  if (!existingTournament) {
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const tournament = await prisma.tournament.create({
      data: {
        title: 'Apex Genesis Grand Prix 2026',
        description: 'Compete with global traders to yield the highest PnL and claim the $50,000 prize pool.',
        startDate: now,
        endDate: thirtyDaysFromNow,
        prizePool: 50000.00,
        status: 'ACTIVE',
      },
    });

    console.log(`🏆 Initial Active Tournament created: "${tournament.title}"`);
  }

  console.log('✨ Seed completed successfully.');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });