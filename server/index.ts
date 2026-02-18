import express, { Request, Response } from 'express';
import cors from 'cors';
import prisma from '../src/lib/prisma';
import { calculatePnL } from '../src/lib/pnl-Engine';
import tournamentRoutes from './routes/tournament';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());
app.use('/api/tournaments', tournamentRoutes);

// --- Types ---
interface OpenTradeBody {
  userId: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  entryPrice: number;
}

interface CloseTradeBody {
  tradeId: string;
  exitPrice: number;
}

// --- Endpoints ---

app.post('/api/trades/open', async (req: Request<{}, {}, OpenTradeBody>, res: Response) => {
  const { userId, symbol, side, entryPrice } = req.body;
  try {
    const newTrade = await prisma.trade.create({
      data: { userId, symbol, side, entryPrice, status: 'OPEN' },
    });
    return res.status(201).json(newTrade);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to open trade' });
  }
});

app.post('/api/trades/close', async (req: Request<{}, {}, CloseTradeBody>, res: Response) => {
  const { tradeId, exitPrice } = req.body;
  try {
    const trade = await prisma.trade.findUnique({ where: { id: tradeId } });
    if (!trade || trade.status !== 'OPEN') return res.status(404).json({ error: 'Trade not found' });

    const pnl = calculatePnL(trade.entryPrice, exitPrice, trade.side as 'BUY' | 'SELL');

    const closedTrade = await prisma.trade.update({
      where: { id: tradeId },
      data: { exitPrice, pnlPercentage: pnl, status: 'CLOSED', closedAt: new Date() },
    });
    return res.json(closedTrade);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to close trade' });
  }
});

app.get('/api/leaderboard', async (_req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      include: { trades: { where: { status: 'CLOSED' } } },
    });

    const rankings = users.map(user => ({
      id: user.id,
      username: user.username,
      totalPnL: parseFloat(user.trades.reduce((sum, t) => sum + Number(t.pnlPercentage || 0), 0).toFixed(2)),
      tradeCount: user.trades.length,
    })).sort((a, b) => b.totalPnL - a.totalPnL);

    return res.json(rankings);
  } catch (error) {
    return res.status(500).json({ error: 'Leaderboard failed' });
  }
});

app.listen(PORT, () => console.log(`🚀 Trading Server running on port ${PORT}`));