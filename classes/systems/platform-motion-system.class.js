/** Überträgt die Bewegung einer Plattform auf darauf stehende Objekte. */
export class PlatformMotionSystem {
  /** Nimmt alle sicher gelandeten Objekte im aktuellen Bild mit. */
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
