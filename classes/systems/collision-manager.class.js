/**
 * Groups the game world's collision checks.
 */
export class CollisionManager {
  /**
   * @param {Readonly<object>} physicsConfig
   */
  constructor(physicsConfig) {
    this.landingTolerancePixels = physicsConfig.platformLandingTolerancePixels;
  }

  /**
   * Checks whether two rectangular areas overlap.
   * @param {import("../base/drawable-object.class.js").DrawableObject} firstObject
   * @param {import("../base/drawable-object.class.js").DrawableObject} secondObject
   * @returns {boolean}
   */
  areOverlapping(firstObject, secondObject) {
    const firstBounds = this.#getCollisionBounds(firstObject);
    const secondBounds = this.#getCollisionBounds(secondObject);
    return (
      this.#hasHorizontalOverlap(firstBounds, secondBounds) &&
      this.#hasVerticalOverlap(firstBounds, secondBounds)
    );
  }

  /**
   * Detects enemy contact only while falling across the target from above.
   * @param {import("../entities/character.class.js").Character} character
   * @param {import("../base/drawable-object.class.js").DrawableObject} target
   * @param {number} deltaTimeSeconds
   * @returns {boolean}
   */
  isStompCollision(character, target, deltaTimeSeconds) {
    if (character.velocityY <= 0 || !this.#isValidDeltaTime(deltaTimeSeconds)) {
      return false;
    }
    const stompBounds = character.getStompBounds();
    const targetBounds = this.#getCollisionBounds(target);
    if (!this.#hasHorizontalOverlap(stompBounds, targetBounds)) return false;
    const currentBottom = stompBounds.y + stompBounds.height;
    const previousBottom = currentBottom - character.velocityY * deltaTimeSeconds;
    const toleratedTop = targetBounds.y + this.landingTolerancePixels;
    return previousBottom <= toleratedTop && currentBottom >= targetBounds.y;
  }

  /**
   * Starts a fresh ground-contact check before movement.
   * @param {ReadonlyArray<import("../base/movable-object.class.js").MovableObject>} movableObjects
   */
  resetGroundStates(movableObjects) {
    movableObjects.forEach((movableObject) => movableObject.setOnGround(false));
  }

  /**
   * Places falling objects on the first crossed platform surface.
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
      const platformTop = this.#getCollisionBounds(platform).y;
      const landingTop = landingPlatform
        ? this.#getCollisionBounds(landingPlatform).y
        : Infinity;
      if (platformTop < landingTop) landingPlatform = platform;
    });
    return landingPlatform;
  }

  #canLandOn(movableObject, platform, deltaTimeSeconds) {
    if (movableObject.velocityY < 0 || platform.isCollidable === false) return false;
    const movableBounds = this.#getCollisionBounds(movableObject);
    const platformBounds = this.#getCollisionBounds(platform);
    if (!this.#hasHorizontalOverlap(movableBounds, platformBounds)) return false;
    const currentBottom = movableBounds.y + movableBounds.height;
    const previousBottom = currentBottom - movableObject.velocityY * deltaTimeSeconds;
    const toleratedPlatformTop = platformBounds.y + this.landingTolerancePixels;
    return previousBottom <= toleratedPlatformTop && currentBottom >= platformBounds.y;
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
    const movableBounds = this.#getCollisionBounds(movableObject);
    const platformBounds = this.#getCollisionBounds(platform);
    const bottomOffset = movableBounds.y + movableBounds.height - movableObject.y;
    movableObject.y = platformBounds.y - bottomOffset;
    movableObject.setOnGround(true, platform);
    if (typeof platform.onLanded === "function") {
      platform.onLanded(movableObject);
    }
  }

  #getCollisionBounds(object) {
    if (typeof object?.getCollisionBounds === "function") {
      return object.getCollisionBounds();
    }
    return object;
  }

  #isValidDeltaTime(deltaTimeSeconds) {
    return Number.isFinite(deltaTimeSeconds) && deltaTimeSeconds > 0;
  }
}
