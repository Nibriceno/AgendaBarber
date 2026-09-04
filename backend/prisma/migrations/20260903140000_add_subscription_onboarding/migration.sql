ALTER TABLE "plan_requests"
ADD COLUMN "businessId" INTEGER,
ADD COLUMN "onboardingKey" UUID,
ADD COLUMN "onboardingTokenHash" VARCHAR(64);

CREATE UNIQUE INDEX "plan_requests_businessId_key" ON "plan_requests"("businessId");
CREATE UNIQUE INDEX "plan_requests_onboardingKey_key" ON "plan_requests"("onboardingKey");
CREATE UNIQUE INDEX "plan_requests_onboardingTokenHash_key" ON "plan_requests"("onboardingTokenHash");

ALTER TABLE "plan_requests"
ADD CONSTRAINT "plan_requests_businessId_fkey"
FOREIGN KEY ("businessId") REFERENCES "businesses"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
