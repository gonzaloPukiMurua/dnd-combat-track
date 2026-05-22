/*
  Warnings:

  - A unique constraint covering the columns `[joinCode]` on the table `Combat` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Combat" ADD COLUMN     "isPublic" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "joinCode" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Combat_joinCode_key" ON "Combat"("joinCode");

-- CreateIndex
CREATE INDEX "Combat_joinCode_idx" ON "Combat"("joinCode");
