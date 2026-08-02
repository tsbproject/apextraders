import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { comparePassword, generateToken } from '../utils/jwt'; // Adjust import path to match your structure

const prisma = new PrismaClient();

/**
 * Handles user login and returns JWT token + user profile
 */
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    // 1. Fetch user from database
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // 2. Compare password against `passwordHash` (matching your Prisma schema)
    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // 3. Generate signed JWT access token
    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    // 4. Return successful response with full user context
    return res.status(200).json({
      message: 'Welcome back!',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        rankTier: user.rankTier || 'ELITE',
        demoBalance: Number(user.demoBalance ?? 100000),
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

/**
 * Re-hydrates authenticated user session (/auth/me)
 */
export const getMe = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized session.' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        rankTier: true,
        demoBalance: true,
      },
    });

    if (!user) {
      return res.status(404).json({ message: 'User profile not found.' });
    }

    return res.status(200).json({
      user: {
        ...user,
        demoBalance: Number(user.demoBalance ?? 100000),
      },
    });
  } catch (error) {
    console.error('GetMe error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};