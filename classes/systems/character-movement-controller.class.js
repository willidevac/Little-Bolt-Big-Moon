import { clamp } from "../../js/utils/math.js";

/** Steuert Bytes waagerechte Bodenbewegung und begrenzt sie auf die Welt. */
export class CharacterMovementController {
  /** @param {import("../entities/character.class.js").Character} character */
  constructor(character) {
    this.character = character;
  }

  /** Aktualisiert Bytes Blickrichtung über die waagerechte Eingabe. */
  updateFacingDirection(input) {
    const direction = this.#getDirection(input);
    if (direction !== 0) this.character.facingDirection = direction;
  }

  /**
   * Beschleunigt oder bremst Byte während einer Bodenbewegung.
   * @param {number} deltaTimeSeconds
   * @param {Readonly<object>} input
   * @param {Readonly<object>} config
   */
  updateGroundMovement(deltaTimeSeconds, input, config) {
    const direction = this.#getDirection(input);
    if (direction === 0) return this.#applyBraking(deltaTimeSeconds, config);
    this.character.facingDirection = direction;
    this.#accelerate(deltaTimeSeconds, direction, config);
  }

  /** Hält Byte innerhalb des linken und rechten Weltrands. */
  keepInsideWorld(worldWidth) {
    const previousX = this.character.x;
    const maximumX = worldWidth - this.character.width;
    this.character.x = clamp(previousX, 0, maximumX);
    if (this.character.x !== previousX) this.character.velocityX = 0;
  }

  #accelerate(deltaTimeSeconds, direction, config) {
    const acceleration = config.horizontalAccelerationPixelsPerSecondSquared;
    const maximumSpeed = config.maximumHorizontalSpeedPixelsPerSecond;
    this.character.velocityX = clamp(
      this.character.velocityX + direction * acceleration * deltaTimeSeconds,
      -maximumSpeed,
      maximumSpeed,
    );
  }

  #applyBraking(deltaTimeSeconds, config) {
    const braking = config.horizontalBrakingPixelsPerSecondSquared * deltaTimeSeconds;
    if (Math.abs(this.character.velocityX) <= braking) {
      this.character.velocityX = 0;
      return;
    }
    this.character.velocityX -= Math.sign(this.character.velocityX) * braking;
  }

  #getDirection(input) {
    return Number(input.right) - Number(input.left);
  }
}
