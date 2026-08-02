import assert from "node:assert/strict";
import {
  PLATFORM_WIDTHS,
  SIDE_PADDING,
} from "../../js/config/platform-route-rules.js";

export function verifyRoomLayout(config) {
  const { rooms, platforms, expectedRoomCount, minimumBothWalls } = config;
  assert.equal(rooms.length, expectedRoomCount);
  rooms.forEach((room) => assertRoom(room, config.worldWidth));
  assert.ok(countBothWallRooms(rooms, config.worldWidth) >= minimumBothWalls);
  assert.equal(countPlatforms(platforms, "catch"), expectedRoomCount * 2);
  verifyChallengePlatforms(platforms, config.challenge);
}

function assertRoom(room, worldWidth) {
  assert.equal(room.steps[0].type, "catch");
  assert.equal(room.steps.at(-1).type, "catch");
  assert.ok(getWallSides(room, worldWidth).size >= 1);
}

function countBothWallRooms(rooms, worldWidth) {
  return rooms.filter((room) => {
    return getWallSides(room, worldWidth).size === 2;
  }).length;
}

function getWallSides(room, worldWidth) {
  const sides = room.steps.map((step) => getWallSide(step, worldWidth));
  return new Set(sides.filter(Boolean));
}

function getWallSide(step, worldWidth) {
  if (step.x === SIDE_PADDING) return "left";
  const rightEdge = step.x + PLATFORM_WIDTHS[step.type];
  return rightEdge === worldWidth - SIDE_PADDING ? "right" : null;
}

function verifyChallengePlatforms(platforms, challenge) {
  if (!challenge) return;
  assert.equal(countPlatforms(platforms, challenge.type), challenge.count);
}

function countPlatforms(platforms, type) {
  return platforms.filter((platform) => {
    return platform.roomId && platform.type === type;
  }).length;
}
