import assert from "node:assert/strict";
import { createLevelOne } from "../js/levels/level-01.js";
import { TrapPlatform } from "../classes/environment/trap-platform.class.js";
import { SpriteFallingPlatform } from
  "../classes/environment/sprite-falling-platform.class.js";

const level = createLevelOne();
const traps = level.platforms.filter((platform) => {
  return platform instanceof TrapPlatform;
});
const falling = level.platforms.filter((platform) => {
  return platform instanceof SpriteFallingPlatform;
});
const reboundWalls = level.structures.filter(({ role }) => {
  return role === "wall-bounce-choke";
});
assert.equal(level.hazards.length, 0);
assert.ok(traps.length >= 12);
assert.ok(falling.length >= 18);
assert.ok(falling.every(({ warningDelaySeconds }) => warningDelaySeconds >= 1));
assert.equal(reboundWalls.length, 12);
assert.equal(reboundWalls.some(({ dangerous }) => dangerous), false);
assert.equal(reboundWalls.some(({ createHit }) => {
  return typeof createHit === "function";
}), false);

console.log("HAZ-001: Fallen und Fallböden aktiv; Pflichtschächte sicher.");
