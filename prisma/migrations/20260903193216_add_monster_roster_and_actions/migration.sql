-- CreateEnum
CREATE TYPE "ActionKind" AS ENUM ('ATTACK', 'HEAL');

-- AlterTable
ALTER TABLE "CombatParticipant" ADD COLUMN     "monsterTemplateId" TEXT,
ALTER COLUMN "templateId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "MonsterTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "maxHp" INTEGER NOT NULL,
    "baseAc" INTEGER NOT NULL,
    "initiativeBonus" INTEGER NOT NULL DEFAULT 0,
    "speed" INTEGER NOT NULL DEFAULT 30,
    "category" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MonsterTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TemplateAction" (
    "id" TEXT NOT NULL,
    "characterTemplateId" TEXT,
    "monsterTemplateId" TEXT,
    "name" TEXT NOT NULL,
    "kind" "ActionKind" NOT NULL,
    "attackBonus" INTEGER,
    "formula" TEXT NOT NULL,
    "damageType" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "TemplateAction_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "TemplateAction" ADD CONSTRAINT "TemplateAction_characterTemplateId_fkey" FOREIGN KEY ("characterTemplateId") REFERENCES "CharacterTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateAction" ADD CONSTRAINT "TemplateAction_monsterTemplateId_fkey" FOREIGN KEY ("monsterTemplateId") REFERENCES "MonsterTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CombatParticipant" ADD CONSTRAINT "CombatParticipant_monsterTemplateId_fkey" FOREIGN KEY ("monsterTemplateId") REFERENCES "MonsterTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
