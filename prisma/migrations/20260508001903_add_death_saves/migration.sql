-- AlterTable
ALTER TABLE "CombatParticipant" ADD COLUMN     "deathSaveFailures" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "deathSaveSuccesses" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "isStabilized" BOOLEAN NOT NULL DEFAULT false;
