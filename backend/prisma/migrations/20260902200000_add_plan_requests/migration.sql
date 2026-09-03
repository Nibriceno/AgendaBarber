-- CreateEnum
CREATE TYPE "SubscriptionPlan" AS ENUM ('ESSENTIAL', 'PRO');

-- CreateEnum
CREATE TYPE "BusinessCategory" AS ENUM ('BARBERSHOP', 'HAIR_SALON', 'NAIL_SALON', 'BEAUTY_CENTER', 'MASSAGE_CENTER', 'OTHER');

-- CreateEnum
CREATE TYPE "LeadContactPreference" AS ENUM ('WHATSAPP', 'EMAIL', 'EITHER');

-- CreateEnum
CREATE TYPE "PlanRequestStatus" AS ENUM ('NEW', 'CONTACTED', 'CONVERTED', 'CLOSED');

-- CreateTable
CREATE TABLE "plan_requests" (
    "id" SERIAL NOT NULL,
    "plan" "SubscriptionPlan" NOT NULL,
    "monthlyPrice" INTEGER NOT NULL,
    "teamSize" INTEGER NOT NULL,
    "businessName" TEXT NOT NULL,
    "businessCategory" "BusinessCategory" NOT NULL,
    "desiredSlug" TEXT,
    "contactName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "contactPreference" "LeadContactPreference" NOT NULL,
    "notes" VARCHAR(1000),
    "status" "PlanRequestStatus" NOT NULL DEFAULT 'NEW',
    "contactedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plan_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "plan_requests_status_createdAt_idx" ON "plan_requests"("status", "createdAt");

-- CreateIndex
CREATE INDEX "plan_requests_email_createdAt_idx" ON "plan_requests"("email", "createdAt");
