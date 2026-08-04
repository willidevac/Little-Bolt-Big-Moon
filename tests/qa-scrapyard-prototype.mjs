import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { createLevelOne } from "../js/levels/level-01.js";
import { GAME_CONFIG } from "../js/config/game-config.js";
import { SCRAPYARD_PROTOTYPE_BOUNDS } from
  "../js/config/scrapyard-prototype-config.js";

const level = createLevelOne();
const platforms = level.platforms.filter(({ kind }) => {
  return kind === "prototype-jump-platform";
});
const mainRoute = platforms
  .filter(({ routeRole }) => routeRole === "main")
  .sort((first, second) => first.routeOrder - second.routeOrder);
const walls = level.structures.filter(({ role }) => {
  return role === "scrapyard-prototype-wall";
});

assert.equal(platforms.length, 12);
assert.equal(mainRoute.length, 11);
assert.equal(platforms.filter(({ platformRole }) => platformRole === "launch").length, 1);
assert.equal(platforms.filter(({ platformRole }) => platformRole === "rest").length, 1);
assert.equal(platforms.filter(({ platformRole }) => platformRole === "rescue").length, 1);
assert.equal(platforms.filter(({ routeRole }) => routeRole === "must-skip").length, 0);
assert.equal(countBacktracks(mainRoute), 0);
assert.ok(countDirectionChanges(mainRoute) >= 3);
assert.ok(countRepeatedDirections(mainRoute) >= 4);
assert.ok(new Set(getVerticalGaps(mainRoute)).size >= 7);
assert.ok(mainRoute.every((platform, index) => {
  if (index === 0) return true;
  return canReach(mainRoute[index - 1], platform);
}));
assert.ok(platforms.every(({ y }) => {
  return y >= SCRAPYARD_PROTOTYPE_BOUNDS.topY &&
    y <= SCRAPYARD_PROTOTYPE_BOUNDS.bottomY;
}));
assert.ok(platforms.every((platform) => {
  const surface = platform.getCollisionBounds();
  return surface.y === platform.y && surface.height === 4;
}));
assertMinimumVisualClearance(platforms, 72);

assert.equal(walls.length, 0);
assert.equal(level.platforms.filter(({ mechanic, y }) => {
  return Boolean(mechanic) &&
    SCRAPYARD_PROTOTYPE_BOUNDS.topY <= y &&
    y <= SCRAPYARD_PROTOTYPE_BOUNDS.bottomY;
}).length, 0);

for (const role of ["precision", "standard", "launch", "rest", "rescue"]) {
  await fs.access(new URL(
    `../img/environment/scrapyard-platform-${role}-clean-hd.png`, import.meta.url,
  ));
}

console.log("MAP-TEST-001: The 3,000px scrapyard prototype passed.");

function countBacktracks(route) {
  return route.slice(1).filter((platform, index) => {
    return platform.y > route[index].y;
  }).length;
}

function countDirectionChanges(route) {
  const directions = getDirections(route);
  return directions.slice(1).filter((direction, index) => {
    return direction !== 0 && directions[index] !== 0 &&
      direction !== directions[index];
  }).length;
}

function countRepeatedDirections(route) {
  const directions = getDirections(route);
  return directions.slice(1).filter((direction, index) => {
    return direction !== 0 && direction === directions[index];
  }).length;
}

function getDirections(route) {
  return route.slice(1).map((platform, index) => {
    return Math.sign(centerX(platform) - centerX(route[index]));
  });
}

function getVerticalGaps(route) {
  return route.slice(1).map((platform, index) => route[index].y - platform.y);
}

function centerX(platform) {
  return platform.x + platform.width / 2;
}

function canReach(from, to) {
  const rise = from.y - to.y;
  if (rise <= 0) return true;
  const speedY = GAME_CONFIG.character.maximumJumpSpeedPixelsPerSecond;
  const gravity = GAME_CONFIG.physics.gravityPixelsPerSecondSquared;
  const discriminant = speedY ** 2 - 2 * gravity * rise;
  if (discriminant < 0) return false;
  const flightSeconds = (speedY + Math.sqrt(discriminant)) / gravity;
  const horizontalReach = flightSeconds *
    GAME_CONFIG.character.maximumJumpHorizontalSpeedPixelsPerSecond;
  const horizontalGap = Math.max(0,
    to.x - (from.x + from.width),
    from.x - (to.x + to.width),
  );
  return horizontalGap <= horizontalReach;
}

function assertMinimumVisualClearance(platforms, minimumPixels) {
  platforms.forEach((platform, index) => {
    platforms.slice(index + 1).forEach((candidate) => {
      if (!isVisuallyAligned(platform, candidate)) return;
      const upper = platform.y < candidate.y ? platform : candidate;
      const lower = upper === platform ? candidate : platform;
      assert.ok(lower.y - (upper.y + upper.height) >= minimumPixels,
        `${upper.id} and ${lower.id} are visually crowded.`);
    });
  });
}

function isVisuallyAligned(first, second) {
  const gap = Math.max(0,
    second.x - (first.x + first.width),
    first.x - (second.x + second.width),
  );
  return gap <= 32;
}
