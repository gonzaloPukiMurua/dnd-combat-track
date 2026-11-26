-- A4: catálogo global de recursos de clase (catalogo-recursos-clase.md §4). Solo crea una tabla: no toca datos.
-- CreateTable
CREATE TABLE "ClassResourceTemplate" (
    "id" TEXT NOT NULL,
    "characterClass" "CharacterClass" NOT NULL,
    "name" TEXT NOT NULL,
    "fromLevel" INTEGER NOT NULL DEFAULT 1,
    "shortRestRecoveryAmount" INTEGER NOT NULL DEFAULT 0,
    "fullRecoveryOnShortRest" BOOLEAN NOT NULL DEFAULT false,
    "maxByLevel" JSONB,
    "maxPerClassLevel" INTEGER,
    "note" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClassResourceTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClassResourceTemplate_characterClass_name_key" ON "ClassResourceTemplate"("characterClass", "name");

