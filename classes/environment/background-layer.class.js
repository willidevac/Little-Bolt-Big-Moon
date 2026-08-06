import { DrawableObject } from "../base/drawable-object.class.js";

/**
 * Travels once through a tall panorama without repeating image areas.
 */
export class BackgroundLayer extends DrawableObject {
  /**
   * Creates the configured instance.
   * @param {{source:string, frameWidth:number, frameHeight:number, scrollRate?:number}} config Configuration values used by the operation.
   */
  constructor(config) {
    super();
    this.#validateConfig(config);
    this.scrollRate = config.scrollRate ?? 1;
    this.loadSprite({
      source: config.source,
      frameWidth: config.frameWidth,
      frameHeight: config.frameHeight,
      frameCount: 1,
    });
  }

  /**
   * Moves an undistorted 16:9 crop through the entire panorama.
   * @param {CanvasRenderingContext2D} context Canvas context used for rendering.
   * @param {Readonly<{topY:number, bottomY:number}>} bounds Optional movement limits applied to the camera.
   * @param {{y:number}} camera Camera providing the current world offset.
   * @param {Readonly<{width:number, height:number}>} viewport Viewport dimensions used to position the effect.
   */
  drawForZone(context, bounds, camera, viewport) {
    if (this.imageState !== "ready") return this.#drawFallback(context, viewport);
    const source = this.#getSourceFrame(bounds, camera, viewport);
    this.#drawSource(context, source, viewport);
  }

  /**
   * Draws source.
   * @param {CanvasRenderingContext2D} context Canvas context used for rendering.
   * @param {CanvasImageSource} source Source supplied to draw source.
   * @param {Readonly<{width:number,height:number}>} viewport Viewport dimensions used to position the effect.
   */
  #drawSource(context, source, viewport) {
    context.drawImage(
      this.image,
      0,
      source.y,
      source.width,
      source.height,
      0,
      0,
      viewport.width,
      viewport.height,
    );
  }

  /**
   * Draws fallback.
   * @param {CanvasRenderingContext2D} context Canvas context used for rendering.
   * @param {Readonly<{width:number,height:number}>} viewport Viewport dimensions used to position the effect.
   */
  #drawFallback(context, viewport) {
    this.drawCurrentFrame(context, 0, 0, viewport.width, viewport.height);
  }

  /**
   * Returns source frame.
   * @param {Readonly<object>} bounds Optional movement limits applied to the camera.
   * @param {Readonly<object>} camera Camera providing the current world offset.
   * @param {Readonly<{width:number,height:number}>} viewport Viewport dimensions used to position the effect.
   */
  #getSourceFrame(bounds, camera, viewport) {
    const sourceWidth = this.spriteConfig.frameWidth;
    const sourceHeight = this.spriteConfig.frameHeight;
    const sourceCropHeight = sourceWidth * (viewport.height / viewport.width);
    const maximumSourceY = sourceHeight - sourceCropHeight;
    const worldProgress = this.#getScrollProgress(
      bounds,
      camera,
      viewport.height,
    );
    const progress = this.#getLayerProgress(worldProgress);
    return { width: sourceWidth, height: sourceCropHeight, y: maximumSourceY * progress };
  }

  /**
   * Returns layer progress.
   * @param {number} worldProgress World progress supplied to get layer progress.
   */
  #getLayerProgress(worldProgress) {
    const centeredProgress = worldProgress - 0.5;
    return this.#clamp(0.5 + centeredProgress * this.scrollRate, 0, 1);
  }

  /**
   * Returns scroll progress.
   * @param {Readonly<object>} bounds Optional movement limits applied to the camera.
   * @param {Readonly<object>} camera Camera providing the current world offset.
   * @param {number} viewportHeight Viewport height supplied to get scroll progress.
   */
  #getScrollProgress(bounds, camera, viewportHeight) {
    const scrollableWorldHeight = bounds.bottomY - bounds.topY - viewportHeight;
    const localCameraY = this.#clamp(
      camera.y - bounds.topY,
      0,
      scrollableWorldHeight,
    );
    return scrollableWorldHeight > 0 ? localCameraY / scrollableWorldHeight : 0;
  }

  /**
   * Performs the clamp operation.
   * @param {string} value Value read, validated, or rendered by the operation.
   * @param {number} minimum Minimum supplied to clamp.
   * @param {number} maximum Maximum supplied to clamp.
   */
  #clamp(value, minimum, maximum) {
    return Math.min(Math.max(value, minimum), maximum);
  }

  /**
   * Validates config.
   * @param {Readonly<object>} config Configuration values used by the operation.
   */
  #validateConfig(config) {
    const hasValidSize = Number.isInteger(config?.frameWidth) &&
      Number.isInteger(config?.frameHeight) &&
      config.frameWidth > 0 &&
      config.frameHeight > config.frameWidth;
    const rate = config?.scrollRate ?? 1;
    const hasValidRate = Number.isFinite(rate) && rate > 0 && rate <= 1;
    if (typeof config?.source === "string" && hasValidSize &&
      hasValidRate) return;
    throw new TypeError("Das Hintergrundpanorama ist ungültig.");
  }
}
