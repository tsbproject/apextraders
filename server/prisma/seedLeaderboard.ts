import prisma from '../lib/prisma';

async function seed() {
  console.log('🌱 Fetching existing users and seeding leaderboard...');

  const now = new Date();
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  // 1. Ensure active tournament exists
  const tournament = await prisma.tournament.upsert({
    where: { id: 'weekly-apex-challenge' },
    update: {},
    create: {
      id: 'weekly-apex-challenge',
      title: 'Weekly Apex Challenge',
      status: 'ACTIVE',
      startDate: now,
      endDate: nextWeek,
    },
  });

  // 2. Fetch all existing users in the database (including your SUPER_ADMIN)
  const existingUsers = await prisma.user.findMany();

  if (existingUsers.length === 0) {
    console.warn('⚠️ No existing users found in DB. Please ensure your database is seeded with users first.');
    return;
  }

  // Sample PnL percentages to distribute across existing users
  const pnlList = [64.5, 38.2, 22.8, 14.1, 8.45, 3.2, -2.5];

  // 3. Link existing users (SUPER_ADMIN, etc.) as participants
  for (let i = 0; i < existingUsers.length; i++) {
    const user = existingUsers[i];
    const pnlPercentage = pnlList[i % pnlList.length];

    await prisma.participant.upsert({
      where: { id: `participant_${user.id}` },
      update: {
        pnlPercentage,
        tournamentId: tournament.id,
      },
      create: {
        id: `participant_${user.id}`,
        userId: user.id,
        tournamentId: tournament.id,
        pnlPercentage,
      },
    });

    console.log(`✅ Seeded participant for user: ${user.username} (${user.role || 'USER'}) with PnL ${pnlPercentage}%`);
  }

  console.log('🏆 Leaderboard populated successfully with your real database users!');
}

seed()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });