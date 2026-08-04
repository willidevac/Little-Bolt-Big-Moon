import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createLevelOne } from "../js/levels/level-01.js";

const level = createLevelOne();
const sections = level.sections;
assert.equal(level.height, 150000);
assert.equal(sections.length, 15);
assert.equal(sections[0].bottomY, level.height);
assert.equal(sections.at(-1).topY, 0);
assert.equal(new Set(sections.map(({ id }) => id)).size, sections.length);

sections.forEach((section, index) => {
  assert.equal(section.bottomY - section.topY, 10000);
  if (index > 0) assert.equal(section.bottomY, sections[index - 1].topY);
  assert.equal(section.backgroundLayers.length, 1);
});

const biomeCounts = Object.groupBy(sections, ({ backgroundId }) => backgroundId);
assert.deepEqual(Object.values(biomeCounts).map(({ length }) => length),
  [3, 3, 3, 3, 3]);

for (const section of sections) {
  const source = section.backgroundLayers[0].source.replace("./", "../");
  const image = await readFile(new URL(source, import.meta.url));
  assert.equal(image.readUInt32BE(16), 1024);
  assert.equal(image.readUInt32BE(20), 1536);
}

const bossRoom = level.structures.find(({ id }) => {
  return id === "moon-warden-final-arena";
});
assert.ok(bossRoom);
assert.deepEqual([bossRoom.x, bossRoom.y, bossRoom.width, bossRoom.height],
  [0, 16, 1280, 1280 * 1024 / 1536]);
assert.deepEqual(bossRoom.getCollisionBoundsList().map(({ x, y, width, height }) => {
  return [x, y, width, height];
}), [
  [48, 108, 48, 492],
  [1184, 108, 48, 492],
  [96, 60, 1088, 48],
]);

console.log("ROOM-002: 15 unique macro environments and boss room passed.");
