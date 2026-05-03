-- CreateEnum
CREATE TYPE "CharacterType" AS ENUM ('PLAYER', 'NPC', 'MONSTER');

-- CreateEnum
CREATE TYPE "CombatStatus" AS ENUM ('ACTIVE', 'FINISHED');

-- CreateEnum
CREATE TYPE "LogType" AS ENUM ('DAMAGE', 'HEAL', 'ATTACK', 'EFFECT');

-- CreateEnum
CREATE TYPE "RollMode" AS ENUM ('MANUAL', 'AUTO');

-- CreateTable
CREATE TABLE "CharacterTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "CharacterType" NOT NULL,
    "maxHp" INTEGER NOT NULL,
    "baseAc" INTEGER NOT NULL,
    "initiativeBonus" INTEGER NOT NULL,
    "stats" JSONB NOT NULL,
    "abilities" JSONB,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CharacterTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Group" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupMember" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "GroupMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Combat" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "CombatStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Combat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CombatParticipant" (
    "id" TEXT NOT NULL,
    "combatId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "nameOverride" TEXT,
    "currentHp" INTEGER NOT NULL,
    "tempHp" INTEGER NOT NULL DEFAULT 0,
    "baseAc" INTEGER NOT NULL,
    "acModifiers" JSONB NOT NULL,
    "initiative" INTEGER NOT NULL,
    "turnOrder" INTEGER NOT NULL,
    "conditions" JSONB NOT NULL,
    "isDead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CombatParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CombatLog" (
    "id" TEXT NOT NULL,
    "combatId" TEXT NOT NULL,
    "participantId" TEXT,
    "type" "LogType" NOT NULL,
    "value" INTEGER,
    "rollMode" "RollMode",
    "rollValue" INTEGER,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CombatLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppState" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "currentCombatId" TEXT,

    CONSTRAINT "AppState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Combat_status_idx" ON "Combat"("status");

-- CreateIndex
CREATE INDEX "CombatParticipant_combatId_idx" ON "CombatParticipant"("combatId");

-- CreateIndex
CREATE INDEX "CombatParticipant_turnOrder_idx" ON "CombatParticipant"("turnOrder");

-- CreateIndex
CREATE INDEX "CombatLog_combatId_idx" ON "CombatLog"("combatId");

-- AddForeignKey
ALTER TABLE "GroupMember" ADD CONSTRAINT "GroupMember_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupMember" ADD CONSTRAINT "GroupMember_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "CharacterTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CombatParticipant" ADD CONSTRAINT "CombatParticipant_combatId_fkey" FOREIGN KEY ("combatId") REFERENCES "Combat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CombatParticipant" ADD CONSTRAINT "CombatParticipant_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "CharacterTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CombatLog" ADD CONSTRAINT "CombatLog_combatId_fkey" FOREIGN KEY ("combatId") REFERENCES "Combat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CombatLog" ADD CONSTRAINT "CombatLog_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "CombatParticipant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
