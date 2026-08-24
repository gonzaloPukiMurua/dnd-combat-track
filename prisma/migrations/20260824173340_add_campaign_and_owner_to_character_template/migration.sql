/*
  Warnings:

  - Added the required column `campaignId` to the `CharacterTemplate` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "CharacterTemplate" ADD COLUMN     "campaignId" TEXT NOT NULL,
ADD COLUMN     "ownerId" TEXT;

-- CreateIndex
CREATE INDEX "CharacterTemplate_campaignId_idx" ON "CharacterTemplate"("campaignId");

-- CreateIndex
CREATE INDEX "CharacterTemplate_ownerId_idx" ON "CharacterTemplate"("ownerId");

-- AddForeignKey
ALTER TABLE "CharacterTemplate" ADD CONSTRAINT "CharacterTemplate_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterTemplate" ADD CONSTRAINT "CharacterTemplate_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
