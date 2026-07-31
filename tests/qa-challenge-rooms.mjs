import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PlatformRouteBuilder } from "../classes/systems/platform-route-builder.class.js";
import { PLATFORM_WIDTHS } from "../js/config/platform-route-rules.js";

const SAFE_TYPES = new Set(["path", "catch"]);
const RISK_TYPES = new Set(["narrow", "moving", "falling"]);
const level = JSON.parse(
  await readFile(new URL("../data/levels/level-01.json", import.meta.url), "utf8"),
);
const route = new PlatformRouteBuilder(level.width).build(level.sections);
const rooms = level.sections.flatMap(({ tileset, route: sectionRoute }) => {
  return sectionRoute.rooms.map((room) => ({ ...room, tileset }));
});

assert.equal(new Set(rooms.map(({ id }) => id)).size, rooms.length);
const biomeCounts = getBiomeCounts(rooms);
assert.deepEqual(Object.keys(biomeCounts).sort(), [
  "factory", "launch-tower", "moon", "scrapyard", "space-station",
]);
assert.ok(Object.values(biomeCounts).every((count) => count >= 5));
rooms.forEach(assertRoomRecipe);
assertBuiltRoomRoles(route, rooms.length);

console.log(`MAP-001: ${rooms.length} Challenge-Räume besitzen sichere Fallwege.`);

function getBiomeCounts(allRooms) {
  return allRooms.reduce((counts, { tileset }) => {
    counts[tileset] = (counts[tileset] ?? 0) + 1;
    return counts;
  }, {});
}

function assertRoomRecipe(room) {
  assert.ok(room.steps.length >= 3 && room.steps.length <= 6);
  assert.ok(SAFE_TYPES.has(room.steps[0].type));
  assert.ok(SAFE_TYPES.has(room.steps.at(-1).type));
  assert.ok(room.steps.slice(1, -1).some((step) => {
    return RISK_TYPES.has(step.type);
  }));
  assert.ok(hasControlledFall(room.steps));
}

function hasControlledFall(steps) {
  const entry = steps[0];
  return steps.slice(1, -1).some((step) => {
    if (!RISK_TYPES.has(step.type)) return false;
    return overlapsHorizontally(entry, step);
  });
}

function overlapsHorizontally(lower, upper) {
  const lowerRight = lower.x + PLATFORM_WIDTHS[lower.type];
  const upperRight = upper.x + PLATFORM_WIDTHS[upper.type];
  return lower.x < upperRight && lowerRight > upper.x;
}

function assertBuiltRoomRoles(allPlatforms, roomCount) {
  const roomPlatforms = allPlatforms.filter(({ roomId }) => roomId);
  const entryCount = countRole(roomPlatforms, "entry");
  const exitCount = countRole(roomPlatforms, "exit");
  assert.equal(entryCount, roomCount);
  assert.equal(exitCount, roomCount);
  assert.ok(roomPlatforms.some(({ roomRole }) => roomRole === "challenge"));
}

function countRole(platforms, role) {
  return platforms.filter(({ roomRole }) => roomRole === role).length;
}
