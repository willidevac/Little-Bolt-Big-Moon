import { BackgroundZone } from "../environment/background-zone.class.js";

const TRANSITION_HALF_HEIGHT_PIXELS = 600;

/**
 * Draws individual room panoramas and shared parallax zones.
 */
export class BackgroundRenderer {
  /**
   * Creates the configured system.
   * @param {ReadonlyArray<object>} sections World sections used by the renderer.
   * @param {Readonly<{width:number, height:number}>} viewport Viewport dimensions used for rendering.
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
   * Runs draw with validated inputs.
   * @param {CanvasRenderingContext2D} context Canvas context used for rendering.
   * @param {{y:number}} camera Camera supplying the current world offset.
   */
  draw(context, camera) {
    const transition = this.#getActiveTransition(camera);
    if (transition) return this.#drawTransition(context, camera, transition);
    this.zones.forEach((zone) => zone.draw(context, camera, this.viewport));
  }

  /**
   * Draws transition.
   * @param {CanvasRenderingContext2D} context Canvas context used for rendering.
   * @param {Readonly<object>} camera Camera supplying the current world offset.
   * @param {Readonly<object>} transition Transition used while draw transition.
   */
  #drawTransition(context, camera, transition) {
    const { lowerZone, upperZone, progress } = transition;
    lowerZone.drawBlended(context, camera, this.viewport, 1 - progress);
    upperZone.drawBlended(context, camera, this.viewport, progress);
  }

  /**
   * Returns active transition.
   * @param {Readonly<object>} camera Camera supplying the current world offset.
   */
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

  /**
   * Returns transition progress.
   * @param {number} centerY Center y used while get transition progress.
   * @param {number} boundaryY Boundary y used while get transition progress.
   */
  #getTransitionProgress(centerY, boundaryY) {
    const halfHeight = TRANSITION_HALF_HEIGHT_PIXELS;
    const distanceFromLowerEdge = boundaryY + halfHeight - centerY;
    return Math.min(Math.max(distanceFromLowerEdge / (halfHeight * 2), 0), 1);
  }

  /**
   * Creates section zones.
   * @param {ReadonlyArray<object>} sections World sections used by the renderer.
   */
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

  /**
   * Validates sections.
   * @param {ReadonlyArray<object>} sections World sections used by the renderer.
   */
  #validateSections(sections) {
    if (!Array.isArray(sections) || sections.length === 0) {
      throw new TypeError("Die Hintergrundabschnitte fehlen.");
    }
  }

  /**
   * Returns zone id.
   * @param {Readonly<object>} section Section used while get zone id.
   */
  #getZoneId(section) {
    return section.backgroundLayers.length > 1
      ? section.backgroundId
      : section.id;
  }

  /**
   * Creates zone.
   * @param {Readonly<object>} id Id used while create zone.
   * @param {Readonly<object>} section Section used while create zone.
   */
  #createZone(id, section) {
    return {
      id,
      topY: section.topY,
      bottomY: section.bottomY,
      backgroundLayers: section.backgroundLayers,
    };
  }

  /**
   * Performs the merge zone operation.
   * @param {Readonly<object>} zone Zone used while merge zone.
   * @param {Readonly<object>} section Section used while merge zone.
   */
  #mergeZone(zone, section) {
    return {
      ...zone,
      topY: Math.min(zone.topY, section.topY),
      bottomY: Math.max(zone.bottomY, section.bottomY),
    };
  }

  /**
   * Validates section.
   * @param {Readonly<object>} section Section used while validate section.
   */
  #validateSection(section) {
    const hasId = typeof section?.id === "string" && section.id.length > 0;
    const hasLayers = Array.isArray(section?.backgroundLayers) &&
      section.backgroundLayers.length > 0;
    if (hasId && hasLayers) return;
    throw new TypeError("Ein Levelabschnitt benötigt einen Hintergrund.");
  }

  /**
   * Validates viewport.
   * @param {Readonly<{width:number,height:number}>} viewport Viewport dimensions used for rendering.
   */
  #validateViewport(viewport) {
    const hasSize = Number.isFinite(viewport?.width) &&
      Number.isFinite(viewport?.height) &&
      viewport.width > 0 &&
      viewport.height > 0;
    if (!hasSize) throw new TypeError("Die Hintergrundansicht ist ungültig.");
  }
}
