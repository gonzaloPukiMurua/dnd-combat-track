// Tests de recursos consumibles (src/domain/character/resources.ts).
//   node --experimental-strip-types --test src/domain/character/resources.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const r = require("./resources.ts") as typeof import("./resources");

const slot = { max: 3, used: 1, shortRestRecoveryAmount: 0, fullRecoveryOnShortRest: false };
const furia = { max: 2, used: 2, shortRestRecoveryAmount: 0, fullRecoveryOnShortRest: true };
const segundoAire = { max: 2, used: 2, shortRestRecoveryAmount: 1, fullRecoveryOnShortRest: false };

test("spendResource: suma usos hasta el máximo", () => {
  assert.equal(r.spendResource(slot, 1), 2);
  assert.equal(r.spendResource({ ...slot, used: 2 }, 1), 3);
});

test("spendResource: no supera el máximo", () => {
  assert.throws(() => r.spendResource({ ...slot, used: 3 }, 1), RangeError);
  assert.throws(() => r.spendResource(slot, 3), RangeError);
});

test("restoreResource: no baja de cero", () => {
  assert.equal(r.restoreResource(slot, 1), 0);
  assert.equal(r.restoreResource(slot, 5), 0);
  assert.equal(r.restoreResource(furia, 1), 1);
});

test("setUsed: valida entero entre 0 y el máximo", () => {
  assert.equal(r.setUsed(slot, 0), 0);
  assert.equal(r.setUsed(slot, 3), 3);
  assert.throws(() => r.setUsed(slot, 4), RangeError);
  assert.throws(() => r.setUsed(slot, -1), RangeError);
  assert.throws(() => r.setUsed(slot, 1.5), RangeError);
});

test("usedAfterRest LARGO: todo vuelve a estar disponible", () => {
  assert.equal(r.usedAfterRest(slot, "LONG"), 0);
  assert.equal(r.usedAfterRest(furia, "LONG"), 0);
});

test("usedAfterRest CORTO: recupera según la regla del recurso", () => {
  assert.equal(r.usedAfterRest(furia, "SHORT"), 0);   // recupera todo con el corto
  assert.equal(r.usedAfterRest(slot, "SHORT"), 1);    // solo con el largo → queda como está
});

test("usedAfterRest CORTO parcial: Segundo Aire recupera 1 uso, sin bajar de 0", () => {
  assert.equal(r.usedAfterRest(segundoAire, "SHORT"), 1);
  assert.equal(r.usedAfterRest({ ...segundoAire, used: 0 }, "SHORT"), 0);
  assert.equal(r.usedAfterRest(segundoAire, "LONG"), 0);
});

test("rechargeLabel: describe las tres reglas", () => {
  assert.equal(r.rechargeLabel(slot), "recupera con descanso largo");
  assert.equal(r.rechargeLabel(furia), "recupera todo con descanso corto");
  assert.equal(r.rechargeLabel(segundoAire), "recupera 1 uso con descanso corto, todo con largo");
});

test("rechargeMode: deduce la regla desde los dos campos", () => {
  assert.equal(r.rechargeMode(slot), "LONG");
  assert.equal(r.rechargeMode(furia), "SHORT_FULL");
  assert.equal(r.rechargeMode(segundoAire), "SHORT_PARTIAL");
});

const base = { shortRestRecoveryAmount: 1, fullRecoveryOnShortRest: false, maxPerClassLevel: null };

test("suggestedMax: toma el último umbral alcanzado", () => {
  const rage = { ...base, fromLevel: 1, maxByLevel: { "1": 2, "3": 3, "6": 4 } };
  assert.equal(r.suggestedMax(rage, 1), 2);
  assert.equal(r.suggestedMax(rage, 2), 2);
  assert.equal(r.suggestedMax(rage, 5), 3);
  assert.equal(r.suggestedMax(rage, 7), 4);
});

test("suggestedMax: proporcional al nivel, con tope 100, y null si no aplica", () => {
  const layOnHands = { ...base, fromLevel: 1, maxByLevel: null, maxPerClassLevel: 5 };
  assert.equal(r.suggestedMax(layOnHands, 7), 35);
  assert.equal(r.suggestedMax({ ...layOnHands, maxPerClassLevel: 30 }, 7), 100);
  const bardic = { ...base, fromLevel: 1, maxByLevel: null };
  assert.equal(r.suggestedMax(bardic, 4), null); // depende del mod. de CAR
  const channel = { ...base, fromLevel: 2, maxByLevel: { "2": 2 } };
  assert.equal(r.suggestedMax(channel, 1), null); // todavía no lo tiene
});
