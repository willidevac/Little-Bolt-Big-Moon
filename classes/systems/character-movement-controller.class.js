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

  /** Keeps Byte within the left and right world boundaries. */
  keepInsideWorld(worldWidth) {
    const previousX = this.#character.x;
    const maximumX = worldWidth - this.#character.width;
    this.#character.x = clamp(previousX, 0, maximumX);
    if (this.#character.x !== previousX) this.#character.velocityX = 0;
  }

  #accelerate(deltaTimeSeconds, direction, config) {
    const acceleration = config.horizontalAccelerationPixelsPerSecondSquared;
    const maximumSpeed = config.maximumHorizontalSpeedPixelsPerSecond;
    this.#character.velocityX = clamp(
      this.#character.velocityX + direction * acceleration * deltaTimeSeconds,
      -maximumSpeed,
      maximumSpeed,
    );
  }

  #applyBraking(deltaTimeSeconds, config) {
    const braking = config.horizontalBrakingPixelsPerSecondSquared * deltaTimeSeconds;
    if (Math.abs(this.#character.velocityX) <= braking) {
      this.#character.velocityX = 0;
      return;
    }
    this.#character.velocityX -= Math.sign(this.#character.velocityX) * braking;
  }

  #getDirection(input) {
    return Number(input.right) - Number(input.left);
  }
}
