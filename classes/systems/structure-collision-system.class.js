/** Resolves Byte against the solid rectangles of environment architecture. */
export class StructureCollisionSystem {
  /**
   * Creates the configured system.
   * @param {Readonly<object>} physicsConfig Physics thresholds used for collision detection.
   */
  constructor(physicsConfig) {
    const tolerance = physicsConfig?.platformLandingTolerancePixels;
    if (!Number.isFinite(tolerance) || tolerance < 0) {
      throw new TypeError("The structure collision tolerance is invalid.");
    }
    this.landingTolerancePixels = tolerance;
  }

  /**
   * Returns the number of structure contacts resolved during this frame.
   * @param {Readonly<object>} character Character evaluated or reported by the system.
   * @param {Readonly<object>} structures Structures used by resolve.
   * @param {number} deltaTimeSeconds Elapsed time since the previous frame, in seconds.
   * @param {Readonly<object>} characterConfig Character config used by resolve.
   */
  resolve(character, structures, deltaTimeSeconds, characterConfig) {
    if (!character?.isAffectedByGravity ||
      !Number.isFinite(deltaTimeSeconds) || deltaTimeSeconds <= 0) return 0;
    const colliders = structures.flatMap((structure) => {
      return this.#getStructureColliders(structure);
    });
    return colliders.reduce((contacts, collider) => contacts + Number(
      this.#resolveCollider(character, collider, deltaTimeSeconds,
        characterConfig),
    ), 0);
  }

  /**
   * Returns structure colliders.
   * @param {Readonly<object>} structure Structure used by get structure colliders.
   */
  #getStructureColliders(structure) {
    return typeof structure.getCollisionBoundsList === "function"
      ? structure.getCollisionBoundsList()
      : [];
  }

  /**
   * Returns resolve collider.
   * @param {Readonly<object>} character Character evaluated or reported by the system.
   * @param {Readonly<object>} collider Collider used by resolve collider.
   * @param {number} deltaTimeSeconds Elapsed time since the previous frame, in seconds.
   * @param {Readonly<object>} config Configuration values used by the system.
   */
  #resolveCollider(character, collider, deltaTimeSeconds, config) {
    const current = character.getCollisionBounds();
    const previous = this.#getPreviousBounds(character, current, deltaTimeSeconds);
    if (this.#resolveCrossing(character, previous, current, collider, config)) {
      return true;
    }
    if (!this.#overlaps(current, collider)) return false;
    return this.#resolveExistingOverlap(character, current, collider, config);
  }

  /**
   * Returns resolve crossing.
   * @param {Readonly<object>} character Character evaluated or reported by the system.
   * @param {Readonly<object>} previous Previous used by resolve crossing.
   * @param {Readonly<object>} current Current used by resolve crossing.
   * @param {Readonly<object>} collider Collider used by resolve crossing.
   * @param {Readonly<object>} config Configuration values used by the system.
   */
  #resolveCrossing(character, previous, current, collider, config) {
    return this.#resolveVerticalCrossing(character, previous, current, collider) ||
      this.#resolveHorizontalCrossing(
        character, previous, current, collider, config,
      );
  }

  /**
   * Returns resolve vertical crossing.
   * @param {Readonly<object>} character Character evaluated or reported by the system.
   * @param {Readonly<object>} previous Previous used by resolve vertical crossing.
   * @param {Readonly<object>} current Current used by resolve vertical crossing.
   * @param {Readonly<object>} collider Collider used by resolve vertical crossing.
   */
  #resolveVerticalCrossing(character, previous, current, collider) {
    if (this.#crossesTop(character, previous, current, collider)) {
      return this.#land(character, current, collider);
    }
    if (this.#crossesBottom(character, previous, current, collider)) {
      return this.#hitCeiling(character, current, collider);
    }
    return false;
  }

  /**
   * Returns resolve horizontal crossing.
   * @param {Readonly<object>} character Character evaluated or reported by the system.
   * @param {Readonly<object>} previous Previous used by resolve horizontal crossing.
   * @param {Readonly<object>} current Current used by resolve horizontal crossing.
   * @param {Readonly<object>} collider Collider used by resolve horizontal crossing.
   * @param {Readonly<object>} config Configuration values used by the system.
   */
  #resolveHorizontalCrossing(character, previous, current, collider, config) {
    if (this.#crossesLeft(character, previous, current, collider)) {
      const distance = current.x + current.width - collider.x;
      return this.#hitWall(character, -1, distance, config, collider.owner);
    }
    if (this.#crossesRight(character, previous, current, collider)) {
      const distance = collider.x + collider.width - current.x;
      return this.#hitWall(character, 1, distance, config, collider.owner);
    }
    return false;
  }

  /**
   * Performs the crosses top operation.
   * @param {Readonly<object>} character Character evaluated or reported by the system.
   * @param {Readonly<object>} previous Previous used by crosses top.
   * @param {Readonly<object>} current Current used by crosses top.
   * @param {Readonly<object>} collider Collider used by crosses top.
   */
  #crossesTop(character, previous, current, collider) {
    const previousBottom = previous.y + previous.height;
    const currentBottom = current.y + current.height;
    return character.velocityY >= 0 &&
      this.#hasHorizontalOverlap(current, collider) &&
      previousBottom <= collider.y + this.landingTolerancePixels &&
      currentBottom >= collider.y;
  }

  /**
   * Performs the crosses bottom operation.
   * @param {Readonly<object>} character Character evaluated or reported by the system.
   * @param {Readonly<object>} previous Previous used by crosses bottom.
   * @param {Readonly<object>} current Current used by crosses bottom.
   * @param {Readonly<object>} collider Collider used by crosses bottom.
   */
  #crossesBottom(character, previous, current, collider) {
    const colliderBottom = collider.y + collider.height;
    return character.velocityY < 0 &&
      this.#hasHorizontalOverlap(current, collider) &&
      previous.y >= colliderBottom && current.y <= colliderBottom;
  }

  /**
   * Performs the crosses left operation.
   * @param {Readonly<object>} character Character evaluated or reported by the system.
   * @param {Readonly<object>} previous Previous used by crosses left.
   * @param {Readonly<object>} current Current used by crosses left.
   * @param {Readonly<object>} collider Collider used by crosses left.
   */
  #crossesLeft(character, previous, current, collider) {
    return character.velocityX > 0 &&
      this.#hasVerticalOverlap(current, collider) &&
      previous.x + previous.width <= collider.x &&
      current.x + current.width >= collider.x;
  }

  /**
   * Performs the crosses right operation.
   * @param {Readonly<object>} character Character evaluated or reported by the system.
   * @param {Readonly<object>} previous Previous used by crosses right.
   * @param {Readonly<object>} current Current used by crosses right.
   * @param {Readonly<object>} collider Collider used by crosses right.
   */
  #crossesRight(character, previous, current, collider) {
    const colliderRight = collider.x + collider.width;
    return character.velocityX < 0 &&
      this.#hasVerticalOverlap(current, collider) &&
      previous.x >= colliderRight && current.x <= colliderRight;
  }

  /**
   * Returns resolve existing overlap.
   * @param {Readonly<object>} character Character evaluated or reported by the system.
   * @param {Readonly<object>} current Current used by resolve existing overlap.
   * @param {Readonly<object>} collider Collider used by resolve existing overlap.
   * @param {Readonly<object>} config Configuration values used by the system.
   */
  #resolveExistingOverlap(character, current, collider, config) {
    const overlaps = this.#getOverlapDistances(current, collider);
    const smallest = this.#getSmallestOverlap(overlaps);
    if (smallest === "top") return this.#land(character, current, collider);
    if (smallest === "bottom") {
      return this.#hitCeiling(character, current, collider);
    }
    const direction = smallest === "left" ? -1 : 1;
    return this.#hitWall(
      character, direction, overlaps[smallest], config, collider.owner,
    );
  }

  /**
   * Returns overlap distances.
   * @param {Readonly<object>} current Current used by get overlap distances.
   * @param {Readonly<object>} collider Collider used by get overlap distances.
   */
  #getOverlapDistances(current, collider) {
    return Object.freeze({
      left: current.x + current.width - collider.x,
      right: collider.x + collider.width - current.x,
      top: current.y + current.height - collider.y,
      bottom: collider.y + collider.height - current.y,
    });
  }

  /**
   * Returns smallest overlap.
   * @param {Readonly<object>} overlaps Overlaps used by get smallest overlap.
   */
  #getSmallestOverlap(overlaps) {
    return Object.entries(overlaps).sort((first, second) => {
      return first[1] - second[1];
    })[0][0];
  }

  /**
   * Performs the land operation.
   * @param {Readonly<object>} character Character evaluated or reported by the system.
   * @param {Readonly<object>} current Current used by land.
   * @param {Readonly<object>} collider Collider used by land.
   */
  #land(character, current, collider) {
    this.#placeOnTop(character, current, collider);
    character.setOnGround(true, collider.owner);
    return true;
  }

  /**
   * Performs the hit ceiling operation.
   * @param {Readonly<object>} character Character evaluated or reported by the system.
   * @param {Readonly<object>} current Current used by hit ceiling.
   * @param {Readonly<object>} collider Collider used by hit ceiling.
   */
  #hitCeiling(character, current, collider) {
    character.y += collider.y + collider.height - current.y;
    character.velocityY = Math.max(0, character.velocityY);
    return true;
  }

  /**
   * Performs the hit wall operation.
   * @param {Readonly<object>} character Character evaluated or reported by the system.
   * @param {Readonly<object>} direction Direction used by hit wall.
   * @param {Readonly<object>} distance Distance used by hit wall.
   * @param {Readonly<object>} config Configuration values used by the system.
   * @param {Readonly<object>} owner Owner used by hit wall.
   */
  #hitWall(character, direction, distance, config, owner) {
    character.x += direction * distance;
    this.#reflectHorizontally(character, direction, config);
    owner?.onWallImpact?.(character, direction);
    return true;
  }

  /**
   * Performs the place on top operation.
   * @param {Readonly<object>} character Character evaluated or reported by the system.
   * @param {Readonly<object>} current Current used by place on top.
   * @param {Readonly<object>} collider Collider used by place on top.
   */
  #placeOnTop(character, current, collider) {
    character.y -= current.y + current.height - collider.y;
  }

  /**
   * Performs the reflect horizontally operation.
   * @param {Readonly<object>} character Character evaluated or reported by the system.
   * @param {Readonly<object>} direction Direction used by reflect horizontally.
   * @param {Readonly<object>} config Configuration values used by the system.
   */
  #reflectHorizontally(character, direction, config) {
    if (typeof character.handleWallImpact === "function") {
      character.handleWallImpact(direction, config);
      return;
    }
    character.velocityX = 0;
  }

  /**
   * Returns previous bounds.
   * @param {Readonly<object>} character Character evaluated or reported by the system.
   * @param {Readonly<object>} current Current used by get previous bounds.
   * @param {number} deltaTimeSeconds Elapsed time since the previous frame, in seconds.
   */
  #getPreviousBounds(character, current, deltaTimeSeconds) {
    return Object.freeze({
      x: current.x - character.velocityX * deltaTimeSeconds,
      y: current.y - character.velocityY * deltaTimeSeconds,
      width: current.width,
      height: current.height,
    });
  }

  /**
   * Performs the overlaps operation.
   * @param {Readonly<object>} first First used by overlaps.
   * @param {Readonly<object>} second Second used by overlaps.
   */
  #overlaps(first, second) {
    return this.#hasHorizontalOverlap(first, second) &&
      this.#hasVerticalOverlap(first, second);
  }

  /**
   * Checks the horizontal overlap condition.
   * @param {Readonly<object>} first First used by has horizontal overlap.
   * @param {Readonly<object>} second Second used by has horizontal overlap.
   */
  #hasHorizontalOverlap(first, second) {
    return first.x < second.x + second.width &&
      first.x + first.width > second.x;
  }

  /**
   * Checks the vertical overlap condition.
   * @param {Readonly<object>} first First used by has vertical overlap.
   * @param {Readonly<object>} second Second used by has vertical overlap.
   */
  #hasVerticalOverlap(first, second) {
    return first.y < second.y + second.height &&
      first.y + first.height > second.y;
  }
}
