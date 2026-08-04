import assert from "node:assert/strict";
import { createLevelOne } from "../js/levels/level-01.js";
import { GAME_CONFIG } from "../js/config/game-config.js";
import { BOSS_ARENA } from "../js/config/progression-route-config.js";
import { WALL_BOUNCE_CHALLENGES } from
  "../js/config/wall-course-config.js";
import { MoonWarden } from
  "../classes/entities/enemies/moon-warden.class.js";

const BIOMES = [
  "scrapyard", "factory", "launch-tower", "space-station", "moon",
];
const level = createLevelOne();
const route = level.platforms
  .filter(({ routeRole }) => routeRole === "main")
  .sort((first, second) => first.routeOrder - second.routeOrder);
const generated = route.filter(({ kind }) => {
  return kind === "progression-platform";
});
const widths = BIOMES.map((biome) => averageWidth(generated, biome));

assert.ok(route.length >= 405 && route.length <= 430);
assert.ok(GAME_CONFIG.character.jumpChargeSeconds <= 0.7);
assert.ok(GAME_CONFIG.character.maximumJumpSpeedPixelsPerSecond >= 1200);
assert.equal(GAME_CONFIG.character.maximumJumpHorizontalSpeedPixelsPerSecond, 600);
assert.ok(widths.every((width, index) => index === 0 || width < widths[index - 1]));
assert.equal(generated.filter(({ biomeId, mechanic }) => {
  return biomeId === "scrapyard" && mechanic;
}).length, 0);
assertBiomeMechanics(generated);
assertEarlyRouteVariation(generated);
assertRegularJumps(route);
assertVisualClearance(route);
assertWallChallenges(level, route);
assertFinalBoss(level, route);

console.log("MAP-TEST-002: Difficulty rises continuously to the Moon Warden.");

function averageWidth(platforms, biomeId) {
  const matches = platforms.filter((platform) => platform.biomeId === biomeId);
  return matches.reduce((total, platform) => total + platform.width, 0) /
    matches.length;
}

function assertBiomeMechanics(platforms) {
  assert.ok(countMechanic(platforms, "factory", "trap") >= 8);
  assert.ok(countMechanic(platforms, "launch-tower", "falling") >= 8);
  assert.ok(countMechanic(platforms, "launch-tower", "spring") >= 3);
  for (const biome of ["space-station", "moon"]) {
    for (const mechanic of ["trap", "falling", "spring"]) {
      assert.ok(countMechanic(platforms, biome, mechanic) >= 3);
    }
  }
}

function countMechanic(platforms, biomeId, mechanic) {
  return platforms.filter((platform) => {
    return platform.biomeId === biomeId && platform.mechanic === mechanic;
  }).length;
}

function assertEarlyRouteVariation(platforms) {
  const scrapyard = platforms.filter(({ biomeId }) => biomeId === "scrapyard");
  const factory = platforms.filter(({ biomeId }) => biomeId === "factory");
  assert.ok(scrapyard.length <= 105);
  assert.ok(factory.length <= 105);
  assert.ok(averageRise(scrapyard) < averageRise(factory));
  for (const biome of [scrapyard, factory]) {
    assert.ok(countLongTransfers(biome) >= 8);
    assert.ok(countRepeatedDirections(biome) >= 12);
  }
}

function averageRise(platforms) {
  return platforms.slice(1).reduce((total, platform, index) => {
    return total + platforms[index].y - platform.y;
  }, 0) / (platforms.length - 1);
}

function countLongTransfers(platforms) {
  return platforms.slice(1).filter((platform, index) => {
    return Math.abs(centerX(platform) - centerX(platforms[index])) >= 360;
  }).length;
}

function countRepeatedDirections(platforms) {
  const directions = platforms.slice(1).map((platform, index) => {
    return Math.sign(centerX(platform) - centerX(platforms[index]));
  });
  return directions.slice(1).filter((direction, index) => {
    return direction !== 0 && direction === directions[index];
  }).length;
}

function centerX(platform) {
  return platform.x + platform.width / 2;
}

function assertRegularJumps(route) {
  route.slice(1).forEach((upper, index) => {
    if (upper.requiresWallBounce) return;
    assert.ok(canReach(route[index], upper),
      `${route[index].id} cannot reach ${upper.id}.`);
  });
}

function canReach(lower, upper) {
  const rise = lower.y - upper.y;
  const speed = GAME_CONFIG.character.maximumJumpSpeedPixelsPerSecond;
  const gravity = GAME_CONFIG.physics.gravityPixelsPerSecondSquared;
  const discriminant = speed ** 2 - 2 * gravity * rise;
  if (rise <= 0 || discriminant < 0) return false;
  const seconds = (speed + Math.sqrt(discriminant)) / gravity;
  return horizontalGap(lower, upper) <= seconds *
    GAME_CONFIG.character.maximumJumpHorizontalSpeedPixelsPerSecond;
}

function assertVisualClearance(route) {
  route.slice(1).forEach((platform, index) => {
    const previous = route[index];
    if (horizontalGap(previous, platform) > 32) return;
    const upper = platform.y < previous.y ? platform : previous;
    const lower = upper === platform ? previous : platform;
    assert.ok(lower.y - (upper.y + upper.height) >= 72);
  });
}

function assertWallChallenges(level, route) {
  WALL_BOUNCE_CHALLENGES.forEach((challenge) => {
    const approach = route.find((platform) => {
      return platform.preparesWallBounce === challenge.id;
    });
    const exit = route.find((platform) => {
      return platform.requiresWallBounce === challenge.id;
    });
    const entry = findWallEntry(level, challenge);
    assert.ok(approach && exit && entry);
    assert.ok(canReach(approach, entry));
    assert.equal(challenge.y - exit.y, 185);
  });
}

function findWallEntry(level, challenge) {
  const id = `${challenge.id}-${challenge.entrySide}-wall`;
  return level.platforms.find(({ anchorStructureId }) => {
    return anchorStructureId === id;
  });
}

function assertFinalBoss(level, route) {
  const gate = route.at(-1);
  const gapLeft = BOSS_ARENA.entranceCenterX -
    BOSS_ARENA.entranceWidth / 2;
  assert.equal(gate.id, "moon-warden-arena-floor");
  assert.deepEqual([gate.x, gate.y, gate.width, gate.height], [
    gapLeft, BOSS_ARENA.floorY,
    BOSS_ARENA.entranceWidth, BOSS_ARENA.floorHeight,
  ]);
  assert.equal(gate.isCollidable, false);
  const supports = level.platforms.filter(({ routeRole }) => {
    return routeRole === "boss-arena-support";
  });
  assert.equal(supports.length, 2);
  const bosses = level.enemies.filter((enemy) => enemy instanceof MoonWarden);
  assert.equal(bosses.length, 1);
  const bossSupport = supports.find((support) => {
    return bosses[0].x >= support.x &&
      bosses[0].x + bosses[0].width <= support.x + support.width;
  });
  assert.ok(bossSupport);
  assert.equal(bosses[0].y + bosses[0].height, bossSupport.y);
  const bossZone = level.combatZones.find(({ enemyIds }) => {
    return enemyIds.includes(bosses[0].id);
  });
  assert.ok(bossZone);
  assert.deepEqual(bossZone.enemyIds, [bosses[0].id]);
}

function horizontalGap(first, second) {
  return Math.max(0,
    second.x - (first.x + first.width),
    first.x - (second.x + second.width),
  );
}
