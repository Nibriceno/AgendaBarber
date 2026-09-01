-- CreateTable
CREATE TABLE "business_invitations" (
    "id" SERIAL NOT NULL,
    "businessId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "invitedByPlatformUserId" INTEGER,
    "email" TEXT NOT NULL,
    "tokenHash" VARCHAR(64) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_invitations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "business_invitations_userId_key" ON "business_invitations"("userId");
CREATE UNIQUE INDEX "business_invitations_tokenHash_key" ON "business_invitations"("tokenHash");
CREATE INDEX "business_invitations_businessId_acceptedAt_revokedAt_idx" ON "business_invitations"("businessId", "acceptedAt", "revokedAt");
CREATE INDEX "business_invitations_email_expiresAt_idx" ON "business_invitations"("email", "expiresAt");

ALTER TABLE "business_invitations" ADD CONSTRAINT "business_invitations_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "business_invitations" ADD CONSTRAINT "business_invitations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "business_invitations" ADD CONSTRAINT "business_invitations_invitedByPlatformUserId_fkey" FOREIGN KEY ("invitedByPlatformUserId") REFERENCES "platform_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
