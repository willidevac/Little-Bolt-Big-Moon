import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { createLevelOne } from "../js/levels/level-01.js";

const level = createLevelOne();
const walls = level.structures.filter(({ role }) => {
  return role === "early-trickshot-wall";
});

assert.equal(walls.length, 11);
assert.equal(walls.filter(({ biomeId }) => biomeId === "scrapyard").length, 5);
assert.equal(walls.filter(({ biomeId }) => biomeId === "factory").length, 6);
assert.ok(Math.max(...walls.filter(({ biomeId }) => {
  return biomeId === "scrapyard";
}).map(({ y, height }) => y + height)) >= 148000);
assert.ok(walls.every(({ width }) => width === 64));
assert.ok(walls.every(({ anchorPlatformId, height, side }) => {
  const anchor = level.platforms.find(({ id }) => id === anchorPlatformId);
  const wall = walls.find((candidate) => {
    return candidate.anchorPlatformId === anchorPlatformId;
  });
  return anchor && height >= 240 && anchor.y === wall.y + height &&
    (side === "left" || side === "right");
}));
assert.ok(walls.every(({ role, dangerous, createHit }) => {
  return role === "early-trickshot-wall" && !dangerous &&
    typeof createHit !== "function";
}));
assert.ok(walls.every(({ spriteConfig }) => {
  return spriteConfig?.frameCount === 4 &&
    spriteConfig.source.endsWith("-trickshot-wall-clean-hd.png");
}));

for (const targetBiomeId of ["scrapyard", "factory"]) {
  const wall = walls.find(({ biomeId }) => biomeId === targetBiomeId);
  const relativeSource = wall.spriteConfig.source.replace(/^\.\//, "../");
  const image = await fs.readFile(new URL(relativeSource, import.meta.url));
  const imageWidth = image.readUInt32BE(16);
  const imageHeight = image.readUInt32BE(20);
  assert.ok(Math.floor(imageWidth / wall.spriteConfig.frameWidth) >= 4);
  assert.ok(Math.floor(imageHeight / wall.spriteConfig.frameHeight) >= 1);
}

const animatedWall = walls.find(({ side }) => side === "left");
const drawCalls = [];
const lightCalls = [];
animatedWall.image = {
  naturalWidth: animatedWall.spriteConfig.frameWidth * 4,
  naturalHeight: animatedWall.spriteConfig.frameHeight,
};
animatedWall.imageState = "ready";
const context = {
  save() {}, restore() {},
  drawImage(...args) { drawCalls.push(args); },
  fillRect(...args) { lightCalls.push(args); },
};
animatedWall.draw(context, {});
animatedWall.update(animatedWall.animationFrameSeconds + 0.01);
animatedWall.draw(context, {});
assert.deepEqual(drawCalls[0].slice(1), [
  0, 0,
  animatedWall.spriteConfig.frameWidth,
  animatedWall.spriteConfig.frameHeight,
  animatedWall.x, animatedWall.y, animatedWall.width, animatedWall.height,
]);
assert.equal(drawCalls[1][1], 0);
assert.equal(animatedWall.frameIndex, 0);
assert.ok(lightCalls.length >= 6);

console.log("MAP-TEST-003: Optional early trickshot walls are floor-mounted.");
