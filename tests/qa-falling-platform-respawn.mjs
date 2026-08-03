import assert from "node:assert/strict";
import { GAME_CONFIG } from "../js/config/game-config.js";
import { createLevelOne } from "../js/levels/level-01.js";
import { CollisionManager } from "../classes/systems/collision-manager.class.js";
import {
  FALLING_PLATFORM_STATES,
  FallingPlatform,
} from "../classes/environment/falling-platform.class.js";

const level = createLevelOne(GAME_CONFIG.enemies);
const platforms = level.platforms.filter((platform) => {
  return platform instanceof FallingPlatform;
});
const platform = platforms[0];
const initialY = platform.y;
const world = { config: GAME_CONFIG };

assert.equal(platforms.length, 222);
assertProgressiveDistribution(platforms);
assert.ok(platforms.every(hasFairTiming));
assert.equal(platform.onLanded({ team: "enemy" }), false);
assert.equal(platform.onLanded({ team: "player" }), true);
platform.update(platform.warningDelaySeconds - 0.01, world);
assert.equal(platform.state, FALLING_PLATFORM_STATES.WARNING);
platform.update(0.02, world);
assert.equal(platform.state, FALLING_PLATFORM_STATES.FALLING);
platform.update(platform.maximumDropPixels / platform.fallSpeedPixelsPerSecond + 1, world);
assert.equal(platform.state, FALLING_PLATFORM_STATES.FALLEN);
assert.equal(platform.isCollidable, false);
assertDoesNotDrawOrCatch(platform);
platform.update(platform.respawnDelaySeconds - 0.1, world);
assert.equal(platform.state, FALLING_PLATFORM_STATES.FALLEN);
platform.update(0.11, world);
assert.deepEqual([platform.state, platform.y], [FALLING_PLATFORM_STATES.STABLE, initialY]);
assert.equal(platform.isCollidable, true);
assert.equal(platform.onLanded({ team: "player" }), true);

console.log("PLT-003: Fallplattformen warnen fair und kehren sicher zurück.");

function hasFairTiming(candidate) {
  return candidate.warningDelaySeconds >= 1 &&
    candidate.maximumDropPixels === 900 &&
    candidate.respawnDelaySeconds === 3;
}

function assertProgressiveDistribution(platformsToCheck) {
  const countFor = (sectionId) => platformsToCheck.filter(({ id }) => {
    return id.startsWith(sectionId);
  }).length;
  assert.equal(countFor("factory-assembly"), 0);
  assert.equal(countFor("factory-smelter"), 28);
  assert.equal(countFor("factory-energy-core"), 42);
  assert.equal(countFor("space-station-cargo-ring"), 14);
  assert.equal(countFor("space-station-research"), 28);
  assert.equal(countFor("space-station-command"), 28);
  assert.equal(countFor("moon-crater-field"), 14);
  assert.equal(countFor("moon-ruins"), 42);
  assert.equal(countFor("moon-warden-fortress"), 26);
}

function assertDoesNotDrawOrCatch(candidate) {
  assert.doesNotThrow(() => candidate.draw({}));
  const movable = createMovable(candidate);
  const collisions = new CollisionManager(GAME_CONFIG.physics);
  collisions.resolvePlatformLandings([movable], [candidate], 0.1);
  assert.equal(movable.isOnGround, false);
}

function createMovable(platform) {
  return {
    x: platform.x, y: platform.y - 32, width: 32, height: 64,
    velocityY: 100, isOnGround: false,
    setOnGround(value) { this.isOnGround = value; },
  };
}
