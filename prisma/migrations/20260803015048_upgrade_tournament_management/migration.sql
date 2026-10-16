/*
  Warnings:

  - You are about to alter the column `startingBalance` on the `participants` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(18,8)`.
  - You are about to alter the column `currentBalance` on the `participants` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(18,8)`.
  - You are about to alter the column `pnlPercentage` on the `participants` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,4)`.
  - You are about to alter the column `prizePool` on the `tournaments` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(18,8)`.
  - The `status` column on the `tournaments` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterEnum
ALTER TYPE "TournamentStatus" ADD VALUE 'CANCELLED';

-- AlterTable
ALTER TABLE "participants" ADD COLUMN     "prizeWon" DECIMAL(18,8) NOT NULL DEFAULT 0,
ALTER COLUMN "startingBalance" SET DATA TYPE DECIMAL(18,8),
ALTER COLUMN "currentBalance" SET DATA TYPE DECIMAL(18,8),
ALTER COLUMN "pnlPercentage" SET DATA TYPE DECIMAL(10,4);

-- AlterTable
ALTER TABLE "tournaments" ADD COLUMN     "entryFee" DECIMAL(18,8) NOT NULL DEFAULT 0,
ADD COLUMN     "maxParticipants" INTEGER NOT NULL DEFAULT 100,
ADD COLUMN     "settledAt" TIMESTAMP(3),
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "prizePool" SET DATA TYPE DECIMAL(18,8),
DROP COLUMN "status",
ADD COLUMN     "status" "TournamentStatus" NOT NULL DEFAULT 'UPCOMING';

-- CreateIndex
CREATE INDEX "participants_tournamentId_idx" ON "participants"("tournamentId");

-- CreateIndex
CREATE INDEX "participants_userId_idx" ON "participants"("userId");

-- CreateIndex
CREATE INDEX "tournaments_status_idx" ON "tournaments"("status");

-- CreateIndex
CREATE INDEX "tournaments_startDate_idx" ON "tournaments"("startDate");

-- CreateIndex
CREATE INDEX "tournaments_endDate_idx" ON "tournaments"("endDate");
