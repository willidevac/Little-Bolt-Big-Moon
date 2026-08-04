import assert from "node:assert/strict";
import { createLevelOne } from "../js/levels/level-01.js";

const level = createLevelOne();

const floor = level.platforms[0];
const wallFeatures = level.platforms.filter(({ kind }) => {
  return kind === "wall-feature-platform";
});

assert.equal(floor.kind, "floor");
assert.equal(floor.width, level.width);
assert.equal(wallFeatures.length, 60);
assert.ok(wallFeatures.every(({ anchorSide }) => {
  return anchorSide === "left" || anchorSide === "right";
}));

console.log("MAP-001: Wall features stay sparse and separate from the jump route.");
