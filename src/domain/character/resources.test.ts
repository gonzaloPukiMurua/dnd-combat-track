// Tests de recursos consumibles (src/domain/character/resources.ts).
//   node --experimental-strip-types --test src/domain/character/resources.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const r = require("./resources.ts") as typeof import("./resources");

const slot = { max: 3, used: 1, recharge: "LONG" as const };
const furia = { max: 2, used: 2, recharge: "SHORT" as const };

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

test("usedAfterRest CORTO: solo recupera los de recarga corta", () => {
  assert.equal(r.usedAfterRest(furia, "SHORT"), 0);   // recarga SHORT → vuelve
  assert.equal(r.usedAfterRest(slot, "SHORT"), 1);    // recarga LONG → queda como está
});
