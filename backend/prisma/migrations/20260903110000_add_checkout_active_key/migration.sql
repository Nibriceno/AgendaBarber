-- Use a nullable unique key to guarantee one open checkout per request while
-- keeping the rule represented in the Prisma schema.
ALTER TABLE "plan_checkouts" ADD COLUMN "activeKey" VARCHAR(64);

UPDATE "plan_checkouts"
SET "activeKey" = "planRequestId"::text
WHERE "status" IN ('CREATED', 'PENDING');

CREATE UNIQUE INDEX "plan_checkouts_activeKey_key" ON "plan_checkouts"("activeKey");
DROP INDEX "plan_checkouts_one_open_per_request_idx";
