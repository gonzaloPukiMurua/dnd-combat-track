// Tests de src/domain/campaign/join.ts.
//   node --experimental-strip-types --test src/domain/campaign/join.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const j = require("./join.ts") as typeof import("./join");

test("joinMode: quien no es miembro entra como jugador nuevo", () => {
  assert.equal(j.joinMode({ membershipRole: null, ownsCharacter: false }), "NEW_MEMBER");
});

test("joinMode: jugador miembro sin personaje puede elegir o crear uno", () => {
  assert.equal(j.joinMode({ membershipRole: "PLAYER", ownsCharacter: false }), "MEMBER_WITHOUT_CHARACTER");
});

test("joinMode: jugador con personaje y DM se rechazan", () => {
  assert.equal(j.joinMode({ membershipRole: "PLAYER", ownsCharacter: true }), "REJECT");
  assert.equal(j.joinMode({ membershipRole: "DM", ownsCharacter: false }), "REJECT");
  assert.equal(j.joinMode({ membershipRole: "DM", ownsCharacter: true }), "REJECT");
});
