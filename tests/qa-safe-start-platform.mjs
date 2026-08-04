import assert from "node:assert/strict";
import { createLevelOne } from "../js/levels/level-01.js";

const level = createLevelOne();

const floor = level.platforms[0];
assert.equal(floor.id, "scrapyard-continuous-start-floor");
assert.equal(floor.x, 0);
assert.equal(floor.width, level.width);
assert.equal(level.playerStart.y + 55, floor.y);

console.log("FB-001: The new scrapyard floor safely spans the full world.");
