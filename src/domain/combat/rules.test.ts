// Unit tests for the pure combat rules in rules.ts. Same runner and loading
// approach as src/domain/dice/roll.test.ts (Node built-in test runner, zero deps):
//
//   node --experimental-strip-types --test src/domain/combat/rules.test.ts
//
// These pin the CURRENT behavior of rules.ts, so a refactor that changes a rule
// fails here instead of in a live combat. Where a rule is a decision the docs
// don't settle, the test says so.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const rules = require("./rules.ts") as typeof import("./rules");

// ─── Damage / heal / temp HP ───────────────────────────────────────────────

test("applyDamage: temp HP absorbs damage before current HP", () => {
  const r = rules.applyDamage({ currentHp: 10, tempHp: 4 }, 6);
  assert.deepEqual(r, { currentHp: 8, tempHp: 0, isConscious: true });
});

test("applyDamage: damage never drops HP below 0 and marks unconscious", () => {
  const r = rules.applyDamage({ currentHp: 3, tempHp: 0 }, 50);
  assert.deepEqual(r, { currentHp: 0, tempHp: 0, isConscious: false });
});

test("applyDamage: damage fully absorbed by temp HP leaves current HP alone", () => {
  const r = rules.applyDamage({ currentHp: 5, tempHp: 10 }, 4);
  assert.deepEqual(r, { currentHp: 5, tempHp: 6, isConscious: true });
});

test("applyHeal: caps at maxHp", () => {
  const r = rules.applyHeal({ currentHp: 18, maxHp: 20 }, 10);
  assert.equal(r.currentHp, 20);
  assert.equal(r.regainedConsciousness, false);
});

test("applyHeal: regaining consciousness resets death saves and stabilization", () => {
  const r = rules.applyHeal({ currentHp: 0, maxHp: 20 }, 3);
  assert.deepEqual(r, {
    currentHp: 3,
    isConscious: true,
    regainedConsciousness: true,
    deathSaveSuccesses: 0,
    deathSaveFailures: 0,
    isStabilized: false,
  });
});

test("applyHeal: healing a conscious target does not touch death saves", () => {
  const r = rules.applyHeal({ currentHp: 5, maxHp: 20 }, 3);
  assert.equal("deathSaveSuccesses" in r, false);
});

test("applyTempHp: keeps the larger value, never stacks", () => {
  assert.equal(rules.applyTempHp({ tempHp: 5 }, 3), 5);
  assert.equal(rules.applyTempHp({ tempHp: 2 }, 7), 7);
});

// ─── Conditions ─────────────────────────────────────────────────────────────

test("addCondition: ignores duplicates case-insensitively", () => {
  const before = [{ name: "Prone" }];
  assert.equal(rules.addCondition(before, "prone"), before);
});

test("addCondition: appends a new condition", () => {
  assert.deepEqual(rules.addCondition([{ name: "Prone" }], "Poisoned"), [
    { name: "Prone" },
    { name: "Poisoned" },
  ]);
});

test("removeCondition: removes case-insensitively", () => {
  assert.deepEqual(
    rules.removeCondition([{ name: "Prone" }, { name: "Poisoned" }], "PRONE"),
    [{ name: "Poisoned" }]
  );
});

// ─── Death saves ────────────────────────────────────────────────────────────

test("applyDeathSave: third success stabilizes", () => {
  const r = rules.applyDeathSave(
    { deathSaveSuccesses: 2, deathSaveFailures: 1, isStabilized: false },
    "success"
  );
  assert.deepEqual(r, { deathSaveSuccesses: 3, deathSaveFailures: 1, isStabilized: true });
});

test("applyDeathSave: failures cap at 3", () => {
  const r = rules.applyDeathSave(
    { deathSaveSuccesses: 0, deathSaveFailures: 3, isStabilized: false },
    "failure"
  );
  assert.equal(r.deathSaveFailures, 3);
});

// ─── Initiative → turn order ────────────────────────────────────────────────

test("computeTurnOrder: sorts by initiative descending", () => {
  const order = rules.computeTurnOrder([
    { id: "a", initiative: 10, initiativeBonus: 0 },
    { id: "b", initiative: 18, initiativeBonus: 0 },
    { id: "c", initiative: 14, initiativeBonus: 0 },
  ]);
  assert.deepEqual(order, [
    { id: "b", turnOrder: 0 },
    { id: "c", turnOrder: 1 },
    { id: "a", turnOrder: 2 },
  ]);
});

test("computeTurnOrder: ties break by higher initiativeBonus first", () => {
  const order = rules.computeTurnOrder([
    { id: "low", initiative: 12, initiativeBonus: 0 },
    { id: "high", initiative: 12, initiativeBonus: 3 },
  ]);
  assert.deepEqual(order.map((o) => o.id), ["high", "low"]);
});

// ─── Turn order with death saves ────────────────────────────────────────────

test("activeTurnOrder: excludes participants with 3 death-save failures", () => {
  const active = rules.activeTurnOrder([
    { id: "a", turnOrder: 0, deathSaveFailures: 0 },
    { id: "dead", turnOrder: 1, deathSaveFailures: 3 },
    { id: "b", turnOrder: 2, deathSaveFailures: 0 },
  ]);
  assert.deepEqual(active.map((p) => p.id), ["a", "b"]);
});

test("computeCurrentActor: unconscious-but-not-dead keeps its turn (DECISION S2-12)", () => {
  // A downed character with 2 failures still occupies its slot in the rotation:
  // that turn is the signal to roll the death save.
  const people = [
    { id: "a", turnOrder: 0, deathSaveFailures: 0 },
    { id: "downed", turnOrder: 1, deathSaveFailures: 2 },
  ];
  assert.equal(rules.computeCurrentActor(people, 1)?.id, "downed");
});

test("computeCurrentActor: returns null when everyone is dead", () => {
  assert.equal(
    rules.computeCurrentActor([{ id: "x", turnOrder: 0, deathSaveFailures: 3 }], 0),
    null
  );
});

test("computeCurrentActor: clamps an out-of-range index to the last actor", () => {
  const people = [
    { id: "a", turnOrder: 0, deathSaveFailures: 0 },
    { id: "b", turnOrder: 1, deathSaveFailures: 0 },
  ];
  assert.equal(rules.computeCurrentActor(people, 99)?.id, "b");
});

// ─── Advancing and relocating turns ─────────────────────────────────────────

test("computeAdvanceTurn: moves to the next actor within the same round", () => {
  const people = [
    { id: "a", turnOrder: 0, deathSaveFailures: 0 },
    { id: "b", turnOrder: 1, deathSaveFailures: 0 },
  ];
  assert.deepEqual(rules.computeAdvanceTurn(people, 0, 1), {
    nextIndex: 1,
    nextRound: 1,
    nextActorId: "b",
  });
});

test("computeAdvanceTurn: wrapping past the last actor increments the round", () => {
  const people = [
    { id: "a", turnOrder: 0, deathSaveFailures: 0 },
    { id: "b", turnOrder: 1, deathSaveFailures: 0 },
  ];
  assert.deepEqual(rules.computeAdvanceTurn(people, 1, 1), {
    nextIndex: 0,
    nextRound: 2,
    nextActorId: "a",
  });
});

test("computeAdvanceTurn: skips participants removed by 3 death-save failures", () => {
  const people = [
    { id: "a", turnOrder: 0, deathSaveFailures: 0 },
    { id: "dead", turnOrder: 1, deathSaveFailures: 3 },
    { id: "b", turnOrder: 2, deathSaveFailures: 0 },
  ];
  assert.equal(rules.computeAdvanceTurn(people, 0, 1)?.nextActorId, "b");
});

test("relocateCurrentActor: follows the actor's id after a reorder", () => {
  // "b" was at position 1; after the reorder it is at position 0.
  const reordered = [
    { id: "b", turnOrder: 0, deathSaveFailures: 0 },
    { id: "a", turnOrder: 1, deathSaveFailures: 0 },
  ];
  assert.equal(rules.relocateCurrentActor(reordered, "b", 1), 0);
});

test("relocateCurrentActor: falls back to the index when the actor is gone", () => {
  const people = [{ id: "a", turnOrder: 0, deathSaveFailures: 0 }];
  assert.equal(rules.relocateCurrentActor(people, "gone", 5), 0);
});
