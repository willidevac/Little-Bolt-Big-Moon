import { DrawableObject } from "../base/drawable-object.class.js";

/**
 * Collision surface for static and moving platforms.
 */
export class Platform extends DrawableObject {
  /**
   * Creates the configured instance.
   * @param {Readonly<object>} [platformData] Platform data supplied to constructor.
   * @param {Readonly<object>} [tilesetConfig] Tileset config supplied to constructor.
   */
  constructor(platformData, tilesetConfig) {
    super();
    if (platformData === undefined && tilesetConfig === undefined) return;
    this.#validatePlatformData(platformData, tilesetConfig);
    this.#applyPlatformData(platformData, tilesetConfig);
    this.loadSprite(tilesetConfig);
  }

  /**
   * Applies platform data.
   * @param {Readonly<object>} platformData Platform data supplied to apply platform data.
   * @param {Readonly<object>} tilesetConfig Tileset config supplied to apply platform data.
   */
  #applyPlatformData(platformData, tilesetConfig) {
    this.id = platformData.id;
    this.x = platformData.x;
    this.y = platformData.y;
    this.frameDisplacementX = 0;
    this.frameDisplacementY = 0;
    this.tileSize = tilesetConfig.frameWidth * tilesetConfig.renderScale;
    this.visualOffsetY = tilesetConfig.surfaceOffset * tilesetConfig.renderScale;
    this.tileFrames = Object.freeze([...platformData.tileFrames]);
    this.width = this.tileFrames.length * this.tileSize;
    this.height = this.tileSize;
  }

  /**
   * Stores this platform's actual movement during the current frame.
   * @param {number} x Horizontal coordinate in canvas pixels.
   * @param {number} y Vertical coordinate in canvas pixels.
   */
  setFrameDisplacement(x, y) {
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      throw new TypeError("Die Plattformbewegung ist ungültig.");
    }
    this.frameDisplacementX = x;
    this.frameDisplacementY = y;
  }

  /** @returns {Readonly<{x:number,y:number}>} */
  getFrameDisplacement() {
    return Object.freeze({
      x: this.frameDisplacementX,
      y: this.frameDisplacementY,
    });
  }

  /**
   * Optionally reacts when a movable object lands.
   * @returns {boolean}
   */
  onLanded() {
    return false;
  }

  /**
   * Draws every platform tile without distorting the sprite sheet.
   * @param {CanvasRenderingContext2D} context Canvas context used for rendering.
   */
  draw(context) {
    if (!this.tileFrames) return super.draw(context);
    this.tileFrames.forEach((frameIndex, columnIndex) => {
      this.setFrameIndex(frameIndex);
      const tileX = this.x + columnIndex * this.tileSize;
      const tileY = this.y - this.visualOffsetY;
      this.drawCurrentFrame(context, tileX, tileY, this.tileSize, this.tileSize);
    });
  }

  /**
   * Validates platform data.
   * @param {Readonly<object>} data Source data used to configure the instance.
   * @param {Readonly<object>} tilesetConfig Tileset config supplied to validate platform data.
   */
  #validatePlatformData(data, tilesetConfig) {
    if (typeof data?.id !== "string" || data.id.length === 0) {
      throw new TypeError("Eine Plattform benötigt eine ID.");
    }
    if (!Number.isFinite(data.x) || !Number.isFinite(data.y)) {
      throw new TypeError(`Plattform ${data.id} benötigt eine gültige Position.`);
    }
    this.#validateTileFrames(data, tilesetConfig);
  }

  /**
   * Validates tile frames.
   * @param {Readonly<object>} data Source data used to configure the instance.
   * @param {Readonly<object>} tilesetConfig Tileset config supplied to validate tile frames.
   */
  #validateTileFrames(data, tilesetConfig) {
    if (!Array.isArray(data.tileFrames) || data.tileFrames.length === 0) {
      throw new TypeError(`Plattform ${data.id} benötigt mindestens ein Feld.`);
    }
    const frameCount = tilesetConfig?.frameCount ?? 0;
    const hasInvalidFrame = data.tileFrames.some((frame) => {
      return !Number.isInteger(frame) || frame < 0 || frame >= frameCount;
    });
    if (hasInvalidFrame) throw new RangeError(`Plattform ${data.id} enthält ungültige Felder.`);
    this.#validateTilesetConfig(tilesetConfig);
  }

  /**
   * Validates tileset config.
   * @param {Readonly<object>} tilesetConfig Tileset config supplied to validate tileset config.
   */
  #validateTilesetConfig(tilesetConfig) {
    if (!Number.isInteger(tilesetConfig?.renderScale) || tilesetConfig.renderScale <= 0) {
      throw new TypeError("Die Plattform-Skalierung ist ungültig.");
    }
    if (!Number.isInteger(tilesetConfig.surfaceOffset) || tilesetConfig.surfaceOffset < 0) {
      throw new TypeError("Der Plattform-Oberflächenabstand ist ungültig.");
    }
  }
}
