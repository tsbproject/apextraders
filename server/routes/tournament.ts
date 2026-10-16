import { Router, RequestHandler } from 'express';
import { Prisma, TournamentStatus } from '../generated/client';
import prisma from '../lib/prisma';
import { authenticateToken, AuthenticatedRequest } from '../middleware/authmiddleware';

const router = Router();

/**
 * Join a tournament using the authenticated identity, never a userId from JSON.
 * Serializable isolation ensures capacity and wallet deductions are consistent
 * when multiple traders enroll simultaneously.
 */
router.post('/join', authenticateToken as RequestHandler, async (req: AuthenticatedRequest<Record<string, string>, unknown, { tournamentId?: unknown }>, res): Promise<void> => {
  const userId = req.user?.id;
  const tournamentId: unknown = req.body?.tournamentId;
  if (!userId) { res.status(401).json({ message: 'Authentication required.' }); return; }
  if (typeof tournamentId !== 'string' || !tournamentId.trim()) {
    res.status(400).json({ message: 'A valid tournamentId is required.' }); return;
  }

  class EnrollmentError extends Error {
    constructor(public readonly statusCode: number, message: string) { super(message); }
  }

  try {
    let participant;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        participant = await prisma.$transaction(async tx => {
          const tournament = await tx.tournament.findUnique({
            where: { id: tournamentId },
            include: { _count: { select: { participants: true } } },
          });
          if (!tournament) throw new EnrollmentError(404, 'Tournament not found.');
          const now = new Date();
          if (tournament.status !== TournamentStatus.ACTIVE ||
              now < tournament.startDate || now >= tournament.endDate) {
            throw new EnrollmentError(409, 'Tournament is not open for enrollment.');
          }
          if (tournament._count.participants >= tournament.maxParticipants) {
            throw new EnrollmentError(409, 'Tournament is full.');
          }
          const alreadyJoined = await tx.participant.findUnique({
            where: { userId_tournamentId: { userId, tournamentId } },
          });
          if (alreadyJoined) throw new EnrollmentError(409, 'Already enrolled in this tournament.');

          if (tournament.entryFee.greaterThan(0)) {
            const debited = await tx.wallet.updateMany({
              where: { userId, balance: { gte: tournament.entryFee } },
              data: { balance: { decrement: tournament.entryFee } },
            });
            if (debited.count !== 1) throw new EnrollmentError(409, 'Insufficient demo wallet balance.');
          }

          return tx.participant.create({
            data: { userId, tournamentId, startingBalance: 10000, currentBalance: 10000, pnlPercentage: 0 },
          });
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
        break;
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034' && attempt < 2) continue;
        throw error;
      }
    }
    res.status(201).json(participant);
  } catch (error) {
    if (error instanceof EnrollmentError) {
      res.status(error.statusCode).json({ message: error.message }); return;
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      res.status(409).json({ message: 'Already enrolled in this tournament.' }); return;
    }
    console.error('Tournament enrollment error:', error);
    res.status(500).json({ message: 'Could not enroll in tournament.' });
  }
});

router.get('/mine', authenticateToken as RequestHandler, async (req: AuthenticatedRequest, res): Promise<void> => {
  if (!req.user?.id) { res.status(401).json({ message: 'Authentication required.' }); return; }
  try {
    const participants = await prisma.participant.findMany({
      where: { userId: req.user.id, tournament: { status: TournamentStatus.ACTIVE } },
      include: { tournament: { select: { id: true, title: true, startDate: true, endDate: true, status: true } } },
    });
    res.json(participants.map(p => ({
      tournamentId: p.tournamentId,
      title: p.tournament.title,
      startDate: p.tournament.startDate,
      endDate: p.tournament.endDate,
      currentBalance: p.currentBalance,
      startingBalance: p.startingBalance,
      pnlPercentage: p.pnlPercentage,
    })));
  } catch (error) {
    console.error('Tournament account lookup error:', error);
    res.status(500).json({ message: 'Could not load tournament accounts.' });
  }
});

router.get('/', async (_req, res) => {
  try {
    const tournaments = await prisma.tournament.findMany({
      where: { status: TournamentStatus.ACTIVE },
      include: { _count: { select: { participants: true } } },
    });
    res.json(tournaments);
  } catch (error) {
    console.error('Tournament list error:', error);
    res.status(500).json({ message: 'Could not load arenas.' });
  }
});

export default router;
