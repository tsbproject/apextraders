import express from 'express';
// Change from: import { prisma } from '../lib/prisma';
// To:
import prisma from '../lib/prisma';

const router = express.Router();


router.get('/', async (_req, res) => {
  try {
    // 1. Fetch participants sorted by PnL (Phase 3)
    const leaderboard = await prisma.participant.findMany({
      orderBy: {
        pnlPercentage: 'desc'
      },
      take: 10, // Top 10 traders for performance
    });

    // 2. Transform data to match your Ranker interface
    const formattedData = leaderboard.map((p) => {
      // HANDLE DECIMAL CONVERSION: Ensure pnlPercentage is a primitive number
      // This prevents the "red pop" error when serializing to JSON or comparing values.
      const pnlValue: number = typeof p.pnlPercentage === 'object' && p.pnlPercentage !== null && 'toNumber' in p.pnlPercentage
        ? (p.pnlPercentage as unknown as { toNumber(): number }).toNumber()
        : (p.pnlPercentage as unknown as number) ?? 0;

      // DYNAMIC TIER LOGIC: Aligned with your specific thresholds
      let tier = "BRONZE";
      if (pnlValue >= 50) tier = "DIAMOND";
      else if (pnlValue >= 20) tier = "GOLD";
      else if (pnlValue >= 5) tier = "SILVER";

      return {
        id: p.id,
        username: `Trader_${p.userId.slice(-4)}`, // Mock username until Phase 4 Auth
        totalPnL: pnlValue,
        tradeCount: 5, // Placeholder until trade aggregation is linked
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.userId}`,
        rankTier: tier // Use the calculated tier
      };
    });

    res.json(formattedData);
  } catch (err) {
    // Log for internal debugging (No 'error' unused warning)
    console.error("Leaderboard Fetch Error:", err);
    res.status(500).json({ message: "Failed to fetch leaderboard" });
  }
});

export default router;