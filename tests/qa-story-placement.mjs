import assert from "node:assert/strict";
import { GAME_CONFIG } from "../js/config/game-config.js";
import { createLevelOne } from "../js/levels/level-01.js";

const level = createLevelOne(GAME_CONFIG.enemies);
const start = { ...level.playerStart, width: 64, height: 64 };

level.storyProps.forEach(assertAnchoredProp);
assert.equal(new Set(level.storyProps.map(getAnchorId)).size, 6);
assert.equal(level.storyProps.filter(isAnchoredToWorldFloor).length, 1);
assert.ok(level.storyProps.every((prop) => !overlaps(prop, start)));
assert.ok(level.storyProps.every(hasNoPickupOrHazardOverlap));

console.log("STORY-FIX-001: Sechs Storyobjekte glaubwürdig verankert.");

function assertAnchoredProp(prop) {
  const anchor = level.platforms.find(({ id }) => id === prop.anchorPlatformId);
  assert.ok(anchor, `${prop.id} braucht einen bekannten Anker.`);
  assert.equal(anchor.constructor.name, "Platform");
  assert.equal(prop.y + prop.height, anchor.y);
  assert.ok(prop.x >= anchor.x);
  assert.ok(prop.x + prop.width <= anchor.x + anchor.width);
}

function getAnchorId(prop) {
  return prop.anchorPlatformId;
}

function isAnchoredToWorldFloor(prop) {
  return prop.anchorPlatformId.endsWith("floor-000");
}

function hasNoPickupOrHazardOverlap(prop) {
  return [...level.collectables, ...level.hazards].every((object) => {
    return !overlaps(prop, object);
  });
}

function overlaps(first, second) {
  return first.x < second.x + second.width &&
    first.x + first.width > second.x &&
    first.y < second.y + second.height &&
    first.y + first.height > second.y;
}
