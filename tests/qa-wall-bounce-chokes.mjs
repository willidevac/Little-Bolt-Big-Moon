import assert from "node:assert/strict";
import { createLevelOne } from "../js/levels/level-01.js";
import { WALL_BOUNCE_CHALLENGES } from
  "../js/config/wall-course-config.js";

const level = createLevelOne();
const walls = level.structures.filter(({ role }) => role === "wall-bounce-choke");
const wallFeatures = level.platforms.filter(({ kind }) => {
  return kind === "wall-feature-platform";
});

assert.equal(WALL_BOUNCE_CHALLENGES.length, 6);
assert.equal(walls.length, 12);
assert.equal(walls.some(({ biomeId }) => biomeId === "scrapyard"), false);
assert.equal(walls.some(({ biomeId }) => biomeId === "factory"), false);
assert.equal(walls.some(({ dangerous }) => dangerous), false);
assert.equal(walls.some(({ isDangerous }) => isDangerous), false);
assert.deepEqual(
  WALL_BOUNCE_CHALLENGES.map(({ corridorWidth }) => corridorWidth),
  [704, 544, 464, 424, 384, 344],
);

WALL_BOUNCE_CHALLENGES.forEach((challenge) => {
  const pair = walls.filter(({ challengeId }) => challengeId === challenge.id);
  assert.equal(pair.length, 2);
  assert.ok(pair.every(({ height }) => height === challenge.height));
  const reboundTarget = {
    isOnGround: false, velocityX: 0, velocityY: 0,
    wallReboundInput: { jump: true, down: false },
    applyUpwardImpulse(speed) { this.velocityY = -speed; },
  };
  const leftWall = pair.find(({ side }) => side === "left");
  const rightWall = pair.find(({ side }) => side === "right");
  leftWall.onWallImpact(reboundTarget, 1);
  assert.equal(Math.abs(reboundTarget.velocityX),
    challenge.reboundHorizontalSpeedPixelsPerSecond);
  assert.equal(reboundTarget.velocityY,
    -challenge.reboundVerticalSpeedPixelsPerSecond);
  reboundTarget.velocityY = 0;
  leftWall.onWallImpact(reboundTarget, -1);
  assert.equal(reboundTarget.velocityY, 0);
  reboundTarget.wallReboundInput.jump = false;
  rightWall.onWallImpact(reboundTarget, -1);
  assert.equal(reboundTarget.velocityY,
    -challenge.reboundVerticalSpeedPixelsPerSecond *
      challenge.reboundReleasedVerticalRatio);
  const exitPlatform = level.platforms.find(({ requiresWallBounce }) => {
    return requiresWallBounce === challenge.id;
  });
  assert.equal(exitPlatform.platformRole, "rest");
  assert.ok(exitPlatform.width >= 280);
  const assistedTarget = {
    x: leftWall.x + leftWall.width,
    y: leftWall.y + challenge.exitAssistBandPixels,
    width: 64,
    height: 64,
    isOnGround: false,
    getCollisionBounds() {
      return { x: this.x + 9, y: this.y + 6, width: 46, height: 49 };
    },
    beginControlledWallRebound(rebound) { this.rebound = rebound; },
  };
  leftWall.onWallImpact(assistedTarget, 1);
  assert.equal(assistedTarget.rebound.forceFullVertical, true);
  assert.equal(assistedTarget.rebound.direction, 1);
  assert.ok(assistedTarget.rebound.verticalSpeedPixelsPerSecond >=
    challenge.exitAssistVerticalSpeedPixelsPerSecond);
  assert.ok(assistedTarget.rebound.horizontalSpeedPixelsPerSecond <=
    challenge.exitAssistMaximumHorizontalSpeedPixelsPerSecond);
  assert.equal(assistedTarget.rebound.controlSeconds,
    challenge.exitAssistControlSeconds);
  assertExitArcLandsOnPlatform(assistedTarget, exitPlatform);
  assert.ok(wallFeatures.some((platform) => {
    return platform.biomeId === challenge.biomeId &&
      platform.anchorSide === challenge.entrySide &&
      platform.y === challenge.y + challenge.height &&
      platform.anchorStructureId ===
        `${challenge.id}-${challenge.entrySide}-wall` &&
      overlapsInnerWallByEightPixels(platform, challenge);
  }));
});

console.log("ENV-006: Six late-game rebound shafts narrow progressively.");

function overlapsInnerWallByEightPixels(platform, challenge) {
  if (platform.anchorSide === "left") {
    return platform.x === challenge.leftX + 40;
  }
  return platform.x + platform.width === challenge.rightX + 8;
}

function assertExitArcLandsOnPlatform(target, platform) {
  const bounds = target.getCollisionBounds();
  const startCenterX = bounds.x + bounds.width / 2;
  const footOffset = bounds.y + bounds.height - target.y;
  const rise = target.y - (platform.y - footOffset);
  const verticalSpeed = target.rebound.verticalSpeedPixelsPerSecond;
  const gravity = 2200;
  const flightSeconds = (verticalSpeed + Math.sqrt(
    verticalSpeed ** 2 - 2 * gravity * rise,
  )) / gravity;
  const landingCenterX = startCenterX + target.rebound.direction *
    target.rebound.horizontalSpeedPixelsPerSecond * flightSeconds;
  assert.ok(landingCenterX >= platform.x + 24);
  assert.ok(landingCenterX <= platform.x + platform.width - 24);
}
