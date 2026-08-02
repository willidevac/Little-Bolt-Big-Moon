import { BackgroundZone } from "../environment/background-zone.class.js";

const TRANSITION_HALF_HEIGHT_PIXELS = 96;
const TRANSITION_STOPS = Object.freeze([
  Object.freeze([0, "rgba(8, 13, 22, 0)"]),
  Object.freeze([0.42, "rgba(8, 13, 22, 0.42)"]),
  Object.freeze([0.5, "rgba(8, 13, 22, 0.72)"]),
  Object.freeze([0.58, "rgba(8, 13, 22, 0.42)"]),
  Object.freeze([1, "rgba(8, 13, 22, 0)"]),
]);

/**
 * Draws individual room panoramas and shared parallax zones.
 */
export class BackgroundRenderer {
  /**
   * @param {ReadonlyArray<object>} sections
   * @param {Readonly<{width:number, height:number}>} viewport
   */
  constructor(sections = [], viewport) {
    this.#validateViewport(viewport);
    this.viewport = Object.freeze({ ...viewport });
    this.zones = Object.freeze(
      this.#createSectionZones(sections).map((zone) => {
        return new BackgroundZone(zone);
      }),
    );
  }

  /**
   * @param {CanvasRenderingContext2D} context
   * @param {{y:number}} camera
   */
  draw(context, camera) {
    this.zones.forEach((zone) => {
      zone.draw(context, camera, this.viewport);
    });
    this.#drawTransitions(context, camera);
  }

  #drawTransitions(context, camera) {
    this.zones.slice(0, -1).forEach((zone) => {
      this.#drawTransition(context, zone.topY - camera.y);
    });
  }

  #drawTransition(context, screenY) {
    const halfHeight = TRANSITION_HALF_HEIGHT_PIXELS;
    if (!this.#isTransitionVisible(screenY, halfHeight)) return;
    const gradient = context.createLinearGradient(
      0, screenY - halfHeight, 0, screenY + halfHeight,
    );
    TRANSITION_STOPS.forEach(([offset, color]) => {
      gradient.addColorStop(offset, color);
    });
    this.#fillTransition(context, gradient, screenY, halfHeight);
  }

  #fillTransition(context, gradient, screenY, halfHeight) {
    context.save();
    context.fillStyle = gradient;
    context.fillRect(
      0, screenY - halfHeight, this.viewport.width, halfHeight * 2,
    );
    context.restore();
  }

  #isTransitionVisible(screenY, halfHeight) {
    return screenY + halfHeight > 0 &&
      screenY - halfHeight < this.viewport.height;
  }

  #createSectionZones(sections) {
    this.#validateSections(sections);
    const zones = new Map();
    sections.forEach((section) => {
      this.#validateSection(section);
      const id = this.#getZoneId(section);
      const current = zones.get(id);
      zones.set(id, current
        ? this.#mergeZone(current, section)
        : this.#createZone(id, section));
    });
    return [...zones.values()];
  }

  #validateSections(sections) {
    if (!Array.isArray(sections) || sections.length === 0) {
      throw new TypeError("Die Hintergrundabschnitte fehlen.");
    }
  }

  #getZoneId(section) {
    return section.backgroundLayers.length > 1
      ? section.backgroundId
      : section.id;
  }

  #createZone(id, section) {
    return {
      id,
      topY: section.topY,
      bottomY: section.bottomY,
      backgroundLayers: section.backgroundLayers,
    };
  }

  #mergeZone(zone, section) {
    return {
      ...zone,
      topY: Math.min(zone.topY, section.topY),
      bottomY: Math.max(zone.bottomY, section.bottomY),
    };
  }

  #validateSection(section) {
    const hasId = typeof section?.id === "string" && section.id.length > 0;
    const hasLayers = Array.isArray(section?.backgroundLayers) &&
      section.backgroundLayers.length > 0;
    if (hasId && hasLayers) return;
    throw new TypeError("Ein Levelabschnitt benötigt einen Hintergrund.");
  }

  #validateViewport(viewport) {
    const hasSize = Number.isFinite(viewport?.width) &&
      Number.isFinite(viewport?.height) &&
      viewport.width > 0 &&
      viewport.height > 0;
    if (!hasSize) throw new TypeError("Die Hintergrundansicht ist ungültig.");
  }
}
