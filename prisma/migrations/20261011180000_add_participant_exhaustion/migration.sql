-- Fatiga visible y editable durante el combate (antes solo existía en la plantilla, fuera de combate).
ALTER TABLE "CombatParticipant" ADD COLUMN "exhaustionLevel" INTEGER NOT NULL DEFAULT 0;
