import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import * as dotenv from 'dotenv';

import prisma from './lib/prisma';
import { calculatePnL } from './lib/pnl-Engine';
import { authenticateToken, AuthenticatedRequest } from './middleware/authmiddleware';

import authRoutes from './routes/auth';
import adminRoutes from './routes/admin';
import tournamentRoutes from './routes/tournament';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// ==========================================
// 🛡️ SECURITY & MIDDLEWARE SETUP
// ==========================================

// 1. Helmet HTTP Security Headers
app.use(helmet());

// 2. CORS Hardening
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:5173', 'http://localhost:3000'];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('CORS policy rejection: Unauthorized origin.'));
      }
    },
    credentials: true,
  })
);

// 3. Rate Limiter for Sensitive Auth Endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Max 20 requests per window
  message: { error: 'Too many authentication attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(express.json());

// ==========================================
// 🚀 ROUTE MOUNTS
// ==========================================

// Auth Routes (Rate Limited)
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth', authRoutes);

// Admin Routes (Protected by SUPER_ADMIN in route file)
app.use('/api/admin', adminRoutes);

// Tournament Routes
app.use('/api/tournaments', tournamentRoutes);

// Health Check Endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  return res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// ==========================================
// 📊 TRADING & LEADERBOARD ENDPOINTS
// ==========================================

interface OpenTradeBody {
  symbol: string;
  side: 'BUY' | 'SELL';
  entryPrice: number;
  tournamentId?: string;
}

interface CloseTradeBody {
  tradeId: string;
  exitPrice: number;
}

/**
 * POST /api/trades/open
 * Requires JWT Authentication
 */
app.post(
  '/api/trades/open',
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    const { symbol, side, entryPrice, tournamentId } = req.body as OpenTradeBody;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: User ID missing.' });
    }

    if (!symbol || !side || !entryPrice) {
      return res.status(400).json({ error: 'Missing required trade parameters.' });
    }

    try {
      const newTrade = await prisma.trade.create({
        data: {
          userId,
          symbol,
          side,
          entryPrice,
          tournamentId: tournamentId || null,
          status: 'OPEN',
        },
      });
      return res.status(201).json(newTrade);
    } catch (error) {
      console.error('Error opening trade:', error);
      return res.status(500).json({ error: 'Failed to open trade' });
    }
  }
);

/**
 * POST /api/trades/close
 * Requires JWT Authentication
 */
app.post(
  '/api/trades/close',
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    const { tradeId, exitPrice } = req.body as CloseTradeBody;
    const userId = req.user?.userId;

    if (!tradeId || !exitPrice) {
      return res.status(400).json({ error: 'Missing tradeId or exitPrice.' });
    }

    try {
      const trade = await prisma.trade.findUnique({ where: { id: tradeId } });

      if (!trade || trade.status !== 'OPEN') {
        return res.status(404).json({ error: 'Open trade not found.' });
      }

      // Security check: ensure the trade belongs to the requesting user (or user is admin)
      if (trade.userId !== userId && req.user?.role === 'USER') {
        return res.status(403).json({ error: 'Forbidden: You do not own this trade.' });
      }

      const pnl = calculatePnL(Number(trade.entryPrice), exitPrice, trade.side as 'BUY' | 'SELL');

      const closedTrade = await prisma.trade.update({
        where: { id: tradeId },
        data: {
          exitPrice,
          pnlPercentage: pnl,
          status: 'CLOSED',
        },
      });

      return res.json(closedTrade);
    } catch (error) {
      console.error('Error closing trade:', error);
      return res.status(500).json({ error: 'Failed to close trade' });
    }
  }
);

/**
 * GET /api/leaderboard
 * Public leaderboard ranking users by total PnL
 */
app.get('/api/leaderboard', async (_req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      include: { trades: { where: { status: 'CLOSED' } } },
    });

    const rankings = users
      .map((user) => ({
        id: user.id,
        username: user.username,
        rankTier: user.rankTier,
        role: user.role,
        totalPnL: parseFloat(
          user.trades.reduce((sum, t) => sum + Number(t.pnlPercentage || 0), 0).toFixed(2)
        ),
        tradeCount: user.trades.length,
      }))
      .sort((a, b) => b.totalPnL - a.totalPnL);

    return res.json(rankings);
  } catch (error) {
    console.error('Leaderboard fetch error:', error);
    return res.status(500).json({ error: 'Leaderboard failed' });
  }
});

// ==========================================
// 🏁 SERVER START
// ==========================================
app.listen(PORT, () => {
  console.log(`🚀 ApexTraders Secured API Engine running on port ${PORT}`);
});