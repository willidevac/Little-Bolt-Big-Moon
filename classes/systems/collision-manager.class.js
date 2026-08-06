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
   * Captures exact collision bounds before any movement in the current frame.
   * @param {ReadonlyArray<object>} movableObjects
   * @returns {Map<object, Readonly<object>>}
   */
  captureBounds(movableObjects) {
    return new Map(movableObjects.map((movableObject) => {
      const bounds = this.#getCollisionBounds(movableObject);
      return [movableObject, Object.freeze({ ...bounds })];
    }));
  }

  /**
   * Places falling objects on the first crossed platform surface.
   * @param {ReadonlyArray<import("../base/movable-object.class.js").MovableObject>} movableObjects
   * @param {ReadonlyArray<import("../environment/platform.class.js").Platform>} platforms
   * @param {number} deltaTimeSeconds
   * @param {Map<object, Readonly<object>>|null} [previousBounds=null]
   * @returns {ReadonlyArray<Readonly<object>>} New landing contacts.
   */
  resolvePlatformLandings(movableObjects, platforms, deltaTimeSeconds,
    previousBounds = null) {
    const landings = [];
    movableObjects.forEach((movableObject) => {
      const platform = this.#findLandingPlatform(
        movableObject,
        platforms,
        deltaTimeSeconds,
        previousBounds,
      );
      if (platform) landings.push(this.#landOnPlatform(movableObject, platform));
    });
    return Object.freeze(landings);
  }

  /** Returns find landing platform. */
  #findLandingPlatform(movableObject, platforms, deltaTimeSeconds,
    previousBounds) {
    return platforms.reduce((landingPlatform, platform) => {
      const canLand = this.#canLandOn(
        movableObject, platform, deltaTimeSeconds, previousBounds,
      );
      return canLand
        ? this.#getHigherPlatform(landingPlatform, platform)
        : landingPlatform;
    }, null);
  }

  /** Returns the platform with the higher current landing surface. */
  #getHigherPlatform(currentPlatform, candidatePlatform) {
    if (!currentPlatform) return candidatePlatform;
    const currentTop = this.#getCollisionBounds(currentPlatform).y;
    const candidateTop = this.#getCollisionBounds(candidatePlatform).y;
    return candidateTop < currentTop ? candidatePlatform : currentPlatform;
  }

  /** Checks the land on condition. */
  #canLandOn(movableObject, platform, deltaTimeSeconds, previousBounds) {
    if (movableObject.velocityY < 0 || platform.isCollidable === false) return false;
    const movableBounds = this.#getCollisionBounds(movableObject);
    const platformBounds = this.#getCollisionBounds(platform);
    if (!this.#hasHorizontalOverlap(movableBounds, platformBounds)) return false;
    return this.#hasCrossedSurface(
      movableObject, movableBounds, platform, platformBounds,
      deltaTimeSeconds, previousBounds,
    );
  }

  /** Checks relative movement across the platform's current top surface. */
  #hasCrossedSurface(movableObject, movableBounds, platform, platformBounds,
    deltaTimeSeconds, previousBounds) {
    const currentBottom = movableBounds.y + movableBounds.height;
    const previousBottom = this.#getPreviousBottom(
      movableObject, movableBounds, deltaTimeSeconds, previousBounds,
    );
    const previousTop = previousBounds?.get(platform)?.y ?? platformBounds.y;
    return previousBottom <= previousTop + this.landingTolerancePixels &&
      currentBottom >= platformBounds.y;
  }

  /** Returns the exact or velocity-derived bottom before this frame. */
  #getPreviousBottom(movableObject, currentBounds, deltaTimeSeconds,
    previousBounds) {
    const previous = previousBounds?.get(movableObject);
    if (previous) return previous.y + previous.height;
    return currentBounds.y + currentBounds.height -
      movableObject.velocityY * deltaTimeSeconds;
  }

  /** Checks the horizontal overlap condition. */
  #hasHorizontalOverlap(firstObject, secondObject) {
    return (
      firstObject.x < secondObject.x + secondObject.width &&
      firstObject.x + firstObject.width > secondObject.x
    );
  }

  /** Checks the vertical overlap condition. */
  #hasVerticalOverlap(firstObject, secondObject) {
    return (
      firstObject.y < secondObject.y + secondObject.height &&
      firstObject.y + firstObject.height > secondObject.y
    );
  }

  /** Performs the land on platform operation. */
  #landOnPlatform(movableObject, platform) {
    const movableBounds = this.#getCollisionBounds(movableObject);
    const platformBounds = this.#getCollisionBounds(platform);
    const bottomOffset = movableBounds.y + movableBounds.height - movableObject.y;
    movableObject.y = platformBounds.y - bottomOffset;
    movableObject.setOnGround(true, platform);
    const activated = typeof platform.onLanded === "function" &&
      platform.onLanded(movableObject);
    return Object.freeze({ movableObject, platform, activated });
  }

  /** Returns collision bounds. */
  #getCollisionBounds(object) {
    if (typeof object?.getCollisionBounds === "function") {
      return object.getCollisionBounds();
    }
    return object;
  }

  /** Checks the valid delta time condition. */
  #isValidDeltaTime(deltaTimeSeconds) {
    return Number.isFinite(deltaTimeSeconds) && deltaTimeSeconds > 0;
  }
}
