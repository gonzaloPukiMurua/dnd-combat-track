-- CreateEnum
CREATE TYPE "ActionEconomy" AS ENUM ('ACTION', 'BONUS_ACTION', 'REACTION');

-- AlterTable
ALTER TABLE "TemplateAction" ADD COLUMN     "economyType" "ActionEconomy" NOT NULL DEFAULT 'ACTION';
