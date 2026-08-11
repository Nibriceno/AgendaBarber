-- AlterTable
ALTER TABLE "businesses" ADD COLUMN     "cancellationMinimumMinutes" INTEGER NOT NULL DEFAULT 120,
ADD COLUMN     "rescheduleMinimumMinutes" INTEGER NOT NULL DEFAULT 120;
