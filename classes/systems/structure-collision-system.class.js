/** Resolves Byte against the solid rectangles of environment architecture. */
export class StructureCollisionSystem {
  /** @param {Readonly<object>} physicsConfig */
  constructor(physicsConfig) {
    const tolerance = physicsConfig?.platformLandingTolerancePixels;
    if (!Number.isFinite(tolerance) || tolerance < 0) {
      throw new TypeError("The structure collision tolerance is invalid.");
    }
    this.landingTolerancePixels = tolerance;
  }

  /** Returns the number of structure contacts resolved during this frame. */
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

  #getStructureColliders(structure) {
    return typeof structure.getCollisionBoundsList === "function"
      ? structure.getCollisionBoundsList()
      : [];
  }

  #resolveCollider(character, collider, deltaTimeSeconds, config) {
    const current = character.getCollisionBounds();
    const previous = this.#getPreviousBounds(character, current, deltaTimeSeconds);
    if (this.#resolveCrossing(character, previous, current, collider, config)) {
      return true;
    }
    if (!this.#overlaps(current, collider)) return false;
    return this.#resolveExistingOverlap(character, current, collider, config);
  }

  #resolveCrossing(character, previous, current, collider, config) {
    return this.#resolveVerticalCrossing(character, previous, current, collider) ||
      this.#resolveHorizontalCrossing(
        character, previous, current, collider, config,
      );
  }

  #resolveVerticalCrossing(character, previous, current, collider) {
    if (this.#crossesTop(character, previous, current, collider)) {
      return this.#land(character, current, collider);
    }
    if (this.#crossesBottom(character, previous, current, collider)) {
      return this.#hitCeiling(character, current, collider);
    }
    return false;
  }

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

  #crossesTop(character, previous, current, collider) {
    const previousBottom = previous.y + previous.height;
    const currentBottom = current.y + current.height;
    return character.velocityY >= 0 &&
      this.#hasHorizontalOverlap(current, collider) &&
      previousBottom <= collider.y + this.landingTolerancePixels &&
      currentBottom >= collider.y;
  }

  #crossesBottom(character, previous, current, collider) {
    const colliderBottom = collider.y + collider.height;
    return character.velocityY < 0 &&
      this.#hasHorizontalOverlap(current, collider) &&
      previous.y >= colliderBottom && current.y <= colliderBottom;
  }

  #crossesLeft(character, previous, current, collider) {
    return character.velocityX > 0 &&
      this.#hasVerticalOverlap(current, collider) &&
      previous.x + previous.width <= collider.x &&
      current.x + current.width >= collider.x;
  }

  #crossesRight(character, previous, current, collider) {
    const colliderRight = collider.x + collider.width;
    return character.velocityX < 0 &&
      this.#hasVerticalOverlap(current, collider) &&
      previous.x >= colliderRight && current.x <= colliderRight;
  }

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

  #getOverlapDistances(current, collider) {
    return Object.freeze({
      left: current.x + current.width - collider.x,
      right: collider.x + collider.width - current.x,
      top: current.y + current.height - collider.y,
      bottom: collider.y + collider.height - current.y,
    });
  }

  #getSmallestOverlap(overlaps) {
    return Object.entries(overlaps).sort((first, second) => {
      return first[1] - second[1];
    })[0][0];
  }

  #land(character, current, collider) {
    this.#placeOnTop(character, current, collider);
    character.setOnGround(true, collider.owner);
    return true;
  }

  #hitCeiling(character, current, collider) {
    character.y += collider.y + collider.height - current.y;
    character.velocityY = Math.max(0, character.velocityY);
    return true;
  }

  #hitWall(character, direction, distance, config, owner) {
    character.x += direction * distance;
    this.#reflectHorizontally(character, direction, config);
    owner?.onWallImpact?.(character, direction);
    return true;
  }

  #placeOnTop(character, current, collider) {
    character.y -= current.y + current.height - collider.y;
  }

  #reflectHorizontally(character, direction, config) {
    if (typeof character.handleWallImpact === "function") {
      character.handleWallImpact(direction, config);
      return;
    }
    character.velocityX = 0;
  }

  #getPreviousBounds(character, current, deltaTimeSeconds) {
    return Object.freeze({
      x: current.x - character.velocityX * deltaTimeSeconds,
      y: current.y - character.velocityY * deltaTimeSeconds,
      width: current.width,
      height: current.height,
    });
  }

  #overlaps(first, second) {
    return this.#hasHorizontalOverlap(first, second) &&
      this.#hasVerticalOverlap(first, second);
  }

  #hasHorizontalOverlap(first, second) {
    return first.x < second.x + second.width &&
      first.x + first.width > second.x;
  }

  #hasVerticalOverlap(first, second) {
    return first.y < second.y + second.height &&
      first.y + first.height > second.y;
  }
}
