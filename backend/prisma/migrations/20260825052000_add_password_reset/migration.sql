ALTER TABLE "users"
ADD COLUMN "passwordResetTokenHash" VARCHAR(64),
ADD COLUMN "passwordResetExpiresAt" TIMESTAMP(3),
ADD COLUMN "passwordResetSentAt" TIMESTAMP(3),
ADD COLUMN "authVersion" INTEGER NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX "users_passwordResetTokenHash_key"
ON "users"("passwordResetTokenHash");
