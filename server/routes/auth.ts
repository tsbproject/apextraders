import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import {
  hashPassword,
  comparePassword,
  generateToken,
} from '../lib/auth';
import {
  authenticateToken,
  AuthenticatedRequest,
} from '../middleware/authmiddleware';

const router = Router();

// ==========================================
// TYPES
// ==========================================

interface RegisterBody {
  username: string;
  email: string;
  password: string;
}

interface LoginBody {
  email: string;
  password: string;
}

// Default paper-trading balance for newly registered users
const DEFAULT_DEMO_BALANCE = 25_400;

// ==========================================
// REGISTER
// POST /api/auth/register
// ==========================================

router.post(
  '/register',
  async (
    req: Request<Record<string, never>, unknown, RegisterBody>,
    res: Response
  ) => {
    try {
      const username =
        typeof req.body.username === 'string'
          ? req.body.username.trim()
          : '';

      const email =
        typeof req.body.email === 'string'
          ? req.body.email.trim().toLowerCase()
          : '';

      const password =
        typeof req.body.password === 'string'
          ? req.body.password
          : '';

      // ------------------------------------------
      // Validate input
      // ------------------------------------------

      if (!username || !email || !password) {
        return res.status(400).json({
          message: 'Username, email, and password are required.',
        });
      }

      if (username.length < 3) {
        return res.status(400).json({
          message: 'Username must be at least 3 characters long.',
        });
      }

      if (password.length < 6) {
        return res.status(400).json({
          message: 'Password must be at least 6 characters long.',
        });
      }

      // ------------------------------------------
      // Check duplicate account
      // ------------------------------------------

      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            { email },
            { username },
          ],
        },
        select: {
          id: true,
        },
      });

      if (existingUser) {
        return res.status(409).json({
          message: 'Username or Email is already registered.',
        });
      }

      // ------------------------------------------
      // Hash password
      // ------------------------------------------

      const passwordHash = await hashPassword(password);

      // ------------------------------------------
      // Create User + Wallet atomically
      // ------------------------------------------

      const newUser = await prisma.user.create({
        data: {
          username,
          email,
          passwordHash,

          // Prisma schema already defaults this to USER,
          // but keeping it implicit prevents privilege escalation.

          wallet: {
            create: {
              balance: DEFAULT_DEMO_BALANCE,
            },
          },
        },

        select: {
          id: true,
          username: true,
          email: true,
          role: true,
          rankTier: true,
          bio: true,
          avatarUrl: true,
          createdAt: true,

          wallet: {
            select: {
              balance: true,
            },
          },
        },
      });

      // ------------------------------------------
      // Generate JWT
      // Canonical payload: { id, email, role }
      // ------------------------------------------

      const token = generateToken({
        id: newUser.id,
        email: newUser.email,
        role: newUser.role,
      });

      // ------------------------------------------
      // Shape response for frontend
      // ------------------------------------------

      const safeUser = {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
        rankTier: newUser.rankTier,
        bio: newUser.bio,
        avatarUrl: newUser.avatarUrl,
        createdAt: newUser.createdAt,

        // Frontend DTO name remains demoBalance
        demoBalance: newUser.wallet
          ? Number(newUser.wallet.balance)
          : 0,
      };

      return res.status(201).json({
        message: 'Account created successfully!',
        token,
        user: safeUser,
      });
    } catch (error) {
      console.error('Registration error:', error);

      return res.status(500).json({
        message: 'Internal Server Error during registration.',
      });
    }
  }
);

// ==========================================
// LOGIN
// POST /api/auth/login
// ==========================================

router.post(
  '/login',
  async (
    req: Request<Record<string, never>, unknown, LoginBody>,
    res: Response
  ) => {
    try {
      const email =
        typeof req.body.email === 'string'
          ? req.body.email.trim().toLowerCase()
          : '';

      const password =
        typeof req.body.password === 'string'
          ? req.body.password
          : '';

      if (!email || !password) {
        return res.status(400).json({
          message: 'Email and password are required.',
        });
      }

      // ------------------------------------------
      // Find account
      // ------------------------------------------

      const user = await prisma.user.findUnique({
        where: {
          email,
        },

        include: {
          wallet: {
            select: {
              balance: true,
            },
          },
        },
      });

      if (!user) {
        return res.status(401).json({
          message: 'Invalid credentials.',
        });
      }

      // ------------------------------------------
      // Verify password
      // ------------------------------------------

      const isMatch = await comparePassword(
        password,
        user.passwordHash
      );

      if (!isMatch) {
        return res.status(401).json({
          message: 'Invalid credentials.',
        });
      }

      // ------------------------------------------
      // Generate JWT
      // Canonical payload: { id, email, role }
      // ------------------------------------------

      const token = generateToken({
        id: user.id,
        email: user.email,
        role: user.role,
      });

      // ------------------------------------------
      // Never expose passwordHash
      // ------------------------------------------

      const safeUser = {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        rankTier: user.rankTier,
        bio: user.bio,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt,

        demoBalance: user.wallet
          ? Number(user.wallet.balance)
          : 0,
      };

      return res.status(200).json({
        message: 'Login successful!',
        token,
        user: safeUser,
      });
    } catch (error) {
      console.error('Login error:', error);

      return res.status(500).json({
        message: 'Internal Server Error during login.',
      });
    }
  }
);

// ==========================================
// GET CURRENT USER
// GET /api/auth/me
// ==========================================

router.get(
  '/me',
  authenticateToken,
  async (
    req: AuthenticatedRequest,
    res: Response
  ) => {
    try {
      // JWT identity is always `id`
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          message: 'Unauthorized session.',
        });
      }

      // ------------------------------------------
      // Fetch fresh account state from database
      // ------------------------------------------

      const user = await prisma.user.findUnique({
        where: {
          id: userId,
        },

        select: {
          id: true,
          username: true,
          email: true,
          role: true,
          rankTier: true,
          bio: true,
          avatarUrl: true,
          createdAt: true,

          wallet: {
            select: {
              balance: true,
            },
          },
        },
      });

      if (!user) {
        return res.status(404).json({
          message: 'User not found.',
        });
      }

      // ------------------------------------------
      // Shape response for Redux/frontend
      // ------------------------------------------

      const safeUser = {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        rankTier: user.rankTier,
        bio: user.bio,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt,

        demoBalance: user.wallet
          ? Number(user.wallet.balance)
          : 0,
      };

      return res.status(200).json({
        user: safeUser,
      });
    } catch (error) {
      console.error('Get current user error:', error);

      return res.status(500).json({
        message: 'Failed to retrieve profile.',
      });
    }
  }
);

export default router;