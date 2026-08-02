import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { Prisma } from '../generated/client';

import {
  authenticateToken,
  AuthenticatedRequest,
} from '../middleware/authmiddleware';

const router = Router();

// ==========================================
// TYPES
// ==========================================

interface UpdateProfileBody {
  username?: string;
  bio?: string;
}

// ==========================================
// UPDATE CURRENT USER PROFILE
// PATCH /api/profile/update
// Authentication required
// ==========================================

router.patch(
  '/update',
  authenticateToken,
  async (
    req: AuthenticatedRequest<
      Record<string, string>,
      unknown,
      UpdateProfileBody
    >,
    res: Response
  ) => {
    try {
      // ------------------------------------------
      // Identity comes from JWT
      // Never accept user ID from frontend
      // ------------------------------------------

      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          message: 'Unauthorized session.',
        });
      }

      // ------------------------------------------
      // Normalize input
      // ------------------------------------------

      const username =
        typeof req.body.username === 'string'
          ? req.body.username.trim()
          : undefined;

      const bio =
        typeof req.body.bio === 'string'
          ? req.body.bio.trim()
          : undefined;

      // ------------------------------------------
      // Validation
      // ------------------------------------------

      if (username !== undefined && username.length < 3) {
        return res.status(400).json({
          message:
            'Username must contain at least 3 characters.',
        });
      }

      if (username !== undefined && username.length > 50) {
        return res.status(400).json({
          message:
            'Username cannot exceed 50 characters.',
        });
      }

      if (bio !== undefined && bio.length > 160) {
        return res.status(400).json({
          message:
            'Bio cannot exceed 160 characters.',
        });
      }

      if (username === undefined && bio === undefined) {
        return res.status(400).json({
          message:
            'No profile changes were provided.',
        });
      }

      // ------------------------------------------
      // Update user
      // ------------------------------------------

      const updatedUser = await prisma.user.update({
        where: {
          id: userId,
        },

        data: {
          ...(username !== undefined
            ? { username }
            : {}),

          ...(bio !== undefined
            ? { bio }
            : {}),
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
      // Frontend-compatible user shape
      // ------------------------------------------

      const safeUser = {
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        role: updatedUser.role,
        rankTier: updatedUser.rankTier,
        bio: updatedUser.bio,
        avatarUrl: updatedUser.avatarUrl,
        createdAt: updatedUser.createdAt,

        demoBalance: updatedUser.wallet
          ? Number(updatedUser.wallet.balance)
          : 0,
      };

      return res.status(200).json({
        message:
          'Profile synchronized successfully.',
        user: safeUser,
      });
    } catch (error: unknown) {
      console.error(
        'Profile Update Error:',
        error
      );

      if (
        error instanceof
          Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return res.status(409).json({
          message:
            'This username is already claimed by another trader.',
        });
      }

      if (
        error instanceof
          Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        return res.status(404).json({
          message:
            'User profile not found.',
        });
      }

      return res.status(500).json({
        message:
          'Failed to update profile settings.',
      });
    }
  }
);

export default router;