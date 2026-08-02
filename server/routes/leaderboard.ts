// server/routes/leaderboard.ts

import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// ==========================================
// TYPES
// ==========================================

type LeaderboardTier =
  | 'BRONZE'
  | 'SILVER'
  | 'GOLD'
  | 'DIAMOND';

interface LeaderboardEntryDTO {
  id: string;
  userId: string;
  tournamentId: string;
  username: string;
  totalPnL: number;
  currentBalance: number;
  startingBalance: number;
  tradeCount: number;
  avatar: string;
  rankTier: LeaderboardTier;
  rank: number;
}

// ==========================================
// HELPERS
// ==========================================

const calculateLeaderboardTier = (
  pnlPercentage: number
): LeaderboardTier => {
  if (pnlPercentage >= 50) {
    return 'DIAMOND';
  }

  if (pnlPercentage >= 20) {
    return 'GOLD';
  }

  if (pnlPercentage >= 5) {
    return 'SILVER';
  }

  return 'BRONZE';
};

// ==========================================
// GET LEADERBOARD
// GET /api/leaderboard
// Public route
// ==========================================

router.get(
  '/',
  async (
    _req: Request,
    res: Response
  ) => {
    try {
      const participants =
        await prisma.participant.findMany({
          orderBy: {
            pnlPercentage: 'desc',
          },

          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatarUrl: true,
              },
            },

            tournament: {
              select: {
                id: true,
                title: true,
                status: true,
              },
            },
          },

          take: 10,
        });

      const leaderboard: LeaderboardEntryDTO[] =
        participants.map(
          (participant, index) => {
            const pnlValue = Number(
              participant.pnlPercentage ?? 0
            );

            const startingBalance = Number(
              participant.startingBalance
            );

            const currentBalance = Number(
              participant.currentBalance
            );

            const username =
              participant.user?.username ||
              `Trader_${participant.userId.slice(-4)}`;

            const rankTier =
              calculateLeaderboardTier(
                pnlValue
              );

            const avatar =
              participant.user?.avatarUrl ||
              `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
                username
              )}`;

            return {
              id: participant.id,
              userId: participant.userId,
              tournamentId:
                participant.tournamentId,

              username,

              totalPnL: pnlValue,

              startingBalance,
              currentBalance,

              // Temporary until we connect
              // leaderboard trade statistics.
              tradeCount: 0,

              avatar,

              rankTier,

              // Rank is derived from sorted result.
              rank: index + 1,
            };
          }
        );

      return res.status(200).json(
        leaderboard
      );
    } catch (error: unknown) {
      console.error(
        'Leaderboard Fetch Error:',
        error
      );

      return res.status(500).json({
        message:
          'Failed to fetch leaderboard.',
      });
    }
  }
);

export default router;