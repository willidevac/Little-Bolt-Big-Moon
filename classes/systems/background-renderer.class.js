import { BackgroundZone } from "../environment/background-zone.class.js";

const TRANSITION_HALF_HEIGHT_PIXELS = 600;

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
    const transition = this.#getActiveTransition(camera);
    if (transition) return this.#drawTransition(context, camera, transition);
    this.zones.forEach((zone) => zone.draw(context, camera, this.viewport));
  }

  #drawTransition(context, camera, transition) {
    const { lowerZone, upperZone, progress } = transition;
    lowerZone.drawBlended(context, camera, this.viewport, 1 - progress);
    upperZone.drawBlended(context, camera, this.viewport, progress);
  }

  #getActiveTransition(camera) {
    const centerY = camera.y + this.viewport.height / 2;
    const lowerZone = this.zones.slice(0, -1).find((zone) => {
      return Math.abs(centerY - zone.topY) < TRANSITION_HALF_HEIGHT_PIXELS;
    });
    if (!lowerZone) return null;
    const upperZone = this.zones[this.zones.indexOf(lowerZone) + 1];
    const progress = this.#getTransitionProgress(centerY, lowerZone.topY);
    return Object.freeze({ lowerZone, upperZone, progress });
  }

  #getTransitionProgress(centerY, boundaryY) {
    const halfHeight = TRANSITION_HALF_HEIGHT_PIXELS;
    const distanceFromLowerEdge = boundaryY + halfHeight - centerY;
    return Math.min(Math.max(distanceFromLowerEdge / (halfHeight * 2), 0), 1);
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
