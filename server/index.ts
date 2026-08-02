import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import * as dotenv from 'dotenv';

import prisma from './lib/prisma';
import { calculatePnL } from './lib/pnl-Engine';

import {
  authenticateToken,
  AuthenticatedRequest,
} from './middleware/authmiddleware';

import authRoutes from './routes/auth';
import adminRoutes from './routes/admin';
import tournamentRoutes from './routes/tournament';
import leaderboardRoutes from './routes/leaderboard';
import profileRoutes from './routes/profile';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3001;

// ==========================================
// SECURITY & GLOBAL MIDDLEWARE
// ==========================================

app.use(helmet());

// ------------------------------------------
// CORS
// ------------------------------------------

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean)
  : [
      'http://localhost:5173',
      'http://localhost:3000',
      'https://apextraders.vercel.app',
    ];

app.use(
  cors({
    origin: (origin, callback) => {
      // Requests without Origin are allowed
      // e.g. server-to-server / Postman / health checks.
      if (!origin) {
        callback(null, true);
        return;
      }

      if (
        allowedOrigins.includes(origin) ||
        /\.vercel\.app$/.test(origin)
      ) {
        callback(null, true);
        return;
      }

      callback(
        new Error(
          'CORS policy rejection: Unauthorized origin.'
        )
      );
    },

    credentials: true,
  })
);

// ------------------------------------------
// JSON BODY PARSER
// ------------------------------------------

app.use(
  express.json({
    limit: '1mb',
  })
);

// ==========================================
// RATE LIMITERS
// ==========================================

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,

  // Development-friendly limit.
  max: 20,

  message: {
    message:
      'Too many authentication attempts. Please try again later.',
  },

  standardHeaders: true,
  legacyHeaders: false,
});

// ==========================================
// ROUTE MOUNTS
// ==========================================

// ------------------------------------------
// Authentication
// ------------------------------------------

app.use(
  '/api/auth/login',
  authLimiter
);

app.use(
  '/api/auth/register',
  authLimiter
);

app.use(
  '/api/auth',
  authRoutes
);

// ------------------------------------------
// Admin
//
// Authentication + RBAC are handled
// inside routes/admin.ts
// ------------------------------------------

app.use(
  '/api/admin',
  adminRoutes
);

// ------------------------------------------
// Tournaments
//
// GET /api/tournaments          public
// POST /api/tournaments/join   authenticated
// ------------------------------------------

app.use(
  '/api/tournaments',
  tournamentRoutes
);

// ------------------------------------------
// Leaderboard
// ------------------------------------------

app.use(
  '/api/leaderboard',
  leaderboardRoutes
);

// ------------------------------------------
// Profile
//
// PATCH /api/profile/update
// ------------------------------------------

app.use(
  '/api/profile',
  profileRoutes
);

// ==========================================
// HEALTH CHECK
// GET /api/health
// ==========================================

app.get(
  '/api/health',
  (_req: Request, res: Response) => {
    return res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
    });
  }
);

// ==========================================
// TRADING TYPES
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

// ==========================================
// OPEN TRADE
// POST /api/trades/open
// Authentication required
// ==========================================

app.post(
  '/api/trades/open',
  authenticateToken,

  async (
    req: AuthenticatedRequest<
      Record<string, string>,
      unknown,
      OpenTradeBody
    >,
    res: Response
  ) => {
    try {
      // ------------------------------------------
      // Identity comes ONLY from JWT
      // ------------------------------------------

      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          error:
            'Unauthorized: User identity missing.',
        });
      }

      // ------------------------------------------
      // Normalize request
      // ------------------------------------------

      const symbol =
        typeof req.body.symbol === 'string'
          ? req.body.symbol.trim().toUpperCase()
          : '';

      const side =
        typeof req.body.side === 'string'
          ? req.body.side.toUpperCase()
          : '';

      const entryPrice =
        Number(req.body.entryPrice);

      const tournamentId =
        typeof req.body.tournamentId === 'string' &&
        req.body.tournamentId.trim()
          ? req.body.tournamentId.trim()
          : undefined;

      // ------------------------------------------
      // Validate trade
      // ------------------------------------------

      if (!symbol) {
        return res.status(400).json({
          error:
            'Trading symbol is required.',
        });
      }

      if (
        side !== 'BUY' &&
        side !== 'SELL'
      ) {
        return res.status(400).json({
          error:
            'Trade side must be BUY or SELL.',
        });
      }

      if (
        !Number.isFinite(entryPrice) ||
        entryPrice <= 0
      ) {
        return res.status(400).json({
          error:
            'A valid entry price greater than zero is required.',
        });
      }

      // ------------------------------------------
      // Tournament trade validation
      // ------------------------------------------

      if (tournamentId) {
        const tournament =
          await prisma.tournament.findUnique({
            where: {
              id: tournamentId,
            },

            select: {
              id: true,
              status: true,
              endDate: true,
            },
          });

        if (!tournament) {
          return res.status(404).json({
            error:
              'Tournament not found.',
          });
        }

        if (tournament.status !== 'ACTIVE') {
          return res.status(409).json({
            error:
              'Tournament is not currently active.',
          });
        }

        if (tournament.endDate <= new Date()) {
          return res.status(409).json({
            error:
              'Tournament has already ended.',
          });
        }

        // User must actually be enrolled
        // before opening tournament trades.
        const participant =
          await prisma.participant.findUnique({
            where: {
              userId_tournamentId: {
                userId,
                tournamentId,
              },
            },

            select: {
              id: true,
            },
          });

        if (!participant) {
          return res.status(403).json({
            error:
              'You must join this tournament before trading in it.',
          });
        }
      }

      // ------------------------------------------
      // Create trade
      //
      // JWT:      req.user.id
      // Database: Trade.userId
      // ------------------------------------------

      const newTrade =
        await prisma.trade.create({
          data: {
            userId,
            symbol,
            side,
            entryPrice,
            tournamentId:
              tournamentId ?? null,
            status: 'OPEN',
          },
        });

      return res.status(201).json(newTrade);
    } catch (error: unknown) {
      console.error(
        'Error opening trade:',
        error
      );

      return res.status(500).json({
        error:
          'Failed to open trade.',
      });
    }
  }
);

// ==========================================
// CLOSE TRADE
// POST /api/trades/close
// Authentication required
// ==========================================

app.post(
  '/api/trades/close',
  authenticateToken,

  async (
    req: AuthenticatedRequest<
      Record<string, string>,
      unknown,
      CloseTradeBody
    >,
    res: Response
  ) => {
    try {
      // ------------------------------------------
      // Identity comes ONLY from JWT
      // ------------------------------------------

      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          error:
            'Unauthorized: User identity missing.',
        });
      }

      // ------------------------------------------
      // Normalize request
      // ------------------------------------------

      const tradeId =
        typeof req.body.tradeId === 'string'
          ? req.body.tradeId.trim()
          : '';

      const exitPrice =
        Number(req.body.exitPrice);

      if (!tradeId) {
        return res.status(400).json({
          error:
            'Trade ID is required.',
        });
      }

      if (
        !Number.isFinite(exitPrice) ||
        exitPrice <= 0
      ) {
        return res.status(400).json({
          error:
            'A valid exit price greater than zero is required.',
        });
      }

      // ------------------------------------------
      // Fetch trade
      // ------------------------------------------

      const trade =
        await prisma.trade.findUnique({
          where: {
            id: tradeId,
          },
        });

      if (!trade) {
        return res.status(404).json({
          error:
            'Trade not found.',
        });
      }

      if (trade.status !== 'OPEN') {
        return res.status(409).json({
          error:
            'Trade is already closed.',
        });
      }

      // ------------------------------------------
      // Ownership enforcement
      //
      // Admin status does NOT automatically give
      // permission to close another trader's
      // position.
      // ------------------------------------------

      if (trade.userId !== userId) {
        return res.status(403).json({
          error:
            'Forbidden: You do not own this trade.',
        });
      }

      // ------------------------------------------
      // Calculate PnL
      // ------------------------------------------

      if (
        trade.side !== 'BUY' &&
        trade.side !== 'SELL'
      ) {
        console.error(
          `Invalid trade side stored for trade ${trade.id}:`,
          trade.side
        );

        return res.status(500).json({
          error:
            'Trade contains an invalid position side.',
        });
      }

      const pnl = calculatePnL(
        Number(trade.entryPrice),
        exitPrice,
        trade.side
      );

      // ------------------------------------------
      // Close trade
      // ------------------------------------------

      const closedTrade =
        await prisma.trade.update({
          where: {
            id: tradeId,
          },

          data: {
            exitPrice,
            pnlPercentage: pnl,
            status: 'CLOSED',
          },
        });

      return res.status(200).json(
        closedTrade
      );
    } catch (error: unknown) {
      console.error(
        'Error closing trade:',
        error
      );

      return res.status(500).json({
        error:
          'Failed to close trade.',
      });
    }
  }
);

// ==========================================
// 404 API HANDLER
// ==========================================

app.use(
  '/api',
  (_req: Request, res: Response) => {
    return res.status(404).json({
      message:
        'API endpoint not found.',
    });
  }
);

// ==========================================
// GLOBAL ERROR HANDLER
// ==========================================

app.use(
  (
    error: Error,
    _req: Request,
    res: Response,
    _next: express.NextFunction
  ) => {
    console.error(
      'Unhandled API error:',
      error
    );

    return res.status(500).json({
      message:
        'Internal Server Error.',
    });
  }
);

// ==========================================
// SERVER START
// ==========================================

app.listen(PORT, () => {
  console.log(
    `🚀 ApexTraders Secured API Engine running on port ${PORT}`
  );
});