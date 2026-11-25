// Tests de clase, nivel, dados de golpe y descanso largo (src/domain/character/progression.ts).
//   node --experimental-strip-types --test src/domain/character/progression.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const p = require("./progression.ts") as typeof import("./progression");
const rules = require("./rules.ts") as typeof import("./rules");

test("HIT_DIE: un dado por cada una de las 12 clases", () => {
  assert.equal(Object.keys(p.HIT_DIE).length, 12);
  assert.equal(p.HIT_DIE.BARBARIAN, 12);
  assert.equal(p.HIT_DIE.FIGHTER, 10);
  assert.equal(p.HIT_DIE.ROGUE, 8);
  assert.equal(p.HIT_DIE.WIZARD, 6);
  for (const c of p.CHARACTER_CLASSES) assert.ok(p.CLASS_LABELS[c], `falta etiqueta de ${c}`);
});

test("hitDiceLabel: nivel × dado de la clase", () => {
  assert.equal(p.hitDiceLabel("CLERIC", 3), "3d8");
  assert.equal(p.hitDiceLabel("BARBARIAN", 7), "7d12");
});

test("isCharacterClass: solo acepta los valores del enum", () => {
  assert.equal(p.isCharacterClass("WARLOCK"), true);
  assert.equal(p.isCharacterClass("Brujo"), false);
  assert.equal(p.isCharacterClass(null), false);
});

test("levelError PLAYER: 1 a 7", () => {
  assert.equal(p.levelError({ type: "PLAYER", level: 1 }), null);
  assert.equal(p.levelError({ type: "PLAYER", level: 7 }), null);
  assert.match(p.levelError({ type: "PLAYER", level: 8 }) ?? "", /máximo/);
  assert.match(p.levelError({ type: "PLAYER", level: 0 }) ?? "", /mayor o igual a 1/);
  assert.match(p.levelError({ type: "PLAYER", level: 2.5 }) ?? "", /entero/);
});

test("levelError PLAYER con nivel guardado mayor al tope (7.2): se mantiene o baja, no sube", () => {
  assert.equal(p.levelError({ type: "PLAYER", level: 8, storedLevel: 8 }), null);
  assert.equal(p.levelError({ type: "PLAYER", level: 7, storedLevel: 8 }), null);
  assert.notEqual(p.levelError({ type: "PLAYER", level: 9, storedLevel: 8 }), null);
  assert.notEqual(p.levelError({ type: "PLAYER", level: 8, storedLevel: 4 }), null);
});

test("levelError NPC y MONSTER: 1 a 20", () => {
  assert.equal(p.levelError({ type: "NPC", level: 12 }), null);
  assert.equal(p.levelError({ type: "MONSTER", level: 20 }), null);
  assert.notEqual(p.levelError({ type: "MONSTER", level: 21 }), null);
});

test("proficiencyForLevel: igual a proficiencyBonus en rango, acotado fuera de rango", () => {
  assert.equal(rules.proficiencyForLevel(4), 2);
  assert.equal(rules.proficiencyForLevel(5), 3);
  assert.equal(rules.proficiencyForLevel(8), 3);
  assert.equal(rules.proficiencyForLevel(0), 2);
  assert.equal(rules.proficiencyForLevel(25), 6);
});

test("spendHitDice: suma usados hasta el nivel", () => {
  assert.equal(p.spendHitDice({ level: 3, hitDiceUsed: 0, count: 2 }), 2);
  assert.equal(p.spendHitDice({ level: 3, hitDiceUsed: 2, count: 1 }), 3);
  assert.throws(() => p.spendHitDice({ level: 3, hitDiceUsed: 3, count: 1 }), RangeError);
  assert.throws(() => p.spendHitDice({ level: 3, hitDiceUsed: 0, count: 0 }), RangeError);
});

test("longRestState: PG completos, dados y PG temporales a cero, −1 agotamiento", () => {
  assert.deepEqual(p.longRestState({ exhaustionLevel: 3 }), {
    currentHp: null, tempHp: 0, hitDiceUsed: 0, exhaustionLevel: 2,
  });
  assert.equal(p.longRestState({ exhaustionLevel: 0 }).exhaustionLevel, 0);
});

test("hitDiceHeal: suma la tirada sin pasar el máximo y cuenta los dados", () => {
  const base = { characterClass: "FIGHTER" as const, level: 5, hitDiceUsed: 1, conModifier: 2, maxHp: 44, currentHp: 20 };
  assert.deepEqual(p.hitDiceHeal({ ...base, count: 2, rolledTotal: 15 }), { ok: true, hitDiceUsed: 3, currentHp: 35 });
  assert.deepEqual(p.hitDiceHeal({ ...base, count: 2, rolledTotal: 24, currentHp: 40 }), { ok: true, hitDiceUsed: 3, currentHp: 44 });
  assert.deepEqual(p.hitDiceHeal({ ...base, count: 1, rolledTotal: 5, currentHp: null }), { ok: true, hitDiceUsed: 2, currentHp: 44 });
});

test("hitDiceHeal: rechaza sin clase, sin dados y tiradas imposibles", () => {
  const base = { characterClass: "WIZARD" as const, level: 3, hitDiceUsed: 0, conModifier: 1, maxHp: 20, currentHp: 5 };
  assert.equal(p.hitDiceHeal({ ...base, characterClass: null, count: 1, rolledTotal: 3 }).ok, false);
  assert.equal(p.hitDiceHeal({ ...base, hitDiceUsed: 3, count: 1, rolledTotal: 3 }).ok, false);
  assert.equal(p.hitDiceHeal({ ...base, count: 1, rolledTotal: 8 }).ok, false); // d6 + 1 = 7 como máximo
  assert.equal(p.hitDiceHeal({ ...base, count: 1, rolledTotal: 7 }).ok, true);
  assert.equal(p.hitDiceHeal({ ...base, count: 1, rolledTotal: -1 }).ok, false);
  assert.equal(p.hitDiceHeal({ ...base, count: 0, rolledTotal: 0 }).ok, false);
});
