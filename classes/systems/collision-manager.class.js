/**
 * Groups the game world's collision checks.
 */
export class CollisionManager {
  /**
   * Creates the configured system.
   * @param {Readonly<object>} physicsConfig Physics thresholds used for collision detection.
   */
  constructor(physicsConfig) {
    this.landingTolerancePixels = physicsConfig.platformLandingTolerancePixels;
  }

  /**
   * Checks whether two rectangular areas overlap.
   * @param {import("../base/drawable-object.class.js").DrawableObject} firstObject First collision object being compared.
   * @param {import("../base/drawable-object.class.js").DrawableObject} secondObject Second collision object being compared.
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
   * @param {import("../entities/character.class.js").Character} character Character evaluated or reported by the system.
   * @param {import("../base/drawable-object.class.js").DrawableObject} target Target inspected or updated by the system.
   * @param {number} deltaTimeSeconds Elapsed time since the previous frame, in seconds.
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
   * @param {ReadonlyArray<import("../base/movable-object.class.js").MovableObject>} movableObjects Moving entities processed during the frame.
   */
  resetGroundStates(movableObjects) {
    movableObjects.forEach((movableObject) => movableObject.setOnGround(false));
  }

  /**
   * Captures exact collision bounds before any movement in the current frame.
   * @param {ReadonlyArray<object>} movableObjects Moving entities processed during the frame.
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
   * @param {ReadonlyArray<import("../base/movable-object.class.js").MovableObject>} movableObjects Moving entities processed during the frame.
   * @param {ReadonlyArray<import("../environment/platform.class.js").Platform>} platforms Candidate platforms considered for landing.
   * @param {number} deltaTimeSeconds Elapsed time since the previous frame, in seconds.
   * @param {Map<object, Readonly<object>>|null} [previousBounds=null] Optional entity bounds captured before movement.
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

  /**
   * Returns find landing platform.
   * @param {Readonly<object>} movableObject Moving entity resolved against the collision surface.
   * @param {ReadonlyArray<object>} platforms Candidate platforms considered for landing.
   * @param {number} deltaTimeSeconds Elapsed time since the previous frame, in seconds.
   * @param {ReadonlyMap<object, Readonly<object>>|null} previousBounds Optional entity bounds captured before movement.
   */
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

  /**
   * Returns the platform with the higher current landing surface.
   * @param {Readonly<object>} currentPlatform Current platform used by get higher platform.
   * @param {boolean} candidatePlatform Candidate platform used by get higher platform.
   */
  #getHigherPlatform(currentPlatform, candidatePlatform) {
    if (!currentPlatform) return candidatePlatform;
    const currentTop = this.#getCollisionBounds(currentPlatform).y;
    const candidateTop = this.#getCollisionBounds(candidatePlatform).y;
    return candidateTop < currentTop ? candidatePlatform : currentPlatform;
  }

  /**
   * Checks the land on condition.
   * @param {Readonly<object>} movableObject Moving entity resolved against the collision surface.
   * @param {Readonly<object>} platform Platform evaluated as a landing surface.
   * @param {number} deltaTimeSeconds Elapsed time since the previous frame, in seconds.
   * @param {ReadonlyMap<object, Readonly<object>>|null} previousBounds Optional entity bounds captured before movement.
   */
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

  /**
   * Checks relative movement across the platform's current top surface.
   * @param {Readonly<object>} movableObject Moving entity resolved against the collision surface.
   * @param {Readonly<object>} movableBounds Movable bounds used by has crossed surface.
   * @param {Readonly<object>} platform Platform evaluated as a landing surface.
   * @param {Readonly<object>} platformBounds Platform bounds used by has crossed surface.
   * @param {number} deltaTimeSeconds Elapsed time since the previous frame, in seconds.
   * @param {ReadonlyMap<object, Readonly<object>>|null} previousBounds Optional entity bounds captured before movement.
   */
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

  /**
   * Returns the exact or velocity-derived bottom before this frame.
   * @param {Readonly<object>} movableObject Moving entity resolved against the collision surface.
   * @param {Readonly<object>} currentBounds Entity bounds after the current movement step.
   * @param {number} deltaTimeSeconds Elapsed time since the previous frame, in seconds.
   * @param {ReadonlyMap<object, Readonly<object>>|null} previousBounds Optional entity bounds captured before movement.
   */
  #getPreviousBottom(movableObject, currentBounds, deltaTimeSeconds,
    previousBounds) {
    const previous = previousBounds?.get(movableObject);
    if (previous) return previous.y + previous.height;
    return currentBounds.y + currentBounds.height -
      movableObject.velocityY * deltaTimeSeconds;
  }

  /**
   * Checks the horizontal overlap condition.
   * @param {Readonly<object>} firstObject First collision object being compared.
   * @param {Readonly<object>} secondObject Second collision object being compared.
   */
  #hasHorizontalOverlap(firstObject, secondObject) {
    return (
      firstObject.x < secondObject.x + secondObject.width &&
      firstObject.x + firstObject.width > secondObject.x
    );
  }

  /**
   * Checks the vertical overlap condition.
   * @param {Readonly<object>} firstObject First collision object being compared.
   * @param {Readonly<object>} secondObject Second collision object being compared.
   */
  #hasVerticalOverlap(firstObject, secondObject) {
    return (
      firstObject.y < secondObject.y + secondObject.height &&
      firstObject.y + firstObject.height > secondObject.y
    );
  }

  /**
   * Performs the land on platform operation.
   * @param {Readonly<object>} movableObject Moving entity resolved against the collision surface.
   * @param {Readonly<object>} platform Platform evaluated as a landing surface.
   */
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

  /**
   * Returns collision bounds.
   * @param {Readonly<object>} object Object used by get collision bounds.
   */
  #getCollisionBounds(object) {
    if (typeof object?.getCollisionBounds === "function") {
      return object.getCollisionBounds();
    }
    return object;
  }

  /**
   * Checks the valid delta time condition.
   * @param {number} deltaTimeSeconds Elapsed time since the previous frame, in seconds.
   */
  #isValidDeltaTime(deltaTimeSeconds) {
    return Number.isFinite(deltaTimeSeconds) && deltaTimeSeconds > 0;
  }
}
