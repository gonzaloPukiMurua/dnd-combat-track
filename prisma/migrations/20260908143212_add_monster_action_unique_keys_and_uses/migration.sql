-- AlterTable
ALTER TABLE "TemplateAction" ADD COLUMN     "uses" INTEGER NOT NULL DEFAULT 1;

-- CreateIndex
CREATE UNIQUE INDEX "MonsterTemplate_name_key" ON "MonsterTemplate"("name");

-- CreateIndex
CREATE UNIQUE INDEX "TemplateAction_monsterTemplateId_name_key" ON "TemplateAction"("monsterTemplateId", "name");
