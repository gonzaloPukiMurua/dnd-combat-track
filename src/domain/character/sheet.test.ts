// Tests de la ficha calculada (buildSheet, en src/domain/character/rules.ts).
//   node --experimental-strip-types --test src/domain/character/sheet.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const s = require("./rules.ts") as typeof import("./rules");

const base = {
  level: 5,
  scores: { str: 16, dex: 14, con: 12, int: 10, wis: 14, cha: 8 },
  saveProficiencies: ["str", "con"] as const,
  skillProficiencies: ["Atletismo", "Percepción"] as const,
  skillExpertise: ["Percepción"] as const,
  spellcastingAbility: null,
  exhaustionLevel: 0,
};

test("buildSheet: bono de competencia y modificadores", () => {
  const sheet = s.buildSheet(base);
  assert.equal(sheet.proficiencyBonus, 3); // nivel 5
  assert.deepEqual(sheet.abilities.map((a) => a.modifier), [3, 2, 1, 0, 2, -1]);
});

test("buildSheet: salvaciones con y sin competencia", () => {
  const sheet = s.buildSheet(base);
  const str = sheet.saves.find((x) => x.key === "str")!;
  const dex = sheet.saves.find((x) => x.key === "dex")!;
  assert.deepEqual({ bonus: str.bonus, proficient: str.proficient }, { bonus: 6, proficient: true }); // +3 mod +3 competencia
  assert.deepEqual({ bonus: dex.bonus, proficient: dex.proficient }, { bonus: 2, proficient: false });
});

test("buildSheet: habilidades, pericia y percepción pasiva", () => {
  const sheet = s.buildSheet(base);
  assert.equal(sheet.skills.length, 18);
  const atletismo = sheet.skills.find((x) => x.name === "Atletismo")!;
  assert.equal(atletismo.bonus, 6); // Fuerza +3, competencia +3
  const percepcion = sheet.skills.find((x) => x.name === "Percepción")!;
  assert.equal(percepcion.bonus, 8); // Sabiduría +2, competencia +3, pericia +3
  assert.equal(sheet.passivePerception, 18); // 10 + 8
});

test("buildSheet: CD y ataque de conjuro solo si hay característica de lanzamiento", () => {
  assert.equal(s.buildSheet(base).spell, null);
  const caster = s.buildSheet({ ...base, spellcastingAbility: "int" });
  // Inteligencia 10 (+0), nivel 5 (+3)
  assert.deepEqual(caster.spell, { saveDc: 11, attackBonus: 3 });
});

test("buildSheet: agotamiento se traduce a penalizaciones", () => {
  const sheet = s.buildSheet({ ...base, exhaustionLevel: 2 });
  assert.deepEqual(sheet.exhaustion, { d20Penalty: 4, speedPenaltyFt: 10, dead: false });
});

test("buildSheet: pericia sin competencia es un error de datos", () => {
  assert.throws(() => s.buildSheet({ ...base, skillProficiencies: [], skillExpertise: ["Percepción"] }), RangeError);
});
