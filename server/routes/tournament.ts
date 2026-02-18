import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

/**
 * Join a Tournament
 * Creates a Participant record linking a user to a specific arena.
 */
router.post('/join', async (req, res) => {
  const { userId, tournamentId } = req.body;

  try {
    const participant = await prisma.participant.create({
      data: {
        userId,
        tournamentId,
        startingBalance: 10000, // Fixed starting capital for level playing field
        currentBalance: 10000,
        pnlPercentage: 0,
      },
    });

    res.status(201).json(participant);
  } catch (err) {
    // Variable 'err' used for server-side debugging to prevent linting errors
    console.error("Tournament Join Error:", err);
    
    // Return a clear message to the frontend (handled by NotifyError)
    res.status(400).json({ 
      message: "Enrollment failed: You are already a participant or the arena is closed." 
    });
  }
});

// GET route for fetching tournaments (as prepared for the Tournament List)
router.get('/', async (_req, res) => {
  try {
    const tournaments = await prisma.tournament.findMany({
      where: { status: 'ACTIVE' },
      include: {
        _count: {
          select: { participants: true }
        }
      }
    });
    res.json(tournaments);
  } catch (err) {
    console.error("Fetch Error:", err);
    res.status(500).json({ message: "Could not load arenas." });
  }
});

export default router;