import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { createLevelOne } from "../js/levels/level-01.js";

const level = createLevelOne();
const wallFeatures = level.platforms.filter(({ kind }) => {
  return kind === "wall-feature-platform";
});
const expectedAssets = [
  "scrapyard-floor-clean-hd.png",
  ...["scrapyard", "factory", "launch-tower", "space-station", "moon"]
    .flatMap((biome) => [
      `${biome}-wall-clean-hd.png`,
      `${biome}-wall-platform-clean-hd.png`,
    ]),
];

const thinWalls = level.structures.filter(({ role }) => {
  return role === "animated-thin-wall" || role === "wall-bounce-choke";
});
assert.equal(level.structures.filter(({ role }) => {
  return role === "animated-thin-wall";
}).length, 10);
assert.ok(thinWalls.every(({ width }) => width === 48));
assert.equal(level.platforms.filter(({ kind }) => kind === "floor").length, 1);
assert.equal(wallFeatures.length, 60);
assert.ok(wallFeatures.every(({ kind }) => kind === "wall-feature-platform"));
assert.ok(wallFeatures.every(({ x, width, anchorStructureId }) => {
  return x === 40 || x + width === 1240 || typeof anchorStructureId === "string";
}));
for (const biome of ["scrapyard", "factory", "launch-tower", "space-station", "moon"]) {
  const features = wallFeatures.filter(({ biomeId }) => biomeId === biome);
  assert.equal(features.length, 12);
  assert.equal(features.filter(({ width }) => width >= 400).length, 2);
  const smallCount = features.filter(({ width }) => width <= 128).length;
  assert.ok(smallCount >= 2 && smallCount <= 3);
}
for (const asset of expectedAssets) {
  await fs.access(new URL(`../img/environment/${asset}`, import.meta.url));
}

console.log("ENV-NEW-001: Thin animated walls and 60 sparse wall features passed.");
