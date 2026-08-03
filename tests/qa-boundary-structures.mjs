import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { GAME_CONFIG } from "../js/config/game-config.js";
import { createLevelOne } from "../js/levels/level-01.js";
import levelData from "../data/levels/level-01.json" with { type: "json" };

const level = createLevelOne(GAME_CONFIG.enemies);
const structures = level.structures;
const EXPECTED_STRUCTURE_COUNT = 210;
const expectedSourceCount = new Set([
  ...levelData.roomTemplates.map(({ source }) => source),
  ...levelData.rooms.map(({ source }) => source),
]).size;
const sources = new Set(structures.map(({ spriteConfig }) => {
  return spriteConfig.source;
}));
const roles = new Set(structures.map(({ role }) => role));
const collidable = structures.filter((structure) => {
  return structure.getCollisionBoundsList().length > 0;
});
const rendererSource = await fs.readFile(
  "classes/systems/world-renderer.class.js",
  "utf8",
);

assert.equal(structures.length, EXPECTED_STRUCTURE_COUNT);
assert.equal(new Set(structures.map(({ id }) => id)).size, structures.length);
assert.ok(structures.every(isAuthoredArchitecture));
assert.equal(sources.size, expectedSourceCount);
assert.deepEqual([...roles], ["authored-room"]);
assert.equal(collidable.length, structures.length);
assert.ok(structures.every(staysInsideWorld));
assert.doesNotMatch(rendererSource, /BoundaryStructureRenderer|fillRect\(/);

console.log("ENV-001: 210 cohesive HD room pieces cover the full journey.");

function isAuthoredArchitecture(structure) {
  return structure.role === "authored-room";
}

function staysInsideWorld(structure) {
  return structure.x >= 0 && structure.x + structure.width <= level.width &&
    structure.y >= 0 && structure.y + structure.height <= level.height;
}
