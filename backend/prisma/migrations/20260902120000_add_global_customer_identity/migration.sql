CREATE TABLE "customer_identities" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_identities_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "customer_identities_email_key"
ON "customer_identities"("email");

CREATE INDEX "customer_identities_phone_idx"
ON "customer_identities"("phone");

ALTER TABLE "users"
ADD COLUMN "customerIdentityId" UUID;

WITH registered_clients AS (
    SELECT DISTINCT ON (LOWER("email"))
        LOWER("email") AS normalized_email,
        "phone",
        "createdAt"
    FROM "users"
    WHERE "role" = 'CLIENT'
      AND "isRegistered" = TRUE
      AND "email" IS NOT NULL
      AND "deletedAt" IS NULL
    ORDER BY LOWER("email"), "createdAt" ASC, "id" ASC
), identities AS (
    SELECT
        (
            SUBSTRING(MD5(normalized_email), 1, 8) || '-' ||
            SUBSTRING(MD5(normalized_email), 9, 4) || '-' ||
            SUBSTRING(MD5(normalized_email), 13, 4) || '-' ||
            SUBSTRING(MD5(normalized_email), 17, 4) || '-' ||
            SUBSTRING(MD5(normalized_email), 21, 12)
        )::UUID AS id,
        normalized_email,
        "phone",
        "createdAt"
    FROM registered_clients
)
INSERT INTO "customer_identities" ("id", "email", "phone", "createdAt", "updatedAt")
SELECT id, normalized_email, "phone", "createdAt", CURRENT_TIMESTAMP
FROM identities;

UPDATE "users" AS users
SET "customerIdentityId" = identities."id"
FROM "customer_identities" AS identities
WHERE users."role" = 'CLIENT'
  AND users."email" IS NOT NULL
  AND LOWER(users."email") = identities."email"
  AND users."deletedAt" IS NULL;

CREATE INDEX "users_customerIdentityId_idx"
ON "users"("customerIdentityId");

ALTER TABLE "users"
ADD CONSTRAINT "users_customerIdentityId_fkey"
FOREIGN KEY ("customerIdentityId") REFERENCES "customer_identities"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
