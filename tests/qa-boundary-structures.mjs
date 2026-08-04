import assert from "node:assert/strict";
import { createLevelOne } from "../js/levels/level-01.js";

const level = createLevelOne();

const boundaries = level.structures.filter(({ role }) => {
  return role === "animated-thin-wall";
});

assert.equal(boundaries.length, 10);
assert.ok(boundaries.every(({ width }) => width === 48));
assert.equal(boundaries.filter(({ side }) => side === "left").length, 5);
assert.equal(boundaries.filter(({ side }) => side === "right").length, 5);
assert.equal(new Set(boundaries.map(({ animationFrameSeconds }) => {
  return animationFrameSeconds;
})).size, 5);

console.log("ENV-001: Five thin animated wall pairs bound the journey.");
