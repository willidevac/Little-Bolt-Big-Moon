import { BackgroundZone } from "../environment/background-zone.class.js";

/**
 * Verbindet die drei Kapitel eines Hauptgebiets zu einem langen Panorama.
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
      this.#mergeBiomeSections(sections).map((zone) => {
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

  #mergeBiomeSections(sections) {
    if (!Array.isArray(sections) || sections.length === 0) {
      throw new TypeError("Die Hintergrundabschnitte fehlen.");
    }
    const biomes = new Map();
    sections.forEach((section) => {
      const backgroundId = section?.backgroundId;
      if (typeof backgroundId !== "string" || backgroundId.length === 0) {
        throw new TypeError("Ein Levelabschnitt benötigt eine Hintergrund-ID.");
      }
      const existing = biomes.get(backgroundId);
      if (!existing) {
        biomes.set(backgroundId, {
          id: backgroundId,
          topY: section.topY,
          bottomY: section.bottomY,
          backgroundLayers: section.backgroundLayers,
        });
        return;
      }
      existing.topY = Math.min(existing.topY, section.topY);
      existing.bottomY = Math.max(existing.bottomY, section.bottomY);
    });
    return [...biomes.values()];
  }

  #validateViewport(viewport) {
    const hasSize = Number.isFinite(viewport?.width) &&
      Number.isFinite(viewport?.height) &&
      viewport.width > 0 &&
      viewport.height > 0;
    if (!hasSize) throw new TypeError("Die Hintergrundansicht ist ungültig.");
  }
}
