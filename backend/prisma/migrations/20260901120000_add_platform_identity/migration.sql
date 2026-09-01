CREATE TYPE "PlatformRole" AS ENUM ('SUPER_ADMIN');

CREATE TABLE "platform_users" (
    "id" SERIAL NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "PlatformRole" NOT NULL DEFAULT 'SUPER_ADMIN',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "authVersion" INTEGER NOT NULL DEFAULT 0,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "platform_users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "platform_auth_sessions" (
    "id" UUID NOT NULL,
    "platformUserId" INTEGER NOT NULL,
    "refreshTokenHash" VARCHAR(64) NOT NULL,
    "authVersion" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_auth_sessions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "platform_users_email_key"
ON "platform_users"("email");

CREATE INDEX "platform_users_isActive_idx"
ON "platform_users"("isActive");

CREATE UNIQUE INDEX "platform_auth_sessions_refreshTokenHash_key"
ON "platform_auth_sessions"("refreshTokenHash");

CREATE INDEX "platform_auth_sessions_platformUserId_revokedAt_expiresAt_idx"
ON "platform_auth_sessions"("platformUserId", "revokedAt", "expiresAt");

ALTER TABLE "platform_auth_sessions"
ADD CONSTRAINT "platform_auth_sessions_platformUserId_fkey"
FOREIGN KEY ("platformUserId") REFERENCES "platform_users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
