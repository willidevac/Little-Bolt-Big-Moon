import assert from "node:assert/strict";
import { createLevelOne } from "../js/levels/level-01.js";

const level = createLevelOne();

assert.equal(level.structures.some(({ id }) => id.includes("-landmark-")), false);
assert.ok(level.sections.every((section) => section.route === undefined));

console.log("ENV-003: No legacy landmark-room architecture returned.");
