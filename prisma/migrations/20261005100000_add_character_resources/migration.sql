-- P2: recursos consumibles del personaje (tabla genérica).
-- CreateEnum
CREATE TYPE "RechargeType" AS ENUM ('SHORT', 'LONG');

-- CreateTable
CREATE TABLE "CharacterResource" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "level" INTEGER,
    "max" INTEGER NOT NULL,
    "used" INTEGER NOT NULL DEFAULT 0,
    "recharge" "RechargeType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CharacterResource_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CharacterResource_templateId_idx" ON "CharacterResource"("templateId");

-- CreateIndex
CREATE UNIQUE INDEX "CharacterResource_templateId_name_key" ON "CharacterResource"("templateId", "name");

-- AddForeignKey
ALTER TABLE "CharacterResource" ADD CONSTRAINT "CharacterResource_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "CharacterTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
