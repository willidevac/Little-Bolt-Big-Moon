/**
 * Bündelt die Kollisionsprüfungen der Spielwelt.
 */
export class CollisionManager {
  /**
   * @param {Readonly<object>} physicsConfig
   */
  constructor(physicsConfig) {
    this.landingTolerancePixels = physicsConfig.platformLandingTolerancePixels;
  }

  /**
   * Prüft, ob sich zwei rechteckige Flächen überschneiden.
   * @param {import("../base/drawable-object.class.js").DrawableObject} firstObject
   * @param {import("../base/drawable-object.class.js").DrawableObject} secondObject
   * @returns {boolean}
   */
  areOverlapping(firstObject, secondObject) {
    return (
      this.#hasHorizontalOverlap(firstObject, secondObject) &&
      this.#hasVerticalOverlap(firstObject, secondObject)
    );
  }

  /**
   * Öffnet vor der Bewegung eine neue Prüfung des Bodenkontakts.
   * @param {ReadonlyArray<import("../base/movable-object.class.js").MovableObject>} movableObjects
   */
  resetGroundStates(movableObjects) {
    movableObjects.forEach((movableObject) => movableObject.setOnGround(false));
  }

  /**
   * Setzt fallende Objekte auf die zuerst überquerte Plattformoberkante.
   * @param {ReadonlyArray<import("../base/movable-object.class.js").MovableObject>} movableObjects
   * @param {ReadonlyArray<import("../environment/platform.class.js").Platform>} platforms
   * @param {number} deltaTimeSeconds
   */
  resolvePlatformLandings(movableObjects, platforms, deltaTimeSeconds) {
    movableObjects.forEach((movableObject) => {
      const platform = this.#findLandingPlatform(
        movableObject,
        platforms,
        deltaTimeSeconds,
      );
      if (platform) this.#landOnPlatform(movableObject, platform);
    });
  }

  #findLandingPlatform(movableObject, platforms, deltaTimeSeconds) {
    let landingPlatform = null;
    platforms.forEach((platform) => {
      if (!this.#canLandOn(movableObject, platform, deltaTimeSeconds)) return;
      if (!landingPlatform || platform.y < landingPlatform.y) landingPlatform = platform;
    });
    return landingPlatform;
  }

  #canLandOn(movableObject, platform, deltaTimeSeconds) {
    if (movableObject.velocityY < 0) return false;
    if (!this.#hasHorizontalOverlap(movableObject, platform)) return false;
    const currentBottom = movableObject.y + movableObject.height;
    const previousBottom = currentBottom - movableObject.velocityY * deltaTimeSeconds;
    const toleratedPlatformTop = platform.y + this.landingTolerancePixels;
    return previousBottom <= toleratedPlatformTop && currentBottom >= platform.y;
  }

  #hasHorizontalOverlap(firstObject, secondObject) {
    return (
      firstObject.x < secondObject.x + secondObject.width &&
      firstObject.x + firstObject.width > secondObject.x
    );
  }

  #hasVerticalOverlap(firstObject, secondObject) {
    return (
      firstObject.y < secondObject.y + secondObject.height &&
      firstObject.y + firstObject.height > secondObject.y
    );
  }

  #landOnPlatform(movableObject, platform) {
    movableObject.y = platform.y - movableObject.height;
    movableObject.setOnGround(true);
  }
}
