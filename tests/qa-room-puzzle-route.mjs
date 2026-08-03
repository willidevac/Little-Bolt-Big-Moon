import assert from "node:assert/strict";
import { createLevelOne } from "../js/levels/level-01.js";
import { GAME_CONFIG } from "../js/config/game-config.js";

const ROUTE_TOP_Y = 120000;
const ROUTE_BOTTOM_Y = 150000;
const EXPECTED_PLATFORM_COUNT = 177;
const level = createLevelOne();
const surfaces = collectSurfaces(level);
const reachable = findReachableSurfaces(surfaces, GAME_CONFIG);
const reachedY = surfaces
  .filter(({ id }) => reachable.has(id))
  .map(({ y }) => y);

assert.equal(level.platforms.length, EXPECTED_PLATFORM_COUNT);
assert.ok(level.platforms.every(({ width }) => width <= 192));
assert.ok(level.platforms.every(isInsideRoomWalls));
assert.ok(new Set(level.platforms.map(({ x }) => x)).size >= 15);
assert.ok(level.platforms.every(isInsidePuzzleRoute));
assert.ok(Math.min(...reachedY) <= ROUTE_TOP_Y + 60);
assertSectionDifficulty(level);

console.log("MAP-001: Three progressive scrapyard puzzles are reachable.");

function collectSurfaces(currentLevel) {
  const platforms = currentLevel.platforms.map(toSurface);
  const rooms = currentLevel.structures.flatMap((room) => {
    return room.getCollisionBoundsList()
      .filter(isPuzzleRouteLandingSurface)
      .map(toSurface);
  });
  return [...platforms, ...rooms].sort((first, second) => second.y - first.y);
}

function isPuzzleRouteLandingSurface(surface) {
  const isInRoute = surface.y >= ROUTE_TOP_Y &&
    surface.y <= ROUTE_BOTTOM_Y;
  return isInRoute && !surface.id.endsWith("wall");
}

function toSurface(surface) {
  return Object.freeze({
    id: surface.id, x: surface.x, y: surface.y, width: surface.width,
  });
}

function findReachableSurfaces(surfaces, config) {
  const reachable = new Set([surfaces[0].id]);
  surfaces.forEach((lower, lowerIndex) => {
    if (!reachable.has(lower.id)) return;
    surfaces.slice(lowerIndex + 1).forEach((upper) => {
      if (canReach(lower, upper, config)) reachable.add(upper.id);
    });
  });
  return reachable;
}

function canReach(lower, upper, config) {
  const height = lower.y - upper.y;
  const verticalSpeed = config.character.maximumJumpSpeedPixelsPerSecond;
  const gravity = config.physics.gravityPixelsPerSecondSquared;
  if (height <= 0 || height > verticalSpeed ** 2 / (2 * gravity)) return false;
  return getHorizontalGap(lower, upper) <= getHorizontalReach(
    height, verticalSpeed, gravity, config.character,
  );
}

function getHorizontalReach(height, verticalSpeed, gravity, character) {
  const flightTime = (verticalSpeed + Math.sqrt(
    verticalSpeed ** 2 - 2 * gravity * height,
  )) / gravity;
  return flightTime * character.maximumJumpHorizontalSpeedPixelsPerSecond;
}

function getHorizontalGap(first, second) {
  const firstRight = first.x + first.width;
  const secondRight = second.x + second.width;
  return Math.max(0, second.x - firstRight, first.x - secondRight);
}

function isInsidePuzzleRoute(platform) {
  return platform.y >= ROUTE_TOP_Y && platform.y <= ROUTE_BOTTOM_Y;
}

function isInsideRoomWalls(platform) {
  return platform.x >= 230 && platform.x + platform.width <= 1050;
}

function assertSectionDifficulty(currentLevel) {
  assertPuzzleProfiles(currentLevel.sections);
  const groups = currentLevel.sections.slice(0, 3).map((section) => {
    return currentLevel.platforms.filter(({ id }) => id.startsWith(section.id));
  });
  assert.deepEqual(groups.map(({ length }) => length), [55, 61, 61]);
  const horizontalRanges = groups.map((platforms) => {
    const positions = platforms.map(({ x }) => x);
    return Math.max(...positions) - Math.min(...positions);
  });
  assert.ok(horizontalRanges[1] > horizontalRanges[0]);
  assert.ok(horizontalRanges[2] > horizontalRanges[1]);
}

function assertPuzzleProfiles(sections) {
  assert.deepEqual(
    sections.slice(0, 3).map(({ puzzleProfile }) => puzzleProfile),
    ["introduction", "precision", "wall-rebounds"],
  );
}
