import assert from "node:assert/strict";
import { StructureCollisionSystem } from
  "../classes/systems/structure-collision-system.class.js";

const system = new StructureCollisionSystem({
  platformLandingTolerancePixels: 6,
});
const structure = createStructure({ x: 120, y: 80, width: 36, height: 180 });
const config = {
  wallBounceHorizontalRetention: 0.65,
  minimumWallBounceSpeedPixelsPerSecond: 120,
};

const wallHit = createCharacter({
  x: 100, y: 120, velocityX: 200, velocityY: 0,
});
assert.equal(system.resolve(wallHit, [structure], 0.1, config), 1);
assert.equal(wallHit.x, 88);
assert.equal(wallHit.velocityX, -130);
assert.equal(wallHit.lastImpactDirection, -1);

const landing = createCharacter({
  x: 122, y: 58, velocityX: 0, velocityY: 200,
});
assert.equal(system.resolve(landing, [structure], 0.1, config), 1);
assert.equal(landing.y, 48);
assert.equal(landing.isOnGround, true);

const reviewFlight = createCharacter({
  x: 100, y: 120, velocityX: 200, velocityY: 0,
  isAffectedByGravity: false,
});
assert.equal(system.resolve(reviewFlight, [structure], 0.1, config), 0);
assert.equal(reviewFlight.x, 100);

console.log("ENV-002: Walls bounce, surfaces carry and review flight stays free.");

function createStructure(bounds) {
  return {
    getCollisionBoundsList() {
      return [{ ...bounds, owner: this }];
    },
  };
}

function createCharacter(overrides) {
  const character = {
    x: 0, y: 0, width: 32, height: 32,
    velocityX: 0, velocityY: 0,
    isAffectedByGravity: true, isOnGround: false,
    getCollisionBounds, setOnGround, handleWallImpact,
  };
  return Object.assign(character, overrides);
}

function getCollisionBounds() {
  return { x: this.x, y: this.y, width: this.width, height: this.height };
}

function setOnGround(value) {
  this.isOnGround = value;
  if (value) this.velocityY = 0;
}

function handleWallImpact(direction, wallConfig) {
  this.lastImpactDirection = direction;
  const retained = Math.abs(this.velocityX) *
    wallConfig.wallBounceHorizontalRetention;
  this.velocityX = direction * Math.max(
    retained,
    wallConfig.minimumWallBounceSpeedPixelsPerSecond,
  );
}
