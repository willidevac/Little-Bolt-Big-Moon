import { BackgroundLayer } from "./background-layer.class.js";

const SEAM_OVERLAP_PIXELS = 4;

/**
 * Verbindet die Parallax-Ebenen eines zusammenhängenden Höhenabschnitts.
 */
export class BackgroundZone {
  /**
   * @param {{id:string, topY:number, bottomY:number, backgroundLayers:ReadonlyArray<object>}} config
   */
  constructor(config) {
    this.#validateConfig(config);
    this.id = config.id;
    this.topY = config.topY;
    this.bottomY = config.bottomY;
    this.layers = Object.freeze(
      config.backgroundLayers.map((layer) => new BackgroundLayer(layer)),
    );
  }

  /**
   * Zeichnet nur den sichtbaren Teil und überlappt Nachbarzonen um vier Pixel.
   * @param {CanvasRenderingContext2D} context
   * @param {{y:number}} camera
   * @param {Readonly<{width:number, height:number}>} viewport
   */
  draw(context, camera, viewport) {
    const visibleTop = Math.max(
      0,
      this.topY - camera.y - SEAM_OVERLAP_PIXELS,
    );
    const visibleBottom = Math.min(
      viewport.height,
      this.bottomY - camera.y + SEAM_OVERLAP_PIXELS,
    );
    if (visibleBottom <= visibleTop) return;
    context.save();
    context.beginPath();
    context.rect(0, visibleTop, viewport.width, visibleBottom - visibleTop);
    context.clip();
    this.layers.forEach((layer) => {
      layer.drawForZone(context, this, camera, viewport);
    });
    context.restore();
  }

  #validateConfig(config) {
    const hasValidBounds = Number.isFinite(config?.topY) &&
      Number.isFinite(config?.bottomY) &&
      config.bottomY > config.topY;
    const hasLayers = Array.isArray(config?.backgroundLayers) &&
      config.backgroundLayers.length > 0;
    if (typeof config?.id === "string" && hasValidBounds && hasLayers) return;
    throw new TypeError("Die Hintergrundzone ist ungültig.");
  }
}
