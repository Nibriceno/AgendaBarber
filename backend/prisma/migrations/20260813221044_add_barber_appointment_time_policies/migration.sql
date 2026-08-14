-- AlterTable
ALTER TABLE "businesses" ADD COLUMN     "barberStartEarlyMinutes" INTEGER NOT NULL DEFAULT 15,
ADD COLUMN     "noShowGraceMinutes" INTEGER NOT NULL DEFAULT 15;
