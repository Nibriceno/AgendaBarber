-- AlterEnum
ALTER TYPE "PlanRequestStatus" ADD VALUE IF NOT EXISTS 'CHECKOUT_PENDING';
ALTER TYPE "PlanRequestStatus" ADD VALUE IF NOT EXISTS 'PAID';
ALTER TYPE "PlanRequestStatus" ADD VALUE IF NOT EXISTS 'PAYMENT_REVERSED';

-- CreateEnum
CREATE TYPE "PlanDiscountType" AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT');

-- CreateEnum
CREATE TYPE "PlanPaymentStatus" AS ENUM ('CREATED', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'REFUNDED', 'CHARGED_BACK', 'ERROR');

-- CreateTable
CREATE TABLE "plan_configs" (
    "id" SERIAL NOT NULL,
    "plan" "SubscriptionPlan" NOT NULL,
    "name" TEXT NOT NULL,
    "basePrice" INTEGER NOT NULL,
    "minimumTeamSize" INTEGER NOT NULL,
    "maximumTeamSize" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "plan_configs_pkey" PRIMARY KEY ("id")
);

-- SeedPlanConfigs
INSERT INTO "plan_configs" ("plan", "name", "basePrice", "minimumTeamSize", "maximumTeamSize", "updatedAt")
VALUES
    ('ESSENTIAL', 'Esencial', 19990, 1, 5, CURRENT_TIMESTAMP),
    ('PRO', 'Equipo', 29990, 6, 12, CURRENT_TIMESTAMP);

-- CreateTable
CREATE TABLE "plan_discounts" (
    "id" SERIAL NOT NULL,
    "plan" "SubscriptionPlan" NOT NULL,
    "name" TEXT NOT NULL,
    "type" "PlanDiscountType" NOT NULL,
    "value" INTEGER NOT NULL,
    "code" TEXT,
    "autoApply" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "plan_discounts_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "plan_requests" ADD COLUMN "basePrice" INTEGER;
ALTER TABLE "plan_requests" ADD COLUMN "discountAmount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "plan_requests" ADD COLUMN "discountId" INTEGER;
ALTER TABLE "plan_requests" ADD COLUMN "promoCode" TEXT;
ALTER TABLE "plan_requests" ADD COLUMN "checkoutTokenHash" VARCHAR(64);
UPDATE "plan_requests" SET "basePrice" = "monthlyPrice" WHERE "basePrice" IS NULL;
ALTER TABLE "plan_requests" ALTER COLUMN "basePrice" SET NOT NULL;

-- CreateTable
CREATE TABLE "plan_checkouts" (
    "id" UUID NOT NULL,
    "planRequestId" INTEGER NOT NULL,
    "plan" "SubscriptionPlan" NOT NULL,
    "basePrice" INTEGER NOT NULL,
    "discountAmount" INTEGER NOT NULL,
    "finalAmount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'CLP',
    "discountId" INTEGER,
    "discountName" TEXT,
    "promoCode" TEXT,
    "status" "PlanPaymentStatus" NOT NULL DEFAULT 'CREATED',
    "mercadoPagoPreferenceId" TEXT,
    "mercadoPagoPaymentId" TEXT,
    "mercadoPagoStatus" TEXT,
    "mercadoPagoStatusDetail" TEXT,
    "initPoint" VARCHAR(1000),
    "liveMode" BOOLEAN,
    "expiresAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "plan_checkouts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "plan_configs_plan_key" ON "plan_configs"("plan");
CREATE UNIQUE INDEX "plan_discounts_code_key" ON "plan_discounts"("code");
CREATE INDEX "plan_discounts_plan_autoApply_isActive_startsAt_endsAt_idx" ON "plan_discounts"("plan", "autoApply", "isActive", "startsAt", "endsAt");
CREATE UNIQUE INDEX "plan_requests_checkoutTokenHash_key" ON "plan_requests"("checkoutTokenHash");
CREATE UNIQUE INDEX "plan_checkouts_mercadoPagoPreferenceId_key" ON "plan_checkouts"("mercadoPagoPreferenceId");
CREATE UNIQUE INDEX "plan_checkouts_mercadoPagoPaymentId_key" ON "plan_checkouts"("mercadoPagoPaymentId");
CREATE INDEX "plan_checkouts_planRequestId_createdAt_idx" ON "plan_checkouts"("planRequestId", "createdAt");
CREATE INDEX "plan_checkouts_status_createdAt_idx" ON "plan_checkouts"("status", "createdAt");
CREATE UNIQUE INDEX "plan_checkouts_one_open_per_request_idx"
ON "plan_checkouts"("planRequestId")
WHERE "status" IN ('CREATED', 'PENDING');

-- AddForeignKey
ALTER TABLE "plan_requests" ADD CONSTRAINT "plan_requests_discountId_fkey" FOREIGN KEY ("discountId") REFERENCES "plan_discounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "plan_checkouts" ADD CONSTRAINT "plan_checkouts_planRequestId_fkey" FOREIGN KEY ("planRequestId") REFERENCES "plan_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "plan_checkouts" ADD CONSTRAINT "plan_checkouts_discountId_fkey" FOREIGN KEY ("discountId") REFERENCES "plan_discounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
