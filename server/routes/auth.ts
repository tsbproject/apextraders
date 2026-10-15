import { Router, Request, Response } from 'express';
import { randomBytes, createHash } from 'node:crypto';
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


const resetTokenDigest = (token: string): string =>
  createHash('sha256').update(token).digest('hex');

const RESET_RESPONSE = 'If an account exists for that email, a password reset link will be sent.';

// A verified sending domain, RESEND_API_KEY and FRONTEND_URL are required.
// Never return a reset token or link through this API.
router.post('/forgot-password', async (req: Request, res: Response) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  if (!email || email.length > 254 || !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)) {
    return res.status(400).json({ message: 'Enter a valid email address.' });
  }
  if (!process.env.RESEND_API_KEY || !process.env.RESET_EMAIL_FROM || !process.env.FRONTEND_URL) {
    return res.status(503).json({ message: 'Password recovery is temporarily unavailable.' });
  }
  try {
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (user) {
      const token = randomBytes(32).toString('hex');
      const resetUrl = new URL(process.env.FRONTEND_URL);
      resetUrl.searchParams.set('resetToken', token);
      await prisma.user.update({
        where: { id: user.id },
        data: { resetTokenHash: resetTokenDigest(token), resetTokenExpiresAt: new Date(Date.now() + 30 * 60 * 1000) },
      });
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: process.env.RESET_EMAIL_FROM,
          to: [email],
          subject: 'Reset your ApexTraders password',
          text: `Use this link to reset your password (expires in 30 minutes): ${resetUrl.toString()}\\nIf you did not request this, ignore this email.`,
        }),
      });
      if (!response.ok) {
        console.error('Password recovery email delivery failed:', response.status);
        await prisma.user.updateMany({ where: { id: user.id, resetTokenHash: resetTokenDigest(token) }, data: { resetTokenHash: null, resetTokenExpiresAt: null } });
        return res.status(503).json({ message: 'Password recovery is temporarily unavailable.' });
      }
    }
    return res.json({ message: RESET_RESPONSE });
  } catch (error) {
    console.error('Password recovery request failed:', error);
    return res.status(503).json({ message: 'Password recovery is temporarily unavailable.' });
  }
});

router.post('/reset-password', async (req: Request, res: Response) => {
  const token = typeof req.body?.token === 'string' ? req.body.token : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  if (!/^[a-f0-9]{64}$/.test(token) || password.length < 8 || password.length > 128) {
    return res.status(400).json({ message: 'Invalid reset link or password (8–128 characters required).' });
  }
  try {
    const digest = resetTokenDigest(token);
    const user = await prisma.user.findUnique({ where: { resetTokenHash: digest }, select: { id: true, resetTokenExpiresAt: true } });
    if (!user || !user.resetTokenExpiresAt || user.resetTokenExpiresAt <= new Date()) {
      return res.status(400).json({ message: 'This reset link is invalid or has expired.' });
    }
    const passwordHash = await hashPassword(password);
    const result = await prisma.user.updateMany({
      where: { id: user.id, resetTokenHash: digest, resetTokenExpiresAt: { gt: new Date() } },
      data: { passwordHash, resetTokenHash: null, resetTokenExpiresAt: null },
    });
    if (result.count !== 1) return res.status(400).json({ message: 'This reset link is invalid or has expired.' });
    return res.json({ message: 'Password updated. You can now sign in.' });
  } catch (error) {
    console.error('Password reset failed:', error);
    return res.status(500).json({ message: 'Unable to reset password.' });
  }
});

export default router;