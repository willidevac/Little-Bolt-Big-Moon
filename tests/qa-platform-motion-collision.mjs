import assert from "node:assert/strict";
import { CollisionManager } from
  "../classes/systems/collision-manager.class.js";
import { PlatformMotionSystem } from
  "../classes/systems/platform-motion-system.class.js";

const collisionManager = new CollisionManager({
  platformLandingTolerancePixels: 2,
});
const motionSystem = new PlatformMotionSystem();

assertCarriedBodyLandsOnFloor(false);
assertCarriedBodyLandsOnFloor(true);
assertHighestCrossedFloorWins();
assertSideExitDoesNotSnapToFloor();
assertUpwardCarrierKeepsContact();

console.log("PLT-005: Carried objects cannot tunnel through crossed floors.");

/** Verifies a carried body lands whether the falling platform stays visible. */
function assertCarriedBodyLandsOnFloor(platformFallsOut) {
  const falling = createPlatform(0, 20, 80, 40, platformFallsOut);
  const floor = createPlatform(0, 50, 80, 0, false);
  const body = createMovable(20, 10, falling);
  const previousBounds = collisionManager.captureBounds([body, falling, floor]);
  falling.y += 40;
  motionSystem.carryGroundMovables([body]);
  collisionManager.resetGroundStates([body]);
  collisionManager.resolvePlatformLandings(
    [body], [falling, floor], 0.1, previousBounds,
  );
  assert.deepEqual([body.y, body.groundPlatform], [40, floor]);
}

/** Verifies the first crossed floor wins even after a large frame movement. */
function assertHighestCrossedFloorWins() {
  const carrier = createPlatform(0, 20, 80, 80, true);
  const upperFloor = createPlatform(0, 45, 80, 0, false);
  const lowerFloor = createPlatform(0, 70, 80, 0, false);
  const body = createMovable(20, 10, carrier);
  const previousBounds = collisionManager.captureBounds([
    body, carrier, upperFloor, lowerFloor,
  ]);
  carrier.y += 80;
  motionSystem.carryGroundMovables([body]);
  collisionManager.resetGroundStates([body]);
  collisionManager.resolvePlatformLandings(
    [body], [lowerFloor, upperFloor], 0.2, previousBounds,
  );
  assert.deepEqual([body.y, body.groundPlatform], [35, upperFloor]);
}

/** Verifies horizontal separation never creates a false floor landing. */
function assertSideExitDoesNotSnapToFloor() {
  const carrier = createPlatform(0, 20, 40, 40, true);
  const floor = createPlatform(0, 50, 40, 0, false);
  const body = createMovable(20, 10, carrier);
  const previousBounds = collisionManager.captureBounds([body, carrier, floor]);
  carrier.y += 40;
  motionSystem.carryGroundMovables([body]);
  body.x = 60;
  collisionManager.resetGroundStates([body]);
  collisionManager.resolvePlatformLandings(
    [body], [floor], 0.1, previousBounds,
  );
  assert.deepEqual([body.y, body.groundPlatform], [50, null]);
}

/** Verifies upward-moving platforms retain their established ground contact. */
function assertUpwardCarrierKeepsContact() {
  const carrier = createPlatform(0, 50, 80, -20, false);
  const body = createMovable(20, 40, carrier);
  const previousBounds = collisionManager.captureBounds([body, carrier]);
  carrier.y -= 20;
  motionSystem.carryGroundMovables([body]);
  collisionManager.resetGroundStates([body]);
  collisionManager.resolvePlatformLandings(
    [body], [carrier], 0.1, previousBounds,
  );
  assert.deepEqual([body.y, body.groundPlatform], [20, carrier]);
}

/** Creates one moving or static one-way platform fixture. */
function createPlatform(x, y, width, displacementY, isFallen) {
  return {
    x, y, width, height: 4, isCollidable: !isFallen,
    getFrameDisplacement: () => ({ x: 0, y: displacementY }),
  };
}

/** Creates one grounded movable fixture with a ten-pixel collision body. */
function createMovable(x, y, platform) {
  return {
    x, y, width: 10, height: 10, velocityY: 0,
    isOnGround: true, groundPlatform: platform,
    setOnGround(value, groundPlatform = null) {
      this.isOnGround = value;
      this.groundPlatform = value ? groundPlatform : null;
      if (value) this.velocityY = 0;
    },
  };
}
