import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { GAME_CONFIG } from "../js/config/game-config.js";
import { createLevelOne } from "../js/levels/level-01.js";

const level = createLevelOne(GAME_CONFIG.enemies);
const structures = level.structures;
const sources = new Set(structures.map(({ atlas }) => atlas.config.source));
const roles = new Set(structures.map(({ role }) => role));
const collidable = structures.filter((structure) => {
  return structure.getCollisionBoundsList().length > 0;
});
const rendererSource = await fs.readFile(
  "classes/systems/world-renderer.class.js",
  "utf8",
);

assert.ok(structures.length >= 200);
assert.equal(new Set(structures.map(({ id }) => id)).size, structures.length);
assert.equal(sources.size, 10);
assert.deepEqual([...roles].sort(), [
  "arch", "corner", "facade", "ledge", "overhead", "tower", "wall",
]);
assert.ok(collidable.length >= 80);
assert.ok(structures.every(staysInsideWorld));
assert.doesNotMatch(rendererSource, /BoundaryStructureRenderer|fillRect\(/);

console.log("ENV-001: 90 Clean-HD architecture parts create varied rooms.");

function staysInsideWorld(structure) {
  return structure.x >= 0 && structure.x + structure.width <= level.width &&
    structure.y >= 0 && structure.y + structure.height <= level.height;
}
