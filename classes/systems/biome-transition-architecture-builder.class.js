import { EnvironmentStructure } from
  "../environment/environment-structure.class.js";
import { ArchitectureAtlasLibrary } from
  "../environment/architecture-atlas-library.class.js";
import { SECTION_EDGE_OFFSET_Y } from
  "../../js/config/platform-route-rules.js";

const GATE_PARTS = Object.freeze([
  Object.freeze({ frameId: "leftCorner", source: "lower", variant: "base" }),
  Object.freeze({ frameId: "arch", source: "upper", variant: "alternate" }),
  Object.freeze({ frameId: "rightCorner", source: "upper", variant: "alternate" }),
]);
const ROLE_SCALES = Object.freeze({ arch: 0.9, corner: 0.86 });
const GATE_BASE_OFFSET_Y = 48;

/** Builds four visual gates from both biomes beside every boss checkpoint. */
export class BiomeTransitionArchitectureBuilder {
  /**
   * @param {number} worldWidth
   * @param {ArchitectureAtlasLibrary} atlasLibrary
   */
  constructor(worldWidth, atlasLibrary) {
    if (!Number.isFinite(worldWidth) || worldWidth <= 0 ||
      typeof atlasLibrary?.get !== "function") {
      throw new TypeError("Biome transitions need width and an atlas library.");
    }
    this.worldWidth = worldWidth;
    this.atlasLibrary = atlasLibrary;
  }

  /** Returns three decorative structures for every biome boundary. */
  build(sections) {
    if (!Array.isArray(sections) || sections.length < 2) {
      throw new TypeError("Biome transitions need ordered sections.");
    }
    const gates = sections.slice(0, -1).flatMap((lowerSection, index) => {
      const upperSection = sections[index + 1];
      return lowerSection.tileset === upperSection.tileset
        ? [] : this.#createGate(lowerSection, upperSection);
    });
    return Object.freeze(gates);
  }

  #createGate(lowerSection, upperSection) {
    return GATE_PARTS.map((part, index) => {
      const sourceSection = part.source === "lower" ? lowerSection : upperSection;
      return this.#createPart(lowerSection, upperSection, sourceSection, part,
        index);
    });
  }

  #createPart(lowerSection, upperSection, sourceSection, part, index) {
    const architecture = this.atlasLibrary.get(sourceSection.tileset,
      part.variant);
    const frame = architecture.frames[part.frameId];
    const role = part.frameId === "arch" ? "arch" : "corner";
    const size = this.#getSize(frame, ROLE_SCALES[role]);
    const position = this.#getPosition(part.frameId, size, lowerSection.topY);
    const data = this.#createData(lowerSection, upperSection, index, role,
      frame, size, position);
    return new EnvironmentStructure(data, architecture.atlas);
  }

  #createData(lowerSection, upperSection, index, role, frame, size, position) {
    return Object.freeze({
      id: `biome-gate-${lowerSection.tileset}-to-${upperSection.tileset}-${index + 1}`,
      role, frame, ...size, ...position, collisionBoxes: [],
    });
  }

  #getPosition(frameId, size, boundaryY) {
    const x = this.#getX(frameId, size.width);
    const floorY = boundaryY + SECTION_EDGE_OFFSET_Y;
    return Object.freeze({ x, y: floorY + GATE_BASE_OFFSET_Y - size.height });
  }

  #getX(frameId, width) {
    if (frameId === "leftCorner") return 0;
    if (frameId === "rightCorner") return this.worldWidth - width;
    return Math.round((this.worldWidth - width) / 2);
  }

  #getSize(frame, scale) {
    return Object.freeze({
      width: Math.round(frame.width * scale),
      height: Math.round(frame.height * scale),
    });
  }
}
