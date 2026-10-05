// Tests del cálculo de ficha (docs/rework/p2-reglas-personaje.md). Mismo runner y
// carga que src/domain/combat/rules.test.ts:
//
//   node --experimental-strip-types --test src/domain/character/rules.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const r = require("./rules.ts") as typeof import("./rules");

// ─── Modificadores ───────────────────────────────────────────────────────────

test("abilityModifier: tabla de referencia", () => {
  const cases: [number, number][] = [[1, -5], [8, -1], [9, -1], [10, 0], [11, 0], [14, 2], [15, 2], [16, 3], [20, 5], [30, 10]];
  for (const [score, mod] of cases) assert.equal(r.abilityModifier(score), mod, `score ${score}`);
});

test("abilityModifier: rechaza puntuaciones fuera de 1–30 o no enteras", () => {
  assert.throws(() => r.abilityModifier(0), RangeError);
  assert.throws(() => r.abilityModifier(31), RangeError);
  assert.throws(() => r.abilityModifier(10.5), RangeError);
});

// ─── Competencia ─────────────────────────────────────────────────────────────

test("proficiencyBonus: +2 en 1–4, +3 en 5–8, +4 en 9–12, +5 en 13–16, +6 en 17–20", () => {
  const expected: Record<number, number> = { 1: 2, 4: 2, 5: 3, 8: 3, 9: 4, 12: 4, 13: 5, 16: 5, 17: 6, 20: 6 };
  for (const [level, pb] of Object.entries(expected)) assert.equal(r.proficiencyBonus(Number(level)), pb, `nivel ${level}`);
});

test("proficiencyBonus: rechaza niveles fuera de 1–20", () => {
  assert.throws(() => r.proficiencyBonus(0), RangeError);
  assert.throws(() => r.proficiencyBonus(21), RangeError);
});

// ─── Salvaciones ─────────────────────────────────────────────────────────────

test("savingThrowBonus: modificador sin competencia, modificador + competencia con ella", () => {
  // Fuerza 16 (+3), nivel 5 (+3)
  assert.equal(r.savingThrowBonus({ score: 16, level: 5, proficient: false }), 3);
  assert.equal(r.savingThrowBonus({ score: 16, level: 5, proficient: true }), 6);
});

// ─── Habilidades ─────────────────────────────────────────────────────────────

test("skillBonus: competencia suma una vez, pericia suma dos veces", () => {
  // Atletismo con Fuerza 16 (+3), nivel 5 (+3)
  assert.equal(r.skillBonus({ score: 16, level: 5, proficient: false }), 3);
  assert.equal(r.skillBonus({ score: 16, level: 5, proficient: true }), 6);
  assert.equal(r.skillBonus({ score: 16, level: 5, proficient: true, expertise: true }), 9);
});

test("skillBonus: pericia sin competencia es un error de datos", () => {
  assert.throws(() => r.skillBonus({ score: 16, level: 5, proficient: false, expertise: true }), RangeError);
});

test("passiveScore: 10 + bono de habilidad", () => {
  // Percepción con Sabiduría 14 (+2), nivel 1 con competencia (+2) → 4 → pasiva 14
  const bonus = r.skillBonus({ score: 14, level: 1, proficient: true });
  assert.equal(bonus, 4);
  assert.equal(r.passiveScore(bonus), 14);
});

// ─── Tabla de habilidades ────────────────────────────────────────────────────

test("SKILLS: 18 habilidades con la característica del libro (sección 2.4)", () => {
  assert.equal(r.SKILLS.length, 18);
  const byAbility = (a: string) => r.SKILLS.filter((s) => s.ability === a).length;
  assert.equal(byAbility("str"), 1);
  assert.equal(byAbility("dex"), 3);
  assert.equal(byAbility("con"), 0);
  assert.equal(byAbility("int"), 5);
  assert.equal(byAbility("wis"), 5);
  assert.equal(byAbility("cha"), 4);
});

// ─── Conjuros ────────────────────────────────────────────────────────────────

test("spellSaveDc y spellAttackBonus: 8 + competencia + modificador, competencia + modificador", () => {
  // Inteligencia 16 (+3), nivel 5 (+3)
  assert.equal(r.spellSaveDc({ score: 16, level: 5 }), 14);
  assert.equal(r.spellAttackBonus({ score: 16, level: 5 }), 6);
});

// ─── Agotamiento ─────────────────────────────────────────────────────────────

test("exhaustionEffects: −2 × nivel en d20, −5 pies × nivel de velocidad", () => {
  assert.deepEqual(r.exhaustionEffects(0), { d20Penalty: 0, speedPenaltyFt: 0, dead: false });
  assert.deepEqual(r.exhaustionEffects(3), { d20Penalty: 6, speedPenaltyFt: 15, dead: false });
  assert.deepEqual(r.exhaustionEffects(5), { d20Penalty: 10, speedPenaltyFt: 25, dead: false });
});

test("exhaustionEffects: nivel 6 es muerte", () => {
  assert.equal(r.exhaustionEffects(6).dead, true);
});

test("exhaustionEffects: rechaza niveles fuera de 0–6", () => {
  assert.throws(() => r.exhaustionEffects(-1), RangeError);
  assert.throws(() => r.exhaustionEffects(7), RangeError);
});
