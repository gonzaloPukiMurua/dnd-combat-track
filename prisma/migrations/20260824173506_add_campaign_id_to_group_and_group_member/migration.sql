/*
  Warnings:

  - Added the required column `campaignId` to the `Group` table without a default value. This is not possible if the table is not empty.
  - Added the required column `campaignId` to the `GroupMember` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Group" ADD COLUMN     "campaignId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "GroupMember" ADD COLUMN     "campaignId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "Group_campaignId_idx" ON "Group"("campaignId");

-- CreateIndex
CREATE INDEX "GroupMember_campaignId_idx" ON "GroupMember"("campaignId");

-- AddForeignKey
ALTER TABLE "Group" ADD CONSTRAINT "Group_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupMember" ADD CONSTRAINT "GroupMember_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
