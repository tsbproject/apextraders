import {
  Router,
  Request,
  Response,
  RequestHandler,
} from 'express';

import {
  Role,
  RankTier,
  TournamentStatus,
} from '../generated/client';

import prisma from '../lib/prisma';

import {
  authenticateToken,
  authorizeRoles,
  ApexJwtPayload,
} from '../middleware/authmiddleware';

const router = Router();



// ==========================================
// TYPES
// ==========================================

export interface UserAdminDTO {
  id: string;
  username: string;
  email: string;
  role: Role;
  rankTier: RankTier;
  demoBalance: number;
  createdAt: string;
}

export interface TournamentAdminDTO {
  id: string;
  title: string;
  status: TournamentStatus;
  startDate: string;
  endDate: string;
  createdAt: string;
  participantCount: number;
}

export interface UpdateRoleParams
  extends Record<string, string> {
  userId: string;
}

export interface UpdateRoleBody {
  role: Role;
}

export interface CreateTournamentBody {
  title: string;
  startDate: string;
  endDate: string;
  status?: TournamentStatus;
}

export interface UpdateTournamentStatusParams
  extends Record<string, string> {
  tournamentId: string;
}

export interface UpdateTournamentStatusBody {
  status: TournamentStatus;
}

export interface ApiSuccessResponse<T> {
  message: string;
  data?: T;
}

export interface ApiErrorResponse {
  message: string;
}

export interface CustomAdminRequest<
  P = Record<string, string>,
  ResBody = unknown,
  ReqBody = unknown,
  ReqQuery = Record<string, string>
> extends Request<P, ResBody, ReqBody, ReqQuery> {
  user?: ApexJwtPayload;
}

// ==========================================
// HELPERS
// ==========================================

const formatUser = (user: {
  id: string;
  username: string;
  email: string;
  role: Role;
  rankTier: RankTier;
  createdAt: Date;
  wallet: {
    balance: unknown;
  } | null;
}): UserAdminDTO => {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    rankTier: user.rankTier,
    demoBalance: user.wallet
      ? Number(user.wallet.balance)
      : 0,
    createdAt: user.createdAt.toISOString(),
  };
};

const formatTournament = (tournament: {
  id: string;
  title: string;
  status: string;
  startDate: Date;
  endDate: Date;
  createdAt: Date;
  _count: {
    participants: number;
  };
}): TournamentAdminDTO => {
  return {
    id: tournament.id,
    title: tournament.title,

    // Current Prisma schema stores Tournament.status
    // as String, so it is validated before reaching here.
    status: tournament.status as TournamentStatus,

    startDate: tournament.startDate.toISOString(),
    endDate: tournament.endDate.toISOString(),
    createdAt: tournament.createdAt.toISOString(),
    participantCount: tournament._count.participants,
  };
};

const isValidTournamentStatus = (
  value: unknown
): value is TournamentStatus => {
  return (
    typeof value === 'string' &&
    Object.values(TournamentStatus).includes(
      value as TournamentStatus
    )
  );
};

// ==========================================
// GLOBAL ADMIN AUTHENTICATION
// ==========================================

/**
 * Every route under /api/admin requires authentication.
 */
router.use(authenticateToken as RequestHandler);

// ==========================================
// GET ADMIN USERS
// GET /api/admin/users
// ADMIN | SUPER_ADMIN
// ==========================================

router.get(
  '/users',
  authorizeRoles(
    Role.ADMIN,
    Role.SUPER_ADMIN
  ) as RequestHandler,

  async (
    _req: CustomAdminRequest,
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

        orderBy: {
          createdAt: 'desc',
        },
      });

      const formattedUsers =
        users.map(formatUser);

      res.status(200).json(formattedUsers);
    } catch (error: unknown) {
      console.error(
        'Error fetching admin users:',
        error
      );

      res.status(500).json({
        message:
          'Internal Server Error fetching system users.',
      });
    }
  }
);

// ==========================================
// UPDATE USER ROLE
// PATCH /api/admin/users/:userId/role
// SUPER_ADMIN ONLY
// ==========================================

// ==========================================
// UPDATE TOURNAMENT STATUS
// PATCH /api/admin/tournaments/:tournamentId/status
// ADMIN | SUPER_ADMIN
// ==========================================




router.patch(
  '/tournaments/:tournamentId/status',
  authorizeRoles(
    Role.ADMIN,
    Role.SUPER_ADMIN
  ) as RequestHandler,

  async (
    req: CustomAdminRequest<
      UpdateTournamentStatusParams,
      ApiSuccessResponse<TournamentAdminDTO> | ApiErrorResponse,
      UpdateTournamentStatusBody
    >,
    res: Response<
      ApiSuccessResponse<TournamentAdminDTO> | ApiErrorResponse
    >
  ): Promise<void> => {
    const { tournamentId } = req.params;
    const { status } = req.body;

    // ==========================================
    // 1. Validate requested status
    // ==========================================

    if (!isValidTournamentStatus(status)) {
      res.status(400).json({
        message: 'Invalid or missing tournament status.',
      });
      return;
    }

    try {
      // ==========================================
      // 2. Load current tournament
      // ==========================================

      const tournament = await prisma.tournament.findUnique({
        where: {
          id: tournamentId,
        },

        select: {
          id: true,
          title: true,
          status: true,
          startDate: true,
          endDate: true,
        },
      });

      if (!tournament) {
        res.status(404).json({
          message: 'Tournament not found.',
        });
        return;
      }

      // ==========================================
      // 3. Validate current database status
      // ==========================================

      if (!isValidTournamentStatus(tournament.status)) {
        console.error(
          `Tournament ${tournament.id} contains invalid DB status:`,
          tournament.status
        );

        res.status(500).json({
          message:
            'Tournament contains an invalid status in the database.',
        });
        return;
      }

      const currentStatus = tournament.status;
      const now = new Date();

      // ==========================================
      // 4. COMPLETED is terminal
      // ==========================================

      if (currentStatus === TournamentStatus.COMPLETED) {
        res.status(409).json({
          message:
            'Completed tournaments are locked and cannot be reactivated, paused, or rescheduled.',
        });
        return;
      }

      // ==========================================
      // 5. Ignore duplicate status requests
      // ==========================================

      if (currentStatus === status) {
        res.status(400).json({
          message: `Tournament is already ${status}.`,
        });
        return;
      }

      // ==========================================
      // 6. Define allowed lifecycle transitions
      // ==========================================

      const allowedTransitions: Record<
        TournamentStatus,
        TournamentStatus[]
      > = {
        [TournamentStatus.UPCOMING]: [
          TournamentStatus.ACTIVE,
          TournamentStatus.COMPLETED,
        ],

        [TournamentStatus.ACTIVE]: [
          TournamentStatus.PAUSED,
          TournamentStatus.COMPLETED,
        ],

        [TournamentStatus.PAUSED]: [
          TournamentStatus.ACTIVE,
          TournamentStatus.COMPLETED,
        ],

        [TournamentStatus.COMPLETED]: [],
      };

      if (!allowedTransitions[currentStatus].includes(status)) {
        res.status(409).json({
          message:
            `Invalid tournament transition: ${currentStatus} → ${status}.`,
        });
        return;
      }

      // ==========================================
      // 7. Prevent activation after tournament end
      // ==========================================

      if (
        status === TournamentStatus.ACTIVE &&
        now.getTime() >= tournament.endDate.getTime()
      ) {
        res.status(409).json({
          message:
            'This tournament has already reached its end date and cannot be activated.',
        });
        return;
      }

      // ==========================================
      // 8. Update tournament
      // ==========================================

      const updatedTournament =
        await prisma.tournament.update({
          where: {
            id: tournamentId,
          },

          data: {
            status,
          },

          include: {
            _count: {
              select: {
                participants: true,
              },
            },
          },
        });

      // ==========================================
      // 9. Return updated tournament
      // ==========================================

      res.status(200).json({
        message:
          status === TournamentStatus.ACTIVE
            ? `Tournament "${updatedTournament.title}" is now active.`
            : status === TournamentStatus.PAUSED
              ? `Tournament "${updatedTournament.title}" has been paused.`
              : status === TournamentStatus.COMPLETED
                ? `Tournament "${updatedTournament.title}" has been completed.`
                : `Tournament status updated to ${status}.`,

        data: formatTournament(updatedTournament),
      });
    } catch (error: unknown) {
      console.error(
        `Error updating tournament ${tournamentId} status:`,
        error
      );

      res.status(500).json({
        message:
          'Failed to update tournament status.',
      });
    }
  }
);

// ==========================================
// GET ADMIN TOURNAMENTS
// GET /api/admin/tournaments
// ADMIN | SUPER_ADMIN
// ==========================================

router.get(
  '/tournaments',
  authorizeRoles(
    Role.ADMIN,
    Role.SUPER_ADMIN
  ) as RequestHandler,

  async (
    _req: CustomAdminRequest,
    res: Response<
      TournamentAdminDTO[] | ApiErrorResponse
    >
  ): Promise<void> => {
    try {
      const tournaments =
        await prisma.tournament.findMany({
          include: {
            _count: {
              select: {
                participants: true,
              },
            },
          },

          orderBy: {
            createdAt: 'desc',
          },
        });

      const formattedTournaments =
        tournaments.map(formatTournament);

      res
        .status(200)
        .json(formattedTournaments);
    } catch (error: unknown) {
      console.error(
        'Error fetching admin tournaments:',
        error
      );

      res.status(500).json({
        message:
          'Failed to fetch tournaments.',
      });
    }
  }
);

// ==========================================
// CREATE TOURNAMENT
// POST /api/admin/tournaments
// ADMIN | SUPER_ADMIN
// ==========================================

router.post(
  '/tournaments',
  authorizeRoles(
    Role.ADMIN,
    Role.SUPER_ADMIN
  ) as RequestHandler,

  async (
    req: CustomAdminRequest<
      Record<string, string>,
      ApiSuccessResponse<TournamentAdminDTO> | ApiErrorResponse,
      CreateTournamentBody
    >,
    res: Response<
      ApiSuccessResponse<TournamentAdminDTO> | ApiErrorResponse
    >
  ): Promise<void> => {
    const title =
      typeof req.body.title === 'string'
        ? req.body.title.trim()
        : '';

    const {
      startDate,
      endDate,
      status,
    } = req.body;

    // ------------------------------------------
    // Validate required fields
    // ------------------------------------------

    if (!title || !startDate || !endDate) {
      res.status(400).json({
        message:
          'Title, startDate, and endDate are required fields.',
      });
      return;
    }

    // ------------------------------------------
    // Validate dates
    // ------------------------------------------

    const parsedStartDate =
      new Date(startDate);

    const parsedEndDate =
      new Date(endDate);

    if (
      Number.isNaN(parsedStartDate.getTime()) ||
      Number.isNaN(parsedEndDate.getTime())
    ) {
      res.status(400).json({
        message:
          'Invalid tournament startDate or endDate.',
      });
      return;
    }

    if (
      parsedEndDate.getTime() <=
      parsedStartDate.getTime()
    ) {
      res.status(400).json({
        message:
          'Tournament endDate must be after startDate.',
      });
      return;
    }

    // ------------------------------------------
    // Validate optional status
    // ------------------------------------------

    if (
      status !== undefined &&
      !isValidTournamentStatus(status)
    ) {
      res.status(400).json({
        message:
          'Invalid tournament status.',
      });
      return;
    }

    try {
      const newTournament =
        await prisma.tournament.create({
          data: {
            title,
            startDate: parsedStartDate,
            endDate: parsedEndDate,

            // Current schema stores this as String.
            status:
              status ??
              TournamentStatus.UPCOMING,
          },

          include: {
            _count: {
              select: {
                participants: true,
              },
            },
          },
        });

      res.status(201).json({
        message:
          'Tournament created successfully.',

        data:
          formatTournament(newTournament),
      });
    } catch (error: unknown) {
      console.error(
        'Error creating tournament:',
        error
      );

      res.status(500).json({
        message:
          'Failed to create new tournament.',
      });
    }
  }
);

// ==========================================
// UPDATE TOURNAMENT STATUS
// PATCH /api/admin/tournaments/:tournamentId/status
// ADMIN | SUPER_ADMIN
// ==========================================

router.patch(
  '/tournaments/:tournamentId/status',
  authorizeRoles(
    Role.ADMIN,
    Role.SUPER_ADMIN
  ) as RequestHandler,

  async (
    req: CustomAdminRequest<
      UpdateTournamentStatusParams,
      ApiSuccessResponse<TournamentAdminDTO> | ApiErrorResponse,
      UpdateTournamentStatusBody
    >,
    res: Response<
      ApiSuccessResponse<TournamentAdminDTO> | ApiErrorResponse
    >
  ): Promise<void> => {
    const { tournamentId } =
      req.params;

    const { status } =
      req.body;

    // ------------------------------------------
    // Validate status
    // ------------------------------------------

    if (
      !isValidTournamentStatus(status)
    ) {
      res.status(400).json({
        message:
          'Invalid or missing tournament status.',
      });
      return;
    }

    try {
      const tournament =
        await prisma.tournament.findUnique({
          where: {
            id: tournamentId,
          },
          select: {
            id: true,
          },
        });

      if (!tournament) {
        res.status(404).json({
          message:
            'Tournament not found.',
        });
        return;
      }

      const updatedTournament =
        await prisma.tournament.update({
          where: {
            id: tournamentId,
          },

          data: {
            status,
          },

          include: {
            _count: {
              select: {
                participants: true,
              },
            },
          },
        });

      res.status(200).json({
        message:
          `Tournament status updated to ${status}.`,

        data:
          formatTournament(updatedTournament),
      });
    } catch (error: unknown) {
      console.error(
        `Error updating tournament ${tournamentId} status:`,
        error
      );

      res.status(500).json({
        message:
          'Failed to update tournament status.',
      });
    }
  }
);

export default router;