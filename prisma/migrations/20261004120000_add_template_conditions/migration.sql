-- P2 / D-2: condiciones persistentes del personaje entre combates.
ALTER TABLE "CharacterTemplate" ADD COLUMN "conditions" JSONB NOT NULL DEFAULT '[]';
