import { DrawableObject } from "../base/drawable-object.class.js";

/**
 * Fährt einmalig durch ein hohes Panorama, ohne Bildbereiche zu wiederholen.
 */
export class BackgroundLayer extends DrawableObject {
  /**
   * @param {{source:string, frameWidth:number, frameHeight:number}} config
   */
  constructor(config) {
    super();
    this.#validateConfig(config);
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
    if (this.imageState !== "ready") {
      this.drawCurrentFrame(
        context,
        0,
        0,
        viewport.width,
        viewport.height,
      );
      return;
    }
    const sourceWidth = this.spriteConfig.frameWidth;
    const sourceHeight = this.spriteConfig.frameHeight;
    const sourceCropHeight = sourceWidth * (viewport.height / viewport.width);
    const maximumSourceY = sourceHeight - sourceCropHeight;
    const scrollableWorldHeight = bounds.bottomY - bounds.topY - viewport.height;
    const localCameraY = this.#clamp(
      camera.y - bounds.topY,
      0,
      scrollableWorldHeight,
    );
    const progress = scrollableWorldHeight > 0
      ? localCameraY / scrollableWorldHeight
      : 0;
    context.drawImage(
      this.image,
      0,
      maximumSourceY * progress,
      sourceWidth,
      sourceCropHeight,
      0,
      0,
      viewport.width,
      viewport.height,
    );
  }

  #clamp(value, minimum, maximum) {
    return Math.min(Math.max(value, minimum), maximum);
  }

  #validateConfig(config) {
    const hasValidSize = Number.isInteger(config?.frameWidth) &&
      Number.isInteger(config?.frameHeight) &&
      config.frameWidth > 0 &&
      config.frameHeight > config.frameWidth;
    if (typeof config?.source === "string" && hasValidSize) return;
    throw new TypeError("Das Hintergrundpanorama ist ungültig.");
  }
}
