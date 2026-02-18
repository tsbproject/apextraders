import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Recalculates and updates a user's tournament standing.
 * Ensures Decimal types are safely converted to Numbers for the UI.
 */
export const syncUserLeaderboardStats = async (userId: string, tournamentId: string): Promise<void> => {
  try {
    // 1. Aggregate stats restricted to the SPECIFIC tournament
    const stats = await prisma.trade.aggregate({
      where: { 
        userId,
        tournamentId, // Crucial: only sync trades for this specific competition
        status: 'CLOSED' 
      },
      _sum: {
        pnlPercentage: true
      },
      _count: {
        id: true
      }
    });

    const tradeCount: number = stats._count.id;
    if (tradeCount === 0) return;

    // 2. Safe Decimal Conversion
    // We use Prisma.Decimal to check the type correctly
    const rawSum = stats._sum.pnlPercentage;
    let totalPnL = 0;

    if (rawSum instanceof Prisma.Decimal) {
      totalPnL = rawSum.toNumber();
    } else if (typeof rawSum === 'number') {
      totalPnL = rawSum;
    }

    // 3. Tier Assignment Logic
    let rankTier: "BRONZE" | "SILVER" | "GOLD" | "DIAMOND" = "BRONZE";

    if (totalPnL >= 50) rankTier = "DIAMOND";
    else if (totalPnL >= 20) rankTier = "GOLD";
    else if (totalPnL >= 5) rankTier = "SILVER";

    // 4. Atomic Update
    // We use the unique compound index if available, or updateMany for safety
    await prisma.participant.updateMany({
      where: { 
        userId,
        tournamentId
      },
      data: {
        pnlPercentage: totalPnL,
        // If you add a rankTier field to your Participant model later, update it here
      }
    });

    console.log(`[Sync Success] User: ${userId} | Tournament: ${tournamentId} | PnL: ${totalPnL.toFixed(2)}% | Tier: ${rankTier}`);
    
  } catch (err) {
    console.error("[Sync Error] Failed to update leaderboard stats:", err);
    throw err; // Re-throw if you want the API route to handle the error response
  }
};