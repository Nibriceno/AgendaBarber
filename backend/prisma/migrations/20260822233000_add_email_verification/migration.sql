ALTER TABLE "users"
ADD COLUMN "emailVerificationTokenHash" VARCHAR(64),
ADD COLUMN "emailVerificationExpiresAt" TIMESTAMP(3),
ADD COLUMN "emailVerificationSentAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "users_emailVerificationTokenHash_key"
ON "users"("emailVerificationTokenHash");
