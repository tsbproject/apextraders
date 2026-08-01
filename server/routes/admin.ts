import { Router, Response } from 'express';
import { Role } from '../generated/client';
import { prisma } from '../lib/prisma';
import {
  authenticateToken,
  authorizeRoles,
  AuthenticatedRequest,
} from '../middleware/authmiddleware';

const router = Router();

// ==========================================
// 1. Explicit Type Definitions
// ==========================================

export interface UserAdminDTO {
  id: string;
  username: string;
  email: string;
  role: Role;
  rankTier: string;
  demoBalance: number;
  createdAt: string;
}

// Extends Record<string, string> so Express RequestHandler accepts it natively
export interface UpdateRoleParams extends Record<string, string> {
  userId: string;
}

export interface UpdateRoleBody {
  role: Role;
}

export interface ApiSuccessResponse<T> {
  message: string;
  data?: T;
}

export interface ApiErrorResponse {
  message: string;
}

// ==========================================
// 2. Protected Admin Routes
// ==========================================

/**
 * GET /api/admin/users
 */
router.get(
  '/users',
  authenticateToken,
  authorizeRoles('ADMIN', 'SUPER_ADMIN'),
  async (
    _req: AuthenticatedRequest,
    res: Response<UserAdminDTO[] | ApiErrorResponse>
  ): Promise<void> => {
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
          rankTier: true,
          createdAt: true,
          wallet: {
            select: {
              balance: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      const formattedUsers: UserAdminDTO[] = users.map((u) => ({
        id: u.id,
        username: u.username,
        email: u.email,
        role: u.role,
        rankTier: u.rankTier,
        demoBalance: u.wallet?.balance ? Number(u.wallet.balance) : 0,
        createdAt: u.createdAt.toISOString(),
      }));

      res.status(200).json(formattedUsers);
    } catch (error: unknown) {
      console.error('Error fetching admin users:', error);
      res.status(500).json({ message: 'Internal Server Error fetching system users.' });
    }
  }
);

/**
 * PATCH /api/admin/users/:userId/role
 */
router.patch(
  '/users/:userId/role',
  authenticateToken,
  authorizeRoles('SUPER_ADMIN'),
  async (
    req: AuthenticatedRequest<
      UpdateRoleParams,
      ApiSuccessResponse<UserAdminDTO> | ApiErrorResponse,
      UpdateRoleBody
    >,
    res: Response<ApiSuccessResponse<UserAdminDTO> | ApiErrorResponse>
  ): Promise<void> => {
    const { userId } = req.params;
    const { role } = req.body;

    if (!role || !Object.values(Role).includes(role)) {
      res.status(400).json({ message: 'Invalid or unsupported role provided.' });
      return;
    }

    try {
      if (req.user?.id === userId && role !== Role.SUPER_ADMIN) {
        res.status(400).json({ message: 'Super Admins cannot revoke their own privilege.' });
        return;
      }

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { role },
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
          rankTier: true,
          createdAt: true,
          wallet: {
            select: {
              balance: true,
            },
          },
        },
      });

      const formattedUser: UserAdminDTO = {
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        role: updatedUser.role,
        rankTier: updatedUser.rankTier,
        demoBalance: updatedUser.wallet?.balance ? Number(updatedUser.wallet.balance) : 0,
        createdAt: updatedUser.createdAt.toISOString(),
      };

      res.status(200).json({
        message: `Successfully updated user role to ${role}`,
        data: formattedUser,
      });
    } catch (error: unknown) {
      console.error(`Error updating role for user ${userId}:`, error);
      res.status(500).json({ message: 'Failed to update user role in database.' });
    }
  }
);

export default router;