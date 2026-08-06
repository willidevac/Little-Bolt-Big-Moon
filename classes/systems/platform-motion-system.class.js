/** Transfers a platform's movement to objects standing on it. */
export class PlatformMotionSystem {
  /**
   * Carries all safely landed objects during the current frame.
   * @param {ReadonlyArray<object>} movableObjects Moving entities processed during the frame.
   */
  carryGroundMovables(movableObjects) {
    movableObjects.forEach((movableObject) => {
      const platform = movableObject.groundPlatform;
      if (!movableObject.isOnGround || !platform) return;
      const movement = platform.getFrameDisplacement?.();
      if (!movement) return;
      movableObject.x += movement.x;
      movableObject.y += movement.y;
    });
  }
}
