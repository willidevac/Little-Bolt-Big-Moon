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
const scrapyardSections = level.sections.slice(0, 3);
const scrapyardRooms = scrapyardSections.flatMap(({ route }) => route.rooms);
const route = new PlatformRouteBuilder(level.width).build(level.sections);

scrapyardSections.forEach(assertSectionHasRoomArchitecture);
assert.equal(scrapyardRooms.length, 42);
assert.equal(countRoomCatchPlatforms(route), 84);

console.log("MAP-002: Der Schrottplatz besteht aus 42 verbundenen Räumen.");

function assertSectionHasRoomArchitecture({ route }) {
  assert.equal(route.rooms.length, 14);
  route.rooms.forEach(assertRoomHasSafeFloor);
  route.rooms.forEach(assertRoomTouchesWall);
  assert.ok(route.rooms.filter(connectsBothWalls).length >= 7);
}

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
  const ids = new Set(scrapyardRooms.map(({ id }) => id));
  return platforms.filter(({ roomId, type }) => {
    return ids.has(roomId) && type === "catch";
  }).length;
}
