-- Add the pending onboarding state without changing the default for existing flows.
ALTER TYPE "BusinessStatus" ADD VALUE IF NOT EXISTS 'PENDING' BEFORE 'ACTIVE';

CREATE TYPE "BillingInterval" AS ENUM ('MONTH', 'YEAR');
CREATE TYPE "PaymentProvider" AS ENUM ('MERCADO_PAGO');
CREATE TYPE "SubscriptionStatus" AS ENUM ('PENDING', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'SUSPENDED');
CREATE TYPE "SubscriptionPaymentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELED', 'REFUNDED', 'CHARGED_BACK', 'ERROR');

-- Evolve the existing plan catalog in place so prices and identifiers are preserved.
DROP INDEX "plan_configs_plan_key";
ALTER TABLE "plan_configs" ALTER COLUMN "plan" TYPE TEXT USING "plan"::TEXT;
ALTER TABLE "plan_configs" RENAME COLUMN "plan" TO "code";
ALTER TABLE "plan_configs" RENAME COLUMN "basePrice" TO "priceAmount";
ALTER TABLE "plan_configs" RENAME COLUMN "isActive" TO "active";
ALTER TABLE "plan_configs" ADD COLUMN "description" VARCHAR(1000);
ALTER TABLE "plan_configs" ADD COLUMN "currency" VARCHAR(3) NOT NULL DEFAULT 'CLP';
ALTER TABLE "plan_configs" ADD COLUMN "interval" "BillingInterval" NOT NULL DEFAULT 'MONTH';
ALTER TABLE "plan_configs" ADD COLUMN "intervalCount" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "plan_configs" ADD COLUMN "features" JSONB;
ALTER TABLE "plan_configs" ADD COLUMN "limits" JSONB;
ALTER TABLE "plan_configs" ADD COLUMN "mercadoPagoPlanId" TEXT;

UPDATE "plan_configs"
SET
  "description" = CASE "code"
    WHEN 'ESSENTIAL' THEN 'Para negocios que quieren ordenar su agenda y empezar a crecer.'
    WHEN 'PRO' THEN 'Para equipos con mayor operación que necesitan una agenda centralizada.'
    ELSE 'Plan de AgendaYa.'
  END,
  "features" = CASE "code"
    WHEN 'ESSENTIAL' THEN '["Página de reservas personalizada", "Agenda y horarios del equipo", "Servicios y profesionales", "Reservas, cancelaciones y reprogramaciones", "Panel administrativo"]'::JSONB
    WHEN 'PRO' THEN '["Todo lo incluido en Esencial", "Hasta 12 integrantes", "Gestión central del equipo", "Seguimiento de reservas y actividad", "Acompañamiento en la configuración"]'::JSONB
    ELSE '[]'::JSONB
  END,
  "limits" = jsonb_build_object(
    'minimumTeamSize', "minimumTeamSize",
    'maximumTeamSize', "maximumTeamSize"
  );

ALTER TABLE "plan_configs" ALTER COLUMN "description" SET NOT NULL;
ALTER TABLE "plan_configs" ALTER COLUMN "features" SET NOT NULL;

CREATE UNIQUE INDEX "plan_configs_code_key" ON "plan_configs"("code");
CREATE UNIQUE INDEX "plan_configs_mercadoPagoPlanId_key" ON "plan_configs"("mercadoPagoPlanId");

-- Discounts now reference the data-driven plan instead of the legacy enum.
DROP INDEX "plan_discounts_plan_autoApply_isActive_startsAt_endsAt_idx";
ALTER TABLE "plan_discounts" ADD COLUMN "planId" INTEGER;
UPDATE "plan_discounts" AS discount
SET "planId" = plan."id"
FROM "plan_configs" AS plan
WHERE discount."plan"::TEXT = plan."code";
ALTER TABLE "plan_discounts" ALTER COLUMN "planId" SET NOT NULL;
ALTER TABLE "plan_discounts" DROP COLUMN "plan";
CREATE INDEX "plan_discounts_planId_autoApply_isActive_startsAt_endsAt_idx"
  ON "plan_discounts"("planId", "autoApply", "isActive", "startsAt", "endsAt");
ALTER TABLE "plan_discounts"
  ADD CONSTRAINT "plan_discounts_planId_fkey"
  FOREIGN KEY ("planId") REFERENCES "plan_configs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "subscriptions" (
  "id" UUID NOT NULL,
  "businessId" INTEGER NOT NULL,
  "planId" INTEGER NOT NULL,
  "discountId" INTEGER,
  "discountName" TEXT,
  "promoCode" TEXT,
  "ownerUserId" INTEGER,
  "provider" "PaymentProvider" NOT NULL,
  "providerSubscriptionId" TEXT,
  "providerPayerId" TEXT,
  "providerStatus" TEXT,
  "providerStatusDetail" TEXT,
  "providerUpdatedAt" TIMESTAMP(3),
  "status" "SubscriptionStatus" NOT NULL DEFAULT 'PENDING',
  "activeKey" VARCHAR(64),
  "baseAmount" INTEGER NOT NULL,
  "discountAmount" INTEGER NOT NULL DEFAULT 0,
  "amount" INTEGER NOT NULL,
  "currency" VARCHAR(3) NOT NULL,
  "interval" "BillingInterval" NOT NULL,
  "intervalCount" INTEGER NOT NULL,
  "authorizationUrl" VARCHAR(1000),
  "paymentMethodId" TEXT,
  "currentPeriodStart" TIMESTAMP(3),
  "currentPeriodEnd" TIMESTAMP(3),
  "nextPaymentAt" TIMESTAMP(3),
  "pastDueAt" TIMESTAMP(3),
  "graceEndsAt" TIMESTAMP(3),
  "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
  "cancellationRequestedAt" TIMESTAMP(3),
  "canceledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "subscriptions_activeKey_key" ON "subscriptions"("activeKey");
CREATE UNIQUE INDEX "subscriptions_provider_providerSubscriptionId_key"
  ON "subscriptions"("provider", "providerSubscriptionId");
CREATE INDEX "subscriptions_businessId_status_idx" ON "subscriptions"("businessId", "status");
CREATE INDEX "subscriptions_planId_status_idx" ON "subscriptions"("planId", "status");
CREATE INDEX "subscriptions_nextPaymentAt_idx" ON "subscriptions"("nextPaymentAt");
CREATE INDEX "subscriptions_graceEndsAt_idx" ON "subscriptions"("graceEndsAt");

ALTER TABLE "subscriptions"
  ADD CONSTRAINT "subscriptions_businessId_fkey"
  FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "subscriptions"
  ADD CONSTRAINT "subscriptions_planId_fkey"
  FOREIGN KEY ("planId") REFERENCES "plan_configs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "subscriptions"
  ADD CONSTRAINT "subscriptions_discountId_fkey"
  FOREIGN KEY ("discountId") REFERENCES "plan_discounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "subscriptions"
  ADD CONSTRAINT "subscriptions_ownerUserId_fkey"
  FOREIGN KEY ("ownerUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "subscription_payments" (
  "id" UUID NOT NULL,
  "subscriptionId" UUID NOT NULL,
  "provider" "PaymentProvider" NOT NULL,
  "providerPaymentId" TEXT NOT NULL,
  "providerInvoiceId" TEXT,
  "amount" INTEGER NOT NULL,
  "currency" VARCHAR(3) NOT NULL,
  "status" "SubscriptionPaymentStatus" NOT NULL,
  "rawStatus" TEXT,
  "rawStatusDetail" TEXT,
  "periodStart" TIMESTAMP(3),
  "periodEnd" TIMESTAMP(3),
  "paidAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "subscription_payments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "subscription_payments_provider_providerPaymentId_key"
  ON "subscription_payments"("provider", "providerPaymentId");
CREATE UNIQUE INDEX "subscription_payments_provider_providerInvoiceId_key"
  ON "subscription_payments"("provider", "providerInvoiceId");
CREATE INDEX "subscription_payments_subscriptionId_createdAt_idx"
  ON "subscription_payments"("subscriptionId", "createdAt");
CREATE INDEX "subscription_payments_status_createdAt_idx"
  ON "subscription_payments"("status", "createdAt");

ALTER TABLE "subscription_payments"
  ADD CONSTRAINT "subscription_payments_subscriptionId_fkey"
  FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
