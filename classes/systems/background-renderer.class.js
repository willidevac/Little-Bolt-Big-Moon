import { BackgroundZone } from "../environment/background-zone.class.js";

/**
 * Zeichnet einzelne Raum-Panoramen und gemeinsame Parallax-Zonen.
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
