// Unit tests for rollFormula. The repo has no non-E2E test framework configured
// (only Playwright, whose testDir is ./e2e), so these run on Node's built-in test
// runner — zero new dependencies:
//
//   node --experimental-strip-types --test src/domain/dice/roll.test.ts
//
// Node's type-stripping loader needs the explicit ".ts" specifier, which tsc
// rejects in an `import` statement unless `allowImportingTsExtensions` is set
// project-wide. To keep this self-contained (nothing touched outside domain/dice/)
// the module under test is pulled in via createRequire, with the types recovered
// from a type-only import.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { rollFormula, SUPPORTED_DIE_FACES } =
  require("./roll.ts") as typeof import("./roll");
type Rng = import("./roll").Rng;

/** RNG that yields the given values in order, then repeats. */
function seqRng(values: number[]): Rng {
  let i = 0;
  return () => values[i++ % values.length];
}

// ─── Valid formats ─────────────────────────────────────────────────────────

test("simple valid format: 1d20", () => {
  const result = rollFormula("1d20", () => 0.4);
  assert.deepEqual(result, { total: 9, rolls: [9], modifier: 0 });
});

test("positive modifier: 2d6+3", () => {
  const result = rollFormula("2d6+3", seqRng([0, 0.99]));
  assert.deepEqual(result, { total: 10, rolls: [1, 6], modifier: 3 });
});

test("negative modifier: 1d4-1", () => {
  const result = rollFormula("1d4-1", () => 0);
  assert.deepEqual(result, { total: 0, rolls: [1], modifier: -1 });
});

test("modifier can drive the total negative", () => {
  const result = rollFormula("1d4-5", () => 0);
  assert.equal(result.total, -4);
});

test("more than one die: 8d6", () => {
  const result = rollFormula("8d6", seqRng([0, 0.5]));
  assert.equal(result.rolls.length, 8);
  assert.deepEqual(result.rolls, [1, 4, 1, 4, 1, 4, 1, 4]);
  assert.equal(result.total, 20);
  assert.equal(result.modifier, 0);
});

test("+0 modifier is honoured", () => {
  const result = rollFormula("1d8+0", () => 0);
  assert.deepEqual(result, { total: 1, rolls: [1], modifier: 0 });
});

// ─── Deterministic RNG: exact values, not just ranges ──────────────────────

test("mocked RNG produces exactly the expected roll (top of d20)", () => {
  assert.deepEqual(rollFormula("1d20", () => 0.999), {
    total: 20,
    rolls: [20],
    modifier: 0,
  });
});

test("mocked RNG produces exactly the expected roll (bottom of die)", () => {
  assert.deepEqual(rollFormula("3d10", () => 0), {
    total: 3,
    rolls: [1, 1, 1],
    modifier: 0,
  });
});

test("mocked RNG: distinct value per die in sequence", () => {
  // d6 buckets: [0,1/6)->1, [1/6,2/6)->2, ... 0.5 -> 4
  const result = rollFormula("4d6+2", seqRng([0, 0.2, 0.5, 0.85]));
  assert.deepEqual(result.rolls, [1, 2, 4, 6]);
  assert.equal(result.total, 1 + 2 + 4 + 6 + 2);
  assert.equal(result.modifier, 2);
});

test("default RNG is Math.random and stays within bounds", () => {
  for (let i = 0; i < 500; i++) {
    const { total, rolls } = rollFormula("2d20+1");
    assert.equal(rolls.length, 2);
    for (const r of rolls) {
      assert.ok(r >= 1 && r <= 20, `roll ${r} out of range`);
    }
    assert.equal(total, rolls[0] + rolls[1] + 1);
  }
});

// ─── Invalid formats ──────────────────────────────────────────────────────

test("empty formula throws", () => {
  assert.throws(() => rollFormula(""), /inválida/);
});

test("whitespace-only formula throws", () => {
  assert.throws(() => rollFormula("   "), /vacía/);
});

test("missing 'd' throws", () => {
  assert.throws(() => rollFormula("20"), /gramática/);
});

test("M outside the supported set throws (d7)", () => {
  assert.throws(() => rollFormula("1d7"), /d7 no está soportado/);
});

test("M outside the supported set throws (d3)", () => {
  assert.throws(() => rollFormula("2d3"), /no está soportado/);
});

test("non-numeric N throws", () => {
  assert.throws(() => rollFormula("xd6"), /gramática/);
});

test("non-numeric K throws", () => {
  assert.throws(() => rollFormula("1d6+x"), /gramática/);
});

test("N of zero throws", () => {
  assert.throws(() => rollFormula("0d6"), />= 1/);
});

test("mixed dice types are rejected (out of scope)", () => {
  assert.throws(() => rollFormula("1d8+1d6"), /inválida/);
});

test("keep-highest notation is rejected (out of scope)", () => {
  assert.throws(() => rollFormula("2d20kh1"), /inválida/);
});

test("modifier without a sign is rejected", () => {
  assert.throws(() => rollFormula("1d6 3"), /gramática/);
});

test("SUPPORTED_DIE_FACES is the documented set", () => {
  assert.deepEqual([...SUPPORTED_DIE_FACES], [4, 6, 8, 10, 12, 20, 100]);
});
