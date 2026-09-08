import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient, type ActionKind } from "@prisma/client";
import { rollFormula } from "../src/domain/dice/roll";

// Loads the global monster roster from prisma/seed-data/monsters.json into
// MonsterTemplate + TemplateAction. Idempotent, same criterion as
// e2e/global-setup.ts: upsert monsters by `name` and actions by the
// (monsterTemplateId, name) unique key, so re-running changes nothing.
//
// Known limitation (not addressed in this pass): an action removed from the
// JSON is NOT deleted from the DB — it just stops being updated.
//
// Run with: npm run seed:monsters

interface SeedAction {
  name: string;
  kind: ActionKind;
  attackBonus?: number;
  formula: string;
  damageType?: string;
  uses?: number;
}

interface SeedMonster {
  name: string;
  maxHp: number;
  baseAc: number;
  initiativeBonus?: number;
  speed?: number;
  category?: string;
  notes?: string;
  actions?: SeedAction[];
}

function validate(monsters: SeedMonster[]) {
  const seen = new Set<string>();
  for (const m of monsters) {
    if (seen.has(m.name)) throw new Error(`Monstruo duplicado en el JSON: "${m.name}"`);
    seen.add(m.name);

    const actionNames = new Set<string>();
    for (const a of m.actions ?? []) {
      if (actionNames.has(a.name)) {
        throw new Error(`Acción duplicada en "${m.name}": "${a.name}"`);
      }
      actionNames.add(a.name);

      if (a.kind === "ATTACK" && typeof a.attackBonus !== "number") {
        throw new Error(`"${m.name}" → "${a.name}": una acción ATTACK necesita attackBonus`);
      }
      if (a.kind === "HEAL" && a.attackBonus != null) {
        throw new Error(`"${m.name}" → "${a.name}": una acción HEAL no lleva attackBonus`);
      }
      if (a.uses != null && (!Number.isInteger(a.uses) || a.uses < 1)) {
        throw new Error(`"${m.name}" → "${a.name}": "uses" debe ser un entero >= 1`);
      }
      // Fail loud at seed time rather than at roll time in combat.
      rollFormula(a.formula);
    }
  }
}

async function main() {
  const file = join(__dirname, "seed-data", "monsters.json");
  const monsters: SeedMonster[] = JSON.parse(readFileSync(file, "utf8"));
  validate(monsters);

  const prisma = new PrismaClient();
  try {
    let monsterCount = 0;
    let actionCount = 0;

    for (const m of monsters) {
      const data = {
        maxHp: m.maxHp,
        baseAc: m.baseAc,
        initiativeBonus: m.initiativeBonus ?? 0,
        speed: m.speed ?? 30,
        category: m.category ?? null,
        notes: m.notes ?? null,
      };

      const monster = await prisma.monsterTemplate.upsert({
        where: { name: m.name },
        update: data,
        create: { name: m.name, ...data },
      });
      monsterCount++;

      const actions = m.actions ?? [];
      for (let i = 0; i < actions.length; i++) {
        const a = actions[i];
        const actionData = {
          kind: a.kind,
          attackBonus: a.kind === "ATTACK" ? a.attackBonus ?? null : null,
          formula: a.formula,
          damageType: a.damageType ?? null,
          uses: a.uses ?? 1,
          order: i,
        };

        await prisma.templateAction.upsert({
          where: {
            monsterTemplateId_name: { monsterTemplateId: monster.id, name: a.name },
          },
          update: actionData,
          create: { monsterTemplateId: monster.id, name: a.name, ...actionData },
        });
        actionCount++;
      }

      console.log(`[seed:monsters] "${m.name}" (${monster.id}) — ${actions.length} acción/es`);
    }

    const [monstersInDb, actionsInDb] = await Promise.all([
      prisma.monsterTemplate.count(),
      prisma.templateAction.count({ where: { monsterTemplateId: { not: null } } }),
    ]);

    console.log(
      `[seed:monsters] upsert OK — ${monsterCount} monstruos / ${actionCount} acciones procesadas ` +
        `(DB ahora: ${monstersInDb} monstruos, ${actionsInDb} acciones de monstruo)`
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
