import { BackgroundLayer } from "./background-layer.class.js";

const SEAM_OVERLAP_PIXELS = 4;

/**
 * Combines the parallax layers of a continuous vertical section.
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
   * Draws only the visible area and overlaps neighboring zones by four pixels.
   * @param {CanvasRenderingContext2D} context
   * @param {{y:number}} camera
   * @param {Readonly<{width:number, height:number}>} viewport
   */
  draw(context, camera, viewport) {
    const visible = this.#getVisibleBounds(camera, viewport);
    if (visible.bottom <= visible.top) return;
    this.#drawLayers(context, camera, viewport, visible);
  }

  /**
   * Draws the complete panorama with an opacity for biome crossfades.
   * @param {CanvasRenderingContext2D} context
   * @param {{y:number}} camera
   * @param {Readonly<{width:number, height:number}>} viewport
   * @param {number} opacity
   */
  drawBlended(context, camera, viewport, opacity) {
    if (!Number.isFinite(opacity) || opacity <= 0) return;
    context.save();
    context.globalAlpha = Math.min(opacity, 1);
    this.layers.forEach((layer) => {
      layer.drawForZone(context, this, camera, viewport);
    });
    context.restore();
  }

  /** Returns visible bounds. */
  #getVisibleBounds(camera, viewport) {
    const visibleTop = Math.max(
      0,
      this.topY - camera.y - SEAM_OVERLAP_PIXELS,
    );
    const visibleBottom = Math.min(
      viewport.height,
      this.bottomY - camera.y + SEAM_OVERLAP_PIXELS,
    );
    return { top: visibleTop, bottom: visibleBottom };
  }

  /** Draws layers. */
  #drawLayers(context, camera, viewport, visible) {
    context.save();
    context.beginPath();
    context.rect(0, visible.top, viewport.width, visible.bottom - visible.top);
    context.clip();
    this.layers.forEach((layer) => {
      layer.drawForZone(context, this, camera, viewport);
    });
    context.restore();
  }

  /** Validates config. */
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
