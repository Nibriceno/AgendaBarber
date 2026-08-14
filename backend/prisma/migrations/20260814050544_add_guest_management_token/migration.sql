/*
  Warnings:

  - A unique constraint covering the columns `[managementTokenHash]` on the table `appointments` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "appointments" ADD COLUMN     "managementTokenHash" VARCHAR(64);

-- CreateIndex
CREATE UNIQUE INDEX "appointments_managementTokenHash_key" ON "appointments"("managementTokenHash");
