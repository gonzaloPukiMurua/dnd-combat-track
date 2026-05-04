/*
  Warnings:

  - The values [ATTACK,EFFECT] on the enum `LogType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `abilities` on the `CharacterTemplate` table. All the data in the column will be lost.
  - You are about to drop the column `source` on the `CharacterTemplate` table. All the data in the column will be lost.
  - You are about to drop the column `stats` on the `CharacterTemplate` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `CharacterTemplate` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `CombatLog` table. All the data in the column will be lost.
  - You are about to drop the column `participantId` on the `CombatLog` table. All the data in the column will be lost.
  - You are about to drop the column `rollMode` on the `CombatLog` table. All the data in the column will be lost.
  - You are about to drop the column `rollValue` on the `CombatLog` table. All the data in the column will be lost.
  - You are about to drop the column `value` on the `CombatLog` table. All the data in the column will be lost.
  - You are about to drop the column `isDead` on the `CombatParticipant` table. All the data in the column will be lost.
  - You are about to drop the column `nameOverride` on the `CombatParticipant` table. All the data in the column will be lost.
  - You are about to drop the `AppState` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Group` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `GroupMember` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `round` to the `CombatLog` table without a default value. This is not possible if the table is not empty.
  - Added the required column `displayName` to the `CombatParticipant` table without a default value. This is not possible if the table is not empty.
  - Added the required column `maxHp` to the `CombatParticipant` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "CombatStatus" ADD VALUE 'SETUP';

-- AlterEnum
BEGIN;
CREATE TYPE "LogType_new" AS ENUM ('DAMAGE', 'HEAL', 'CONDITION_ADDED', 'CONDITION_REMOVED', 'NOTE');
ALTER TABLE "CombatLog" ALTER COLUMN "type" TYPE "LogType_new" USING ("type"::text::"LogType_new");
ALTER TYPE "LogType" RENAME TO "LogType_old";
ALTER TYPE "LogType_new" RENAME TO "LogType";
DROP TYPE "LogType_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "CombatLog" DROP CONSTRAINT "CombatLog_participantId_fkey";

-- DropForeignKey
ALTER TABLE "GroupMember" DROP CONSTRAINT "GroupMember_groupId_fkey";

-- DropForeignKey
ALTER TABLE "GroupMember" DROP CONSTRAINT "GroupMember_templateId_fkey";

-- DropIndex
DROP INDEX "CombatParticipant_turnOrder_idx";

-- AlterTable
ALTER TABLE "CharacterTemplate" DROP COLUMN "abilities",
DROP COLUMN "source",
DROP COLUMN "stats",
DROP COLUMN "updatedAt",
ALTER COLUMN "initiativeBonus" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "Combat" ADD COLUMN     "currentTurnIndex" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "round" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "status" SET DEFAULT 'SETUP';

-- AlterTable
ALTER TABLE "CombatLog" DROP COLUMN "description",
DROP COLUMN "participantId",
DROP COLUMN "rollMode",
DROP COLUMN "rollValue",
DROP COLUMN "value",
ADD COLUMN     "actorId" TEXT,
ADD COLUMN     "amount" INTEGER,
ADD COLUMN     "note" TEXT,
ADD COLUMN     "round" INTEGER NOT NULL,
ADD COLUMN     "targetId" TEXT;

-- AlterTable
ALTER TABLE "CombatParticipant" DROP COLUMN "isDead",
DROP COLUMN "nameOverride",
ADD COLUMN     "displayName" TEXT NOT NULL,
ADD COLUMN     "isConscious" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "maxHp" INTEGER NOT NULL,
ALTER COLUMN "acModifiers" SET DEFAULT '[]',
ALTER COLUMN "initiative" SET DEFAULT 0,
ALTER COLUMN "turnOrder" SET DEFAULT 0,
ALTER COLUMN "conditions" SET DEFAULT '[]';

-- DropTable
DROP TABLE "AppState";

-- DropTable
DROP TABLE "Group";

-- DropTable
DROP TABLE "GroupMember";

-- DropEnum
DROP TYPE "RollMode";

-- CreateIndex
CREATE INDEX "CombatLog_combatId_round_idx" ON "CombatLog"("combatId", "round");

-- CreateIndex
CREATE INDEX "CombatParticipant_combatId_turnOrder_idx" ON "CombatParticipant"("combatId", "turnOrder");

-- AddForeignKey
ALTER TABLE "CombatLog" ADD CONSTRAINT "CombatLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "CombatParticipant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CombatLog" ADD CONSTRAINT "CombatLog_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "CombatParticipant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
