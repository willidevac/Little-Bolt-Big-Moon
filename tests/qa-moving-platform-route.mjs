import assert from "node:assert/strict";
import { MovingPlatform } from
  "../classes/environment/moving-platform.class.js";
import { createLevelOne } from "../js/levels/level-01.js";

const level = createLevelOne();
const platforms = level.platforms.filter((platform) => {
  return platform instanceof MovingPlatform;
});

assert.equal(platforms.length, 168);
assertProgressiveDistribution(platforms);
assert.ok(platforms.every(staysInsideRoomWalls));
assert.ok(platforms.every(hasValidMovement));
assertMovementIsReported(platforms[0]);

console.log("PLT-004: 168 moving platforms stay fair and bounded.");

function assertProgressiveDistribution(platformsToCheck) {
  assert.equal(countFor(platformsToCheck, "launch-tower-supply-shafts"), 14);
  assert.equal(countFor(platformsToCheck, "launch-tower-outer-hull"), 28);
  assert.equal(countFor(platformsToCheck, "launch-tower-launch-platform"), 42);
  assert.equal(countFor(platformsToCheck, "space-station-cargo-ring"), 14);
  assert.equal(countFor(platformsToCheck, "space-station-research"), 28);
  assert.equal(countFor(platformsToCheck, "space-station-command"), 42);
}

function countFor(platformsToCount, sectionId) {
  return platformsToCount.filter(({ id }) => id.startsWith(sectionId)).length;
}

function staysInsideRoomWalls(platform) {
  return platform.minimumX >= 230 &&
    platform.maximumX + platform.width <= 1050;
}

function hasValidMovement(platform) {
  return platform.minimumX <= platform.x && platform.x <= platform.maximumX &&
    platform.speedPixelsPerSecond >= 85 &&
    platform.speedPixelsPerSecond <= 130;
}

function assertMovementIsReported(platform) {
  const initialX = platform.x;
  platform.update(0.5);
  assert.notEqual(platform.x, initialX);
  assert.equal(platform.getFrameDisplacement().x, platform.x - initialX);
}
