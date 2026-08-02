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
const machineGraveyardRooms = level.sections[0].route.rooms;
const route = new PlatformRouteBuilder(level.width).build(level.sections);

assert.equal(machineGraveyardRooms.length, 14);
machineGraveyardRooms.forEach(assertRoomHasSafeFloor);
machineGraveyardRooms.forEach(assertRoomTouchesWall);
assert.ok(machineGraveyardRooms.filter(connectsBothWalls).length >= 10);
assert.equal(countRoomCatchPlatforms(route), 28);

console.log("MAP-002: Der Maschinenfriedhof besteht aus 14 verbundenen Räumen.");

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

function countRoomCatchPlatforms(platforms) {
  const ids = new Set(machineGraveyardRooms.map(({ id }) => id));
  return platforms.filter(({ roomId, type }) => {
    return ids.has(roomId) && type === "catch";
  }).length;
}
