CREATE TYPE "BusinessStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'INACTIVE');

ALTER TABLE "businesses"
ADD COLUMN "status" "BusinessStatus",
ADD COLUMN "statusChangedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "statusReason" VARCHAR(1000),
ADD COLUMN "suspendedAt" TIMESTAMP(3),
ADD COLUMN "inactivatedAt" TIMESTAMP(3);

UPDATE "businesses"
SET
    "status" = CASE
        WHEN "isActive" = true AND "deletedAt" IS NULL
            THEN 'ACTIVE'::"BusinessStatus"
        ELSE 'INACTIVE'::"BusinessStatus"
    END,
    "inactivatedAt" = CASE
        WHEN "isActive" = false THEN COALESCE("deletedAt", "updatedAt")
        ELSE NULL
    END;

ALTER TABLE "businesses"
ALTER COLUMN "status" SET NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'ACTIVE';

DROP INDEX "businesses_isActive_idx";

ALTER TABLE "businesses"
DROP COLUMN "isActive";

CREATE INDEX "businesses_status_idx"
ON "businesses"("status");
