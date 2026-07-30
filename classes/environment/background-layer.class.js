import { DrawableObject } from "../base/drawable-object.class.js";

/**
 * Fährt einmalig durch ein hohes Panorama, ohne Bildbereiche zu wiederholen.
 */
export class BackgroundLayer extends DrawableObject {
  /**
   * @param {{source:string, frameWidth:number, frameHeight:number, scrollRate?:number}} config
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
   * Verschiebt einen unverzerrten 16:9-Ausschnitt durch das gesamte Panorama.
   * @param {CanvasRenderingContext2D} context
   * @param {Readonly<{topY:number, bottomY:number}>} bounds
   * @param {{y:number}} camera
   * @param {Readonly<{width:number, height:number}>} viewport
   */
  drawForZone(context, bounds, camera, viewport) {
    if (this.imageState !== "ready") return this.#drawFallback(context, viewport);
    const source = this.#getSourceFrame(bounds, camera, viewport);
    this.#drawSource(context, source, viewport);
  }

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

  #drawFallback(context, viewport) {
    this.drawCurrentFrame(context, 0, 0, viewport.width, viewport.height);
  }

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

  #getLayerProgress(worldProgress) {
    const centeredProgress = worldProgress - 0.5;
    return this.#clamp(0.5 + centeredProgress * this.scrollRate, 0, 1);
  }

  #getScrollProgress(bounds, camera, viewportHeight) {
    const scrollableWorldHeight = bounds.bottomY - bounds.topY - viewportHeight;
    const localCameraY = this.#clamp(
      camera.y - bounds.topY,
      0,
      scrollableWorldHeight,
    );
    return scrollableWorldHeight > 0 ? localCameraY / scrollableWorldHeight : 0;
  }

  #clamp(value, minimum, maximum) {
    return Math.min(Math.max(value, minimum), maximum);
  }

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
