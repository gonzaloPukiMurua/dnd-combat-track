// Tests de validación de datos de la ficha (src/domain/character/details.ts).
//   node --experimental-strip-types --test src/domain/character/details.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const d = require("./details.ts") as typeof import("./details");

test("validatePlayerDetails: recorta, vacío → null, plata entera", () => {
  const r = d.validatePlayerDetails({ eyeColor: "  verdes ", hairColor: "", backstory: "Huérfana de Puerto Gris.", silver: "120" });
  assert.equal(r.ok, true);
  if (!r.ok) return;
  assert.equal(r.data.eyeColor, "verdes");
  assert.equal(r.data.hairColor, null);
  assert.equal(r.data.skinColor, null);
  assert.equal(r.data.backstory, "Huérfana de Puerto Gris.");
  assert.equal(r.data.silver, 120);
});

test("validatePlayerDetails: historia de 300 pasa, de 301 falla", () => {
  assert.equal(d.validatePlayerDetails({ backstory: "a".repeat(300), silver: 0 }).ok, true);
  const r = d.validatePlayerDetails({ backstory: "a".repeat(301), silver: 0 });
  assert.equal(r.ok, false);
  if (!r.ok) assert.match(r.error, /300/);
});

test("validatePlayerDetails: dato físico largo y plata inválida fallan", () => {
  assert.equal(d.validatePlayerDetails({ height: "x".repeat(41), silver: 0 }).ok, false);
  assert.equal(d.validatePlayerDetails({ silver: -1 }).ok, false);
  assert.equal(d.validatePlayerDetails({ silver: 1.5 }).ok, false);
  assert.equal(d.validatePlayerDetails({ silver: "abc" }).ok, false);
  assert.equal(d.validatePlayerDetails({ silver: 7, eyeColor: 3 }).ok, false);
});

test("validateDmDetails: subclase y armadura opcionales con tope", () => {
  const r = d.validateDmDetails({ subclass: "Campeón", armorName: "" });
  assert.deepEqual(r, { ok: true, data: { subclass: "Campeón", armorName: null } });
  assert.equal(d.validateDmDetails({ armorName: "x".repeat(41) }).ok, false);
});

test("validateTrait: nombre obligatorio, descripción hasta 300", () => {
  assert.deepEqual(d.validateTrait({ name: " Furia ", description: "" }), { ok: true, data: { name: "Furia", description: null } });
  assert.equal(d.validateTrait({ name: "  " }).ok, false);
  assert.equal(d.validateTrait({ name: "Furia", description: "a".repeat(301) }).ok, false);
});
