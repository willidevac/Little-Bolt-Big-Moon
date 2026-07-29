import { BackgroundZone } from "../environment/background-zone.class.js";

/**
 * Zeichnet für jeden Levelabschnitt einen eigenen Hintergrund.
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
    if (!Array.isArray(sections) || sections.length === 0) {
      throw new TypeError("Die Hintergrundabschnitte fehlen.");
    }
    return sections.map((section) => {
      this.#validateSection(section);
      return {
        id: section.id,
        topY: section.topY,
        bottomY: section.bottomY,
        backgroundLayers: section.backgroundLayers,
      };
    });
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
