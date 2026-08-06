import { clamp } from "../../js/utils/math.js";

/** Controls Byte's horizontal ground movement and confines it to the world. */
export class CharacterMovementController {
  #character;

  /** @param {import("../entities/character.class.js").Character} character Character to control. */
  constructor(character) {
    this.#character = character;
  }

  /** Updates Byte's facing direction from horizontal input. */
  updateFacingDirection(input) {
    const direction = this.#getDirection(input);
    if (direction !== 0) this.#character.facingDirection = direction;
  }

  /**
   * Accelerates or decelerates Byte during ground movement.
   * @param {number} deltaTimeSeconds
   * @param {Readonly<object>} input
   * @param {Readonly<object>} config
   */
  updateGroundMovement(deltaTimeSeconds, input, config) {
    const direction = this.#getDirection(input);
    if (direction === 0) return this.#applyBraking(deltaTimeSeconds, config);
    this.#character.facingDirection = direction;
    this.#accelerate(deltaTimeSeconds, direction, config);
  }

  /**
   * Keeps Byte inside the world and reflects airborne wall impacts.
   * @returns {boolean} Whether Byte touched a world boundary.
   */
  keepInsideWorld(worldWidth, config) {
    this.#validateWorldBounds(worldWidth, config);
    const minimumX = config.wallInsetPixels;
    const maximumX = worldWidth - minimumX - this.#character.width;
    const direction = this.#getBoundaryDirection(minimumX, maximumX);
    if (direction === 0) return false;
    this.#character.x = clamp(this.#character.x, minimumX, maximumX);
    if (!this.#isMovingOutward(direction)) return true;
    if (this.#character.isOnGround) this.#character.velocityX = 0;
    else this.reflectWallImpact(direction, config);
    return true;
  }

  /** Reflects an airborne horizontal impact back into playable space. */
  reflectWallImpact(direction, config) {
    if (direction !== -1 && direction !== 1) {
      throw new RangeError("A wall-impact direction must be -1 or 1.");
    }
    this.#validateWallBounceConfig(config);
    if (this.#character.isOnGround) return this.#stopWallMovement();
    const speed = this.#getWallBounceSpeed(config);
    this.#character.velocityX = direction * speed;
    this.#character.facingDirection = direction;
  }

  /** Allows deliberate left/right correction briefly after a shaft rebound. */
  updateWallReboundControl(deltaTimeSeconds, input, config) {
    const direction = this.#getDirection(input);
    if (direction === 0) return;
    const acceleration =
      config.wallReboundAirControlAccelerationPixelsPerSecondSquared;
    const maximumSpeed = config.wallReboundAirControlMaximumSpeedPixelsPerSecond;
    this.#character.velocityX = clamp(
      this.#character.velocityX + direction * acceleration * deltaTimeSeconds,
      -maximumSpeed,
      maximumSpeed,
    );
    this.#character.facingDirection = direction;
  }

  /** Clears wall movement. */
  #stopWallMovement() {
    this.#character.velocityX = 0;
  }

  /** Returns wall bounce speed. */
  #getWallBounceSpeed(config) {
    const retainedSpeed = Math.abs(this.#character.velocityX) *
      config.wallBounceHorizontalRetention;
    return Math.max(config.minimumWallBounceSpeedPixelsPerSecond, retainedSpeed);
  }

  /** Performs the accelerate operation. */
  #accelerate(deltaTimeSeconds, direction, config) {
    const acceleration = config.horizontalAccelerationPixelsPerSecondSquared;
    const maximumSpeed = config.maximumHorizontalSpeedPixelsPerSecond;
    this.#character.velocityX = clamp(
      this.#character.velocityX + direction * acceleration * deltaTimeSeconds,
      -maximumSpeed,
      maximumSpeed,
    );
  }

  /** Applies braking. */
  #applyBraking(deltaTimeSeconds, config) {
    const braking = config.horizontalBrakingPixelsPerSecondSquared * deltaTimeSeconds;
    if (Math.abs(this.#character.velocityX) <= braking) {
      this.#character.velocityX = 0;
      return;
    }
    this.#character.velocityX -= Math.sign(this.#character.velocityX) * braking;
  }

  /** Returns boundary direction. */
  #getBoundaryDirection(minimumX, maximumX) {
    const velocity = this.#character.velocityX;
    const hitsLeft = this.#character.x < minimumX ||
      (this.#character.x === minimumX && velocity < 0);
    const hitsRight = this.#character.x > maximumX ||
      (this.#character.x === maximumX && velocity > 0);
    if (hitsLeft) return 1;
    if (hitsRight) return -1;
    return 0;
  }

  /** Checks the moving outward condition. */
  #isMovingOutward(inwardDirection) {
    return this.#character.velocityX * inwardDirection < 0;
  }

  /** Validates world bounds. */
  #validateWorldBounds(worldWidth, config) {
    const inset = config?.wallInsetPixels;
    const hasWidth = Number.isFinite(worldWidth) && worldWidth > this.#character.width;
    const hasInset = Number.isFinite(inset) && inset >= 0 &&
      inset * 2 + this.#character.width < worldWidth;
    if (hasWidth && hasInset) return;
    throw new RangeError("The visible wall boundaries are invalid.");
  }

  /** Validates wall bounce config. */
  #validateWallBounceConfig(config) {
    const retention = config?.wallBounceHorizontalRetention;
    const minimumSpeed = config?.minimumWallBounceSpeedPixelsPerSecond;
    const hasRetention = Number.isFinite(retention) && retention > 0 && retention < 1;
    if (hasRetention && Number.isFinite(minimumSpeed) && minimumSpeed > 0) return;
    throw new TypeError("The wall-bounce configuration is invalid.");
  }

  /** Returns direction. */
  #getDirection(input) {
    return Number(input.right) - Number(input.left);
  }
}
