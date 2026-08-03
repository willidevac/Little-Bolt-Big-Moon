import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createLevelOne } from "../js/levels/level-01.js";
import levelData from "../data/levels/level-01.json" with { type: "json" };
import { BYTE_GROUND_CONTACT_OFFSET_Y } from
  "../js/config/character-visual-config.js";
import { GAME_CONFIG } from "../js/config/game-config.js";

const level = createLevelOne();
assert.equal(level.structures.length, 210);
[
  "collectables", "storyProps", "hazards", "combatZones", "enemies",
].forEach((group) => assert.deepEqual(level[group], []));
assert.equal(level.platforms.length, 1166);

const room = level.structures.find(({ id }) => {
  return id === "scrapyard-rebound-shaft-01";
});
assert.ok(room);
assert.equal(room.role, "authored-room");
assert.equal(room.width, 1280);
assert.equal(room.height, 650);

const colliders = new Map(room.getCollisionBoundsList().map((collider) => {
  return [collider.id.split(`${room.id}-`)[1], collider];
}));
assert.deepEqual([...colliders.keys()], [
  "left-wall", "right-wall", "safe-floor", "lower-right-ledge",
  "middle-left-ledge", "upper-right-exit",
]);

const floor = colliders.get("safe-floor");
assert.equal(level.playerStart.y + BYTE_GROUND_CONTACT_OFFSET_Y, floor.y);
assert.equal(colliders.get("left-wall").x + colliders.get("left-wall").width,
  floor.x);
assert.equal(floor.x + floor.width, colliders.get("right-wall").x);

const route = [
  floor,
  colliders.get("lower-right-ledge"),
  colliders.get("middle-left-ledge"),
  colliders.get("upper-right-exit"),
];
const maximumJumpSpeed =
  GAME_CONFIG.character.maximumJumpSpeedPixelsPerSecond;
const gravity = GAME_CONFIG.physics.gravityPixelsPerSecondSquared;
const maximumJumpHeight = maximumJumpSpeed ** 2 / (2 * gravity);
route.slice(1).forEach((upper, index) => {
  const lower = route[index];
  const verticalGap = lower.y - upper.y;
  const overlap = Math.min(lower.x + lower.width, upper.x + upper.width) -
    Math.max(lower.x, upper.x);
  assert.ok(verticalGap <= maximumJumpHeight);
  assert.ok(overlap >= 12);
});

const image = await readFile(new URL(
  "../img/rooms/scrapyard-rebound-shaft-v2.png", import.meta.url,
));
assert.equal(image.readUInt32BE(16), 1672);
assert.equal(image.readUInt32BE(20), 941);
assert.equal(image[25], 6);

const stack = level.structures
  .filter(({ id }) => /-room-\d{2}$/.test(id))
  .sort((left, right) => left.y - right.y);
assert.equal(stack.length, 208);
assert.equal(stack[0].y, 720);
assert.equal(stack.at(-1).y + stack.at(-1).height, 149350);
stack.slice(1).forEach((roomPiece, index) => {
  const lowerEdgeOfPreviousPiece = stack[index].y + stack[index].height;
  assert.ok(Math.abs(roomPiece.y - lowerEdgeOfPreviousPiece) < 0.001);
});
stack.forEach((roomPiece) => {
  roomPiece.getCollisionBoundsList().forEach(({ width }) => {
    assert.ok(width < level.width * 0.75);
  });
});

const templateIds = new Set(levelData.roomTemplates.map(({ id }) => id));
levelData.sections.forEach(({ roomPattern, roomTemplateOverrides = {} }) => {
  roomPattern.forEach((templateId) => assert.ok(templateIds.has(templateId)));
  Object.values(roomTemplateOverrides).forEach((templateId) => {
    assert.ok(templateIds.has(templateId));
  });
});
for (const { source } of levelData.roomTemplates) {
  const roomImage = await readFile(new URL(`../img/rooms/${source}`,
    import.meta.url));
  assert.equal(roomImage.readUInt32BE(16), 1672);
  assert.equal(roomImage.readUInt32BE(20), 941);
  assert.equal(roomImage[25], 6);
}

console.log("ROOM-001: Safe start and 208 open puzzle rooms passed.");
