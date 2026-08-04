import assert from "node:assert/strict";
import fs from "node:fs";
import { createLevelOne } from "../js/levels/level-01.js";

const DIMENSIONS = Object.freeze({
  scrapyard: Object.freeze([1024, 182]),
  factory: Object.freeze([1024, 175]),
  "launch-tower": Object.freeze([1024, 231]),
  "space-station": Object.freeze([1024, 185]),
  moon: Object.freeze([1024, 213]),
});

const level = createLevelOne();
const stages = level.platforms.filter(({ kind }) => {
  return kind === "combat-staging-platform";
});

assert.equal(stages.length, 8);
Object.entries(DIMENSIONS).forEach(([biomeId, dimensions]) => {
  assertNativePng(biomeId, dimensions);
});
stages.forEach(assertProportionalRuntimeSize);

console.log("ART-NEW-001: Fünf native Kampfplattformen werden proportional gerendert.");

function assertNativePng(biomeId, [expectedWidth, expectedHeight]) {
  const fileName = `img/environment/${biomeId}-combat-platform-clean-hd.png`;
  const buffer = fs.readFileSync(fileName);
  assert.equal(buffer.toString("hex", 0, 8), "89504e470d0a1a0a");
  assert.equal(buffer.readUInt32BE(16), expectedWidth);
  assert.equal(buffer.readUInt32BE(20), expectedHeight);
  assert.equal(buffer[25], 6);
}

function assertProportionalRuntimeSize(stage) {
  const [frameWidth, frameHeight] = DIMENSIONS[stage.biomeId];
  assert.equal(stage.spriteConfig.frameWidth, frameWidth);
  assert.equal(stage.spriteConfig.frameHeight, frameHeight);
  assert.ok(stage.spriteConfig.source.endsWith(
    `${stage.biomeId}-combat-platform-clean-hd.png`,
  ));
  assert.ok(stage.width <= frameWidth);
  assert.equal(stage.height, Math.round(stage.width * frameHeight / frameWidth));
  assert.notEqual(stage.height, 88);
}
