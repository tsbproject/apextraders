import express, { Request, Response, RequestHandler } from 'express';
import { PrismaClient } from '@prisma/client';
import { syncUserLeaderboardStats } from '../lib/leaderboard-sync';

const router = express.Router();
const prisma = new PrismaClient();

// Define explicit interfaces for the request body
interface SettlementBody {
  exitPrice: number;
  pnlPercentage: number;
  tournamentId?: string;
  tradeId?: string; // For the POST /close variant
}

/**
 * SETTLE POSITION (Unified Logic)
 * Supports both PATCH (id in params) and POST (id in body)
 */
const handleTradeSettlement: RequestHandler<{ id?: string }, any, SettlementBody> = async (req, res) => {
  // Merge sources: id can come from path params or body
  const tradeId = req.params.id || req.body.tradeId;
  const { exitPrice, pnlPercentage, tournamentId } = req.body;

  if (!tradeId) {
    res.status(400).json({ message: "Trade ID is required for settlement." });
    return;
  }

  try {
    // Perform update with explicit data mapping
    const closedTrade = await prisma.trade.update({
      where: { id: tradeId },
      data: {
        exitPrice: exitPrice,
        pnlPercentage: pnlPercentage,
        status: "CLOSED"
      }
    });

    // TRIGGER SYNC: Atomic update of the tournament leaderboard
    if (tournamentId) {
      // We await this to ensure rank is updated before the response returns
      await syncUserLeaderboardStats(closedTrade.userId, tournamentId);
    }

    res.json({
      message: "Position settled and leaderboard synced.",
      trade: closedTrade
    });
  } catch (err) {
    console.error("[Settlement Error]:", err);
    res.status(500).json({ message: "Internal Engine Error during settlement." });
  }
};

// Route assignments
router.patch('/close/:id', handleTradeSettlement);
router.post('/close', handleTradeSettlement);

/**
 * FETCH TRADE HISTORY
 */
router.get('/history', async (req: Request, res: Response) => {
  const { userId } = req.query;

  if (!userId || typeof userId !== 'string') {
    res.status(400).json({ message: "A valid UserId query parameter is required." });
    return;
  }

  try {
    const history = await prisma.trade.findMany({
      where: {
        userId: userId,
        status: 'CLOSED'
      },
      orderBy: {
        createdAt: 'desc'
      },
      // Optional: limit history to prevent payload bloat
      take: 50 
    });

    res.json(history);
  } catch (err) {
    console.error("[History Fetch Error]:", err);
    res.status(500).json({ message: "Failed to retrieve trade ledger." });
  }
});

export default router;