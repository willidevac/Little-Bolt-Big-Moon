import assert from "node:assert/strict";
import { GAME_CONFIG } from "../js/config/game-config.js";
import { createLevelOne } from "../js/levels/level-01.js";

const level = createLevelOne(GAME_CONFIG.enemies);

level.collectables.forEach(assertAnchored);
assert.equal(level.collectables.length, 32);
assertMovingAnchor();
assertFallingAnchor();

console.log("VIS-001: Alle 32 Funde bleiben sichtbar auf ihrer Plattform.");

function assertAnchored(collectable) {
  const anchor = collectable.anchorPlatform;
  assert.equal(collectable.anchorPlatformId, anchor?.id);
  assert.equal(collectable.y + collectable.height, anchor.y);
  assert.ok(collectable.x >= anchor.x);
  assert.ok(collectable.x + collectable.width <= anchor.x + anchor.width);
}

function assertMovingAnchor() {
  const item = findCollectable("launch-tower-gear-01");
  const previousX = item.x;
  item.anchorPlatform.update(0.25);
  item.update(0.25);
  assert.notEqual(item.x, previousX);
  assert.equal(item.y + item.height, item.anchorPlatform.y);
}

function assertFallingAnchor() {
  const item = findCollectable("factory-gear-01");
  const platform = item.anchorPlatform;
  platform.onLanded({ team: "player" });
  platform.update(getFallDuration(platform), createWorldBounds());
  item.update(0.1);
  assert.equal(item.isAvailable, false);
  platform.update(platform.respawnDelaySeconds + 0.1, createWorldBounds());
  item.update(0.1);
  assert.equal(item.isAvailable, true);
  assert.equal(item.y + item.height, platform.y);
}

function findCollectable(id) {
  return level.collectables.find((item) => item.id === id);
}

function getFallDuration(platform) {
  return platform.warningDelaySeconds +
    platform.maximumDropPixels / platform.fallSpeedPixelsPerSecond + 1;
}

function createWorldBounds() {
  return { config: { world: { height: level.height } } };
}
