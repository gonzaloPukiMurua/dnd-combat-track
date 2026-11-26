import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient, Prisma, type CharacterClass } from "@prisma/client";

// A4 — carga el catálogo global de recursos de clase desde
// prisma/seed-data/class-resources.json. Idempotente: upsert por
// (characterClass, name). No borra filas que ya no estén en el JSON.
//
// Regla del repo (CLAUDE.md): antes de escribir, el script imprime contra qué
// base apunta. Por eso no usa DATABASE_URL del entorno a ciegas: hay que pasar
// --target=dev o --target=prod, y el script lee el archivo de entorno de ese
// destino y verifica el proyecto de Supabase.
//
//   npm run seed:class-resources -- --target=dev

const TARGETS = {
  dev:  { file: ".env.development.local", ref: "ukkrlecodekrjedhiooz" },
  prod: { file: ".env",                   ref: "ngintmouqpbenzhxyxjx" },
} as const;

const CLASSES: CharacterClass[] = [
  "ARTIFICER", "BARBARIAN", "BARD", "CLERIC", "DRUID", "FIGHTER", "MONK",
  "PALADIN", "RANGER", "ROGUE", "SORCERER", "WARLOCK", "WIZARD",
];

interface SeedResource {
  characterClass: CharacterClass;
  name: string;
  fromLevel: number;
  shortRestRecoveryAmount: number;
  fullRecoveryOnShortRest: boolean;
  maxByLevel: Record<string, number> | null;
  maxPerClassLevel: number | null;
  note: string | null;
  verified: boolean;
}

function validate(rows: SeedResource[]) {
  const seen = new Set<string>();
  for (const r of rows) {
    const key = `${r.characterClass}/${r.name}`;
    if (seen.has(key)) throw new Error(`Recurso duplicado en el JSON: ${key}`);
    seen.add(key);
    if (!CLASSES.includes(r.characterClass)) throw new Error(`${key}: clase inválida`);
    if (!Number.isInteger(r.fromLevel) || r.fromLevel < 1 || r.fromLevel > 7) throw new Error(`${key}: fromLevel fuera de 1–7`);
    if (!Number.isInteger(r.shortRestRecoveryAmount) || r.shortRestRecoveryAmount < 0) throw new Error(`${key}: shortRestRecoveryAmount inválido`);
    if (r.maxByLevel && r.maxPerClassLevel != null) throw new Error(`${key}: usar maxByLevel o maxPerClassLevel, no los dos`);
    for (const [lvl, max] of Object.entries(r.maxByLevel ?? {})) {
      if (!Number.isInteger(Number(lvl)) || !Number.isInteger(max) || max < 1) throw new Error(`${key}: maxByLevel inválido (${lvl}: ${max})`);
    }
  }
}

function databaseUrlFor(target: keyof typeof TARGETS): string {
  const line = readFileSync(join(__dirname, "..", TARGETS[target].file), "utf8")
    .split(/\r?\n/)
    .find((l) => l.startsWith("DATABASE_URL="));
  if (!line) throw new Error(`Falta DATABASE_URL en ${TARGETS[target].file}`);
  const url = line.slice("DATABASE_URL=".length).trim().replace(/^"|"$/g, "");
  const user = url.slice(url.indexOf("//") + 2).split(":")[0];
  const ref = user.split(".")[1];
  const host = url.slice(url.lastIndexOf("@") + 1).split("?")[0];
  console.log(`[seed:class-resources] destino=${target} host=${host} proyecto=${ref}`);
  if (ref !== TARGETS[target].ref) throw new Error(`ABORTO: ${TARGETS[target].file} no apunta al proyecto esperado (${TARGETS[target].ref})`);
  return url;
}

async function main() {
  const arg = process.argv.find((a) => a.startsWith("--target="))?.split("=")[1];
  if (arg !== "dev" && arg !== "prod") throw new Error("Indicá el destino: --target=dev o --target=prod");

  const rows: SeedResource[] = JSON.parse(readFileSync(join(__dirname, "seed-data", "class-resources.json"), "utf8"));
  validate(rows);

  const prisma = new PrismaClient({ datasourceUrl: databaseUrlFor(arg) });
  try {
    for (const r of rows) {
      const data = {
        fromLevel: r.fromLevel,
        shortRestRecoveryAmount: r.shortRestRecoveryAmount,
        fullRecoveryOnShortRest: r.fullRecoveryOnShortRest,
        maxByLevel: r.maxByLevel ?? Prisma.DbNull,
        maxPerClassLevel: r.maxPerClassLevel,
        note: r.note,
        verified: r.verified,
      };
      await prisma.classResourceTemplate.upsert({
        where:  { characterClass_name: { characterClass: r.characterClass, name: r.name } },
        update: data,
        create: { characterClass: r.characterClass, name: r.name, ...data },
      });
    }
    const [total, verified] = await Promise.all([
      prisma.classResourceTemplate.count(),
      prisma.classResourceTemplate.count({ where: { verified: true } }),
    ]);
    console.log(`[seed:class-resources] upsert OK — ${rows.length} filas procesadas (en la base: ${total}, verificadas: ${verified})`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
