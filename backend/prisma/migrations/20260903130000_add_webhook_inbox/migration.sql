-- AlterTable
ALTER TABLE "subscriptions"
ADD COLUMN "providerApplicationId" TEXT,
ADD COLUMN "providerCollectorId" TEXT;

-- AlterTable
ALTER TABLE "subscription_payments"
ADD COLUMN "paymentMethodId" TEXT,
ADD COLUMN "cardLastFourDigits" VARCHAR(4),
ADD COLUMN "liveMode" BOOLEAN,
ADD COLUMN "providerUpdatedAt" TIMESTAMP(3);

-- CreateEnum
CREATE TYPE "WebhookEventStatus" AS ENUM ('RECEIVED', 'PROCESSING', 'PROCESSED', 'FAILED', 'IGNORED');

-- CreateTable
CREATE TABLE "webhook_events" (
    "id" UUID NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "eventKey" VARCHAR(255) NOT NULL,
    "providerEventId" VARCHAR(255),
    "topic" VARCHAR(80) NOT NULL,
    "action" VARCHAR(100),
    "resourceId" VARCHAR(255) NOT NULL,
    "requestId" VARCHAR(255),
    "liveMode" BOOLEAN,
    "signatureValidated" BOOLEAN NOT NULL DEFAULT false,
    "payloadHash" VARCHAR(64) NOT NULL,
    "status" "WebhookEventStatus" NOT NULL DEFAULT 'RECEIVED',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "processingStartedAt" TIMESTAMP(3),
    "processedAt" TIMESTAMP(3),
    "nextAttemptAt" TIMESTAMP(3),
    "lastError" VARCHAR(1000),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "webhook_events_eventKey_key" ON "webhook_events"("eventKey");

-- CreateIndex
CREATE INDEX "webhook_events_status_nextAttemptAt_idx" ON "webhook_events"("status", "nextAttemptAt");

-- CreateIndex
CREATE INDEX "webhook_events_topic_resourceId_idx" ON "webhook_events"("topic", "resourceId");
