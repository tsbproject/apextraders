import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

/**
 * Update User Profile
 * Handles username and bio changes
 */
router.patch('/update/:id', async (req, res) => {
  const { id } = req.params;
  const { username, bio } = req.body;

  try {
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        username: username?.trim(),
        bio: bio?.trim(),
      },
    });

    res.json({
      message: "Profile synchronized successfully.",
      user: updatedUser
    });
  } catch (err: any) {
    console.error("Profile Update Error:", err);

    // Prisma Unique Constraint Error (Username already exists)
    if (err.code === 'P2002') {
      return res.status(400).json({ 
        message: "This username is already claimed by another trader." 
      });
    }

    res.status(500).json({ message: "Failed to update profile settings." });
  }
});

export default router;