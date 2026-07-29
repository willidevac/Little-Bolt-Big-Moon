import assert from "node:assert/strict";
import { CollisionManager } from
  "../classes/systems/collision-manager.class.js";
import { CollisionDebugRenderer } from
  "../classes/systems/collision-debug-renderer.class.js";

const manager = new CollisionManager({
  platformLandingTolerancePixels: 2,
});
const platform = createBody(0, 20, 20, 4);
const landingBody = createMovable(5, 15, 10, 10, 100);

assert.equal(manager.areOverlapping(createBody(0, 0, 10, 10),
  createBody(9, 0, 10, 10)), true);
assert.equal(manager.areOverlapping(createBody(0, 0, 10, 10),
  createBody(10, 0, 10, 10)), false);
manager.resolvePlatformLandings([landingBody], [platform], 0.1);
assert.equal(landingBody.y, 10);
assert.equal(landingBody.isOnGround, true);
assert.equal(landingBody.platform, platform);
assertDoesNotLand(manager, platform, createMovable(20, 15, 10, 10, 100));
assertDoesNotLand(manager, platform, createMovable(5, 15, 10, 10, -100));

const stompTarget = createBody(0, 20, 20, 20);
assert.equal(manager.isStompCollision(
  createStomper(5, 10, 10, 10, 100), stompTarget, 0.1,
), true);
assert.equal(manager.isStompCollision(
  createStomper(20, 10, 10, 10, 100), stompTarget, 0.1,
), false);
assert.equal(manager.isStompCollision(
  createStomper(5, 10, 10, 10, -100), stompTarget, 0.1,
), false);
assert.equal(manager.isStompCollision(
  createStomper(5, 25, 10, 10, 100), stompTarget, 0.01,
), false);

assertDebugBounds();
console.log("QA-003: Plattform-, Treffer- und Stompkanten sind präzise.");

function createBody(x, y, width, height) {
  return {
    x,
    y,
    width,
    height,
    getCollisionBounds() {
      return { x: this.x, y: this.y, width: this.width, height: this.height };
    },
  };
}

function createMovable(x, y, width, height, velocityY) {
  return {
    ...createBody(x, y, width, height),
    velocityY,
    isOnGround: false,
    setOnGround(value, platform) {
      this.isOnGround = value;
      this.platform = platform;
    },
  };
}

function createStomper(x, y, width, height, velocityY) {
  return {
    ...createBody(x, y, width, height),
    velocityY,
    getStompBounds() {
      return { x: this.x, y: this.y, width: this.width, height: this.height };
    },
  };
}

function assertDoesNotLand(collisionManager, target, movable) {
  const initialY = movable.y;
  collisionManager.resolvePlatformLandings([movable], [target], 0.1);
  assert.equal(movable.y, initialY);
  assert.equal(movable.isOnGround, false);
}

function assertDebugBounds() {
  const context = createDebugContext();
  const entity = createStomper(2, 3, 4, 5, 10);
  const groups = new Map([["characters", [entity]]]);
  new CollisionDebugRenderer({ showCollisionBoxes: true })
    .draw(context, groups);
  assert.deepEqual(context.rectangles, [
    ["#ff4d6d", 2, 3, 4, 5],
    ["#35d5d3", 2, 3, 4, 5],
  ]);
}

function createDebugContext() {
  return {
    rectangles: [],
    strokeStyle: "",
    save() {},
    restore() {},
    strokeRect(x, y, width, height) {
      this.rectangles.push([this.strokeStyle, x, y, width, height]);
    },
  };
}
