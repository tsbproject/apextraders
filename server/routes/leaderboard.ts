// import { Router, Request, Response } from 'express';
// import prisma from '../lib/prisma';

// const router = Router();

// // ==========================================
// // Explicit Interfaces (Strict Mode)
// // ==========================================

// export interface LeaderboardDTO {
//   id: string;
//   username: string;
//   totalPnL: number;
//   tradeCount: number;
//   avatar: string;
//   rankTier: string;
// }

// export interface ApiErrorResponse {
//   message: string;
// }

// // Helper to safely convert Prisma Decimal/null values to standard numbers
// const parseNumber = (val: unknown): number => {
//   if (typeof val === 'number') return val;
//   if (val && typeof val === 'object' && 'toNumber' in val && typeof (val as { toNumber: () => number }).toNumber === 'function') {
//     return (val as { toNumber: () => number }).toNumber();
//   }
//   return 0;
// };

// // ==========================================
// // Leaderboard Endpoint
// // ==========================================

// /**
//  * GET /api/leaderboard
//  * Fetch top 10 traders ordered by highest PnL percentage.
//  */
// router.get(
//   '/',
//   async (
//     _req: Request,
//     res: Response<LeaderboardDTO[] | ApiErrorResponse>
//   ): Promise<void> => {
//     try {
//       // 1. Fetch participants sorted by PnL
//       const leaderboard = await prisma.participant.findMany({
//         orderBy: {
//           pnlPercentage: 'desc',
//         },
//         take: 10,
//       });

//       // 2. Transform data into type-safe DTOs
//       const formattedData: LeaderboardDTO[] = leaderboard.map((p) => {
//         const pnlValue = parseNumber(p.pnlPercentage);

//         // Dynamic Tier Threshold Logic
//         let tier = 'BRONZE';
//         if (pnlValue >= 50) tier = 'DIAMOND';
//         else if (pnlValue >= 20) tier = 'GOLD';
//         else if (pnlValue >= 5) tier = 'SILVER';

//         return {
//           id: p.id,
//           username: `Trader_${p.userId.slice(-4)}`,
//           totalPnL: pnlValue,
//           tradeCount: 5, // Placeholder until trade aggregation is linked
//           avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.userId}`,
//           rankTier: tier,
//         };
//       });

//       res.status(200).json(formattedData);
//     } catch (err: unknown) {
//       console.error('Leaderboard Fetch Error:', err);
//       res.status(500).json({ message: 'Failed to fetch leaderboard' });
//     }
//   }
// );

// export default router;





// server/routes/leaderboard.ts
import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    const leaderboard = await prisma.participant.findMany({
      orderBy: {
        pnlPercentage: 'desc',
      },
      include: {
        user: {
          select: {
            username: true,
            role: true,
          },
        },
      },
      take: 10,
    });

    const formattedData = leaderboard.map((p) => {
      const pnlValue =
        typeof p.pnlPercentage === 'object' && p.pnlPercentage !== null && 'toNumber' in p.pnlPercentage
          ? (p.pnlPercentage as unknown as { toNumber(): number }).toNumber()
          : Number(p.pnlPercentage ?? 0);

      let tier = 'BRONZE';
      if (pnlValue >= 50) tier = 'DIAMOND';
      else if (pnlValue >= 20) tier = 'GOLD';
      else if (pnlValue >= 5) tier = 'SILVER';

      const displayName = p.user?.username || `Trader_${p.userId.slice(-4)}`;

      return {
        id: p.id,
        username: displayName,
        totalPnL: pnlValue,
        tradeCount: 5,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${displayName}`,
        rankTier: tier,
      };
    });

    res.json(formattedData);
  } catch (err) {
    console.error('Leaderboard Fetch Error:', err);
    res.status(500).json({ message: 'Failed to fetch leaderboard' });
  }
});

export default router;