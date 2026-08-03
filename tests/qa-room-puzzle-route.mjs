import assert from "node:assert/strict";
import { createLevelOne } from "../js/levels/level-01.js";
import { GAME_CONFIG } from "../js/config/game-config.js";

const SECTION_TOP_Y = 140000;
const SECTION_BOTTOM_Y = 150000;
const level = createLevelOne();
const surfaces = collectSurfaces(level);
const reachable = findReachableSurfaces(surfaces, GAME_CONFIG);
const reachedY = surfaces
  .filter(({ id }) => reachable.has(id))
  .map(({ y }) => y);

assert.equal(level.platforms.length, 55);
assert.ok(level.platforms.every(({ width }) => width <= 192));
assert.ok(new Set(level.platforms.map(({ x }) => x)).size >= 7);
assert.ok(level.platforms.every(isInsideFirstSection));
assert.ok(Math.min(...reachedY) <= SECTION_TOP_Y + 60);

console.log("MAP-001: The first 10,000 px room puzzle is fully reachable.");

function collectSurfaces(currentLevel) {
  const platforms = currentLevel.platforms.map(toSurface);
  const rooms = currentLevel.structures.flatMap((room) => {
    return room.getCollisionBoundsList()
      .filter(isFirstSectionLandingSurface)
      .map(toSurface);
  });
  return [...platforms, ...rooms].sort((first, second) => second.y - first.y);
}

function isFirstSectionLandingSurface(surface) {
  const isInSection = surface.y >= SECTION_TOP_Y &&
    surface.y <= SECTION_BOTTOM_Y;
  return isInSection && !surface.id.endsWith("wall");
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

function isInsideFirstSection(platform) {
  return platform.y >= SECTION_TOP_Y && platform.y <= SECTION_BOTTOM_Y;
}
