-- Fase A, tramo A1 (docs/rework/fase-a-plan.md §4).
-- No borra datos: solo agrega columnas y una tabla, y convierte la recarga de recursos.
-- La columna "recharge" queda nula y sin uso; se elimina en una migración de limpieza posterior.

-- CreateEnum
CREATE TYPE "CharacterClass" AS ENUM ('BARBARIAN', 'BARD', 'CLERIC', 'DRUID', 'FIGHTER', 'MONK', 'PALADIN', 'RANGER', 'ROGUE', 'SORCERER', 'WARLOCK', 'WIZARD');

-- AlterTable
ALTER TABLE "CharacterTemplate" ADD COLUMN     "armorName" TEXT,
ADD COLUMN     "backstory" TEXT,
ADD COLUMN     "build" TEXT,
ADD COLUMN     "characterClass" "CharacterClass",
ADD COLUMN     "eyeColor" TEXT,
ADD COLUMN     "hairColor" TEXT,
ADD COLUMN     "height" TEXT,
ADD COLUMN     "hitDiceUsed" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "silver" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "skinColor" TEXT,
ADD COLUMN     "subclass" TEXT,
ADD COLUMN     "tempHp" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "CharacterResource" ADD COLUMN     "fullRecoveryOnShortRest" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "shortRestRecoveryAmount" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "recharge" DROP NOT NULL;

-- CreateTable
CREATE TABLE "CharacterTrait" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CharacterTrait_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CharacterTrait_templateId_idx" ON "CharacterTrait"("templateId");

-- AddForeignKey
ALTER TABLE "CharacterTrait" ADD CONSTRAINT "CharacterTrait_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "CharacterTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Conversión de datos: recarga SHORT = recupera todo con descanso corto.
-- LONG queda con los valores por defecto (0 / false): no recupera con descanso corto.
UPDATE "CharacterResource" SET "fullRecoveryOnShortRest" = true WHERE "recharge" = 'SHORT';
