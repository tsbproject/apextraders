ALTER TABLE "users" ADD COLUMN "resetTokenHash" TEXT;
ALTER TABLE "users" ADD COLUMN "resetTokenExpiresAt" TIMESTAMP(3);
CREATE UNIQUE INDEX "users_resetTokenHash_key" ON "users"("resetTokenHash");
