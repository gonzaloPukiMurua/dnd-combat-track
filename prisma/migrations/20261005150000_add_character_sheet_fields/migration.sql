-- P2 / D-8: competencias y característica de lanzamiento del personaje (marcadas a mano).
ALTER TABLE "CharacterTemplate"
  ADD COLUMN "saveProficiencies" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "skillProficiencies" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "skillExpertise" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "spellcastingAbility" TEXT;
