import { StructureSpriteAtlas } from "./structure-sprite-atlas.class.js";
import {
  createArchitectureAtlasConfig,
  getArchitectureFrames,
} from "../../js/config/environment-architecture-config.js";

/** Owns one shared sprite atlas for every biome and visual variant. */
export class ArchitectureAtlasLibrary {
  /** Creates an initially empty shared atlas collection. */
  constructor() {
    this.atlases = new Map();
  }

  /** Returns a shared atlas together with its crop definitions. */
  get(biomeId, variantId) {
    const key = `${biomeId}-${variantId}`;
    if (!this.atlases.has(key)) {
      this.atlases.set(key, this.#createEntry(biomeId, variantId));
    }
    return this.atlases.get(key);
  }

  #createEntry(biomeId, variantId) {
    const config = createArchitectureAtlasConfig(biomeId, variantId);
    return Object.freeze({
      atlas: new StructureSpriteAtlas(config),
      frames: getArchitectureFrames(biomeId, variantId),
    });
  }
}
