import { Platform } from "./platform.class.js";

/**
 * Bewegt eine Plattform gleichmäßig zwischen zwei waagerechten Grenzen.
 */
export class MovingPlatform extends Platform {
  /**
   * @param {Readonly<object>} platformData
   * @param {Readonly<object>} tilesetConfig
   */
  constructor(platformData, tilesetConfig) {
    super(platformData, tilesetConfig);
    this.#validateMovement(platformData.movement);
    this.minimumX = platformData.movement.minimumX;
    this.maximumX = platformData.movement.maximumX;
    this.speedPixelsPerSecond = platformData.movement.speedPixelsPerSecond;
    this.direction = 1;
  }

  /**
   * @param {number} deltaTimeSeconds
   */
  update(deltaTimeSeconds) {
    this.setFrameDisplacement(0, 0);
    if (!Number.isFinite(deltaTimeSeconds) || deltaTimeSeconds <= 0) return;
    const previousX = this.x;
    this.x += this.direction * this.speedPixelsPerSecond * deltaTimeSeconds;
    if (this.x >= this.maximumX) {
      this.x = this.maximumX;
      this.direction = -1;
    } else if (this.x <= this.minimumX) {
      this.x = this.minimumX;
      this.direction = 1;
    }
    this.setFrameDisplacement(this.x - previousX, 0);
  }

  #validateMovement(movement) {
    const hasBounds = Number.isFinite(movement?.minimumX) &&
      Number.isFinite(movement?.maximumX) &&
      movement.minimumX <= this.x &&
      movement.maximumX >= this.x &&
      movement.maximumX > movement.minimumX;
    const hasSpeed = Number.isFinite(movement?.speedPixelsPerSecond) &&
      movement.speedPixelsPerSecond > 0;
    if (hasBounds && hasSpeed) return;
    throw new TypeError(`Die Bewegung von Plattform ${this.id} ist ungültig.`);
  }
}
