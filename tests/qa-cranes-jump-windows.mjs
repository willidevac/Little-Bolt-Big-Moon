import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { createLevelOne } from "../js/levels/level-01.js";
import { CranePlatform } from
  "../classes/environment/crane-platform.class.js";
import { JumpWindowStructure } from
  "../classes/environment/jump-window-structure.class.js";

const level = createLevelOne();
const cranes = level.platforms.filter((platform) => {
  return platform instanceof CranePlatform;
});
const windows = level.structures.filter((structure) => {
  return structure instanceof JumpWindowStructure;
});

assert.equal(cranes.length, 7);
assert.equal(cranes.filter(({ biomeId }) => biomeId === "scrapyard").length, 3);
assert.equal(cranes.filter(({ biomeId }) => biomeId === "factory").length, 4);
assert.deepEqual(new Set(cranes.map(({ axis }) => axis)),
  new Set(["horizontal", "vertical"]));
assert.ok(cranes.every(({ spriteConfig, cableLengthPixels }) => {
  return spriteConfig.frameCount === 4 && cableLengthPixels >= 220;
}));

const movingCrane = cranes.find(({ axis }) => axis === "horizontal");
movingCrane.update(movingCrane.cycleSeconds / 4);
assert.ok(movingCrane.getFrameDisplacement().x > 0);
assert.equal(movingCrane.getFrameDisplacement().y, 0);
const craneDrawCalls = [];
movingCrane.image = {
  naturalWidth: movingCrane.spriteConfig.frameWidth,
  naturalHeight: movingCrane.spriteConfig.frameHeight * 4,
};
movingCrane.imageState = "ready";
movingCrane.draw({
  save() {}, restore() {}, fillRect() {},
  drawImage(...args) { craneDrawCalls.push(args); },
});
const craneSpriteDraw = craneDrawCalls[0];
assert.ok(Math.abs(
  craneSpriteDraw[6] + craneSpriteDraw[8] * movingCrane.surfaceRatio -
  movingCrane.y,
) < 0.01);

assert.equal(windows.length, 7);
assert.equal(windows.filter(({ biomeId }) => biomeId === "factory").length, 3);
assert.equal(windows.filter(({ biomeId }) => {
  return biomeId === "launch-tower";
}).length, 4);
windows.forEach((window) => {
  const colliders = window.getCollisionBoundsList();
  const lower = level.platforms.find(({ id }) => id === window.lowerPlatformId);
  const upper = level.platforms.find(({ id }) => id === window.upperPlatformId);
  const pathCenter = (centerX(lower) + centerX(upper)) / 2;
  const expectedSurfaceY = window.y + Math.round(
    window.height * window.surfaceOffsetRatio,
  );
  assert.equal(colliders.length, 4);
  assert.ok(pathCenter >= window.openingX + 80);
  assert.ok(pathCenter <= window.openingX + window.openingWidth - 80);
  assert.equal(colliders[1].x + colliders[1].width, window.openingX);
  assert.equal(colliders[2].x, window.openingX + window.openingWidth);
  assert.equal(colliders[1].y, expectedSurfaceY);
  assert.equal(colliders[2].y, expectedSurfaceY);
  assert.equal(colliders[0].y, window.y);
  assert.equal(colliders[3].y, window.y);
  assert.ok(lower.y - upper.y >= 280);
  const initialPosition = { x: window.x, y: window.y };
  window.update(window.animationFrameSeconds * 2);
  assert.deepEqual({ x: window.x, y: window.y }, initialPosition);
  assert.equal(window.frameIndex, 0);
});

for (const entity of [...cranes, ...windows]) {
  const source = entity.spriteConfig.source.replace(/^\.\//, "../");
  const image = await fs.readFile(new URL(source, import.meta.url));
  const columns = Math.floor(image.readUInt32BE(16) /
    entity.spriteConfig.frameWidth);
  const rows = Math.floor(image.readUInt32BE(20) /
    entity.spriteConfig.frameHeight);
  assert.ok(columns * rows >= 4);
}

console.log("VAR-001: Moving cranes and fixed jump windows passed.");

function centerX(platform) {
  return platform.x + platform.width / 2;
}
