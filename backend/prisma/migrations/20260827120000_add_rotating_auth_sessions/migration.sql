CREATE TABLE "auth_sessions" (
    "id" UUID NOT NULL,
    "userId" INTEGER NOT NULL,
    "refreshTokenHash" VARCHAR(64) NOT NULL,
    "authVersion" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "auth_sessions_refreshTokenHash_key"
ON "auth_sessions"("refreshTokenHash");

CREATE INDEX "auth_sessions_userId_revokedAt_expiresAt_idx"
ON "auth_sessions"("userId", "revokedAt", "expiresAt");

ALTER TABLE "auth_sessions"
ADD CONSTRAINT "auth_sessions_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
