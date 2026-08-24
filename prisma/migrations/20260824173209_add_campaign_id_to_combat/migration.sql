/*
  Warnings:

  - Added the required column `campaignId` to the `Combat` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Combat_status_idx";

-- AlterTable
ALTER TABLE "Combat" ADD COLUMN     "campaignId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "Combat_campaignId_status_idx" ON "Combat"("campaignId", "status");

-- AddForeignKey
ALTER TABLE "Combat" ADD CONSTRAINT "Combat_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
