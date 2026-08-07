/*
  Warnings:

  - Added the required column `displayName` to the `barbers` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "barbers" DROP CONSTRAINT "barbers_userId_fkey";

-- AlterTable
ALTER TABLE "barbers" ADD COLUMN     "displayName" TEXT NOT NULL,
ADD COLUMN     "displayOrder" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "userId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "barbers_displayOrder_idx" ON "barbers"("displayOrder");

-- AddForeignKey
ALTER TABLE "barbers" ADD CONSTRAINT "barbers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
