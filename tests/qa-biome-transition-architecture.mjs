import assert from "node:assert/strict";
import { GAME_CONFIG } from "../js/config/game-config.js";
import { createLevelOne } from "../js/levels/level-01.js";

const TRANSITIONS = Object.freeze([
  Object.freeze({ id: "scrapyard-to-factory", boundaryY: 120000 }),
  Object.freeze({ id: "factory-to-launch-tower", boundaryY: 90000 }),
  Object.freeze({ id: "launch-tower-to-space-station", boundaryY: 60000 }),
  Object.freeze({ id: "space-station-to-moon", boundaryY: 30000 }),
]);
const level = createLevelOne(GAME_CONFIG.enemies);
const gates = level.structures.filter(({ id }) => id.startsWith("biome-gate-"));
const sources = new Set(gates.map(({ atlas }) => atlas.config.source));

assert.equal(gates.length, TRANSITIONS.length * 3);
assert.equal(sources.size, 8);
TRANSITIONS.forEach(assertGate);

console.log("ENV-005: Four mixed-biome gates mark every HD crossfade.");

function assertGate(transition) {
  const prefix = `biome-gate-${transition.id}-`;
  const parts = gates.filter(({ id }) => id.startsWith(prefix));
  assert.equal(parts.length, 3);
  assert.deepEqual(parts.map(({ role }) => role).sort(), [
    "arch", "corner", "corner",
  ]);
  parts.forEach((part) => {
    assert.equal(part.y + part.height, transition.boundaryY + 112);
    assert.equal(part.getCollisionBoundsList().length, 0);
    assert.ok(part.x >= 0 && part.x + part.width <= level.width);
  });
}
