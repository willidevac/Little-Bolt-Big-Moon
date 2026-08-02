import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PlatformRouteBuilder } from
  "../classes/systems/platform-route-builder.class.js";
import {
  PLATFORM_WIDTHS,
  SIDE_PADDING,
} from "../js/config/platform-route-rules.js";

const level = JSON.parse(
  await readFile(new URL("../data/levels/level-01.json", import.meta.url), "utf8"),
);
const section = level.sections.find(({ id }) => id === "factory-assembly");
const rooms = section.route.rooms;
const route = new PlatformRouteBuilder(level.width).build(level.sections);
const platforms = route.filter(({ id }) => id.startsWith("factory-assembly-"));

assert.equal(rooms.length, 14);
rooms.forEach(assertRoomHasSafeFloor);
rooms.forEach(assertRoomTouchesWall);
assert.ok(rooms.filter(connectsBothWalls).length >= 8);
assert.equal(countPlatforms("catch"), 28);
assert.equal(countPlatforms("falling"), 29);

console.log("MAP-003: Die Montagehalle besteht aus 14 Maschinenr\u00e4umen.");

function assertRoomHasSafeFloor(room) {
  assert.equal(room.steps[0].type, "catch");
  assert.equal(room.steps.at(-1).type, "catch");
}

function assertRoomTouchesWall(room) {
  assert.ok(getWallSides(room).size >= 1);
}

function connectsBothWalls(room) {
  return getWallSides(room).size === 2;
}

function getWallSides(room) {
  return new Set(room.steps.map(getWallSide).filter(Boolean));
}

function getWallSide(step) {
  if (step.x === SIDE_PADDING) return "left";
  const rightEdge = step.x + PLATFORM_WIDTHS[step.type];
  return rightEdge === level.width - SIDE_PADDING ? "right" : null;
}

function countPlatforms(type) {
  return platforms.filter((platform) => {
    return platform.roomId && platform.type === type;
  }).length;
}
