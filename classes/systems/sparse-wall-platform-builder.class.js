import { SpriteSurfacePlatform } from
  "../environment/sprite-surface-platform.class.js";
import {
  getStartFloorSpriteConfig,
  getWallFeatureProfile,
  getWallPlatformSpriteConfig,
  START_FLOOR_Y,
  WALL_BOUNCE_CHALLENGES,
  WALL_WIDTH,
} from "../../js/config/wall-course-config.js";

const PLATFORM_HEIGHT = 64;
const WALL_OVERLAP = 8;
const FEATURE_RATIOS = Object.freeze([
  0.02, 0.1, 0.18, 0.27, 0.36, 0.45,
  0.54, 0.63, 0.72, 0.81, 0.89, 0.96,
]);
const FEATURE_RATIOS_BY_BIOME = Object.freeze({
  scrapyard: Object.freeze([
    0.12, 0.2, 0.28, 0.36, 0.44, 0.52,
    0.6, 0.68, 0.76, 0.84, 0.92, 0.98,
  ]),
});
const FEATURE_WIDTH_ROLES = Object.freeze([
  0, 1, "small", 2, 1, 0, "cross", 2, 3, "small", 1, "cross",
]);
const SIDE_PATTERNS = Object.freeze({
  scrapyard: Object.freeze([
    "left", "left", "right", "left", "right", "right",
    "left", "left", "right", "left", "right", "right",
  ]),
  factory: Object.freeze([
    "right", "left", "left", "right", "right", "left",
    "right", "left", "right", "right", "left", "left",
  ]),
  "launch-tower": Object.freeze([
    "left", "right", "right", "left", "left", "right",
    "left", "right", "right", "left", "left", "right",
  ]),
  "space-station": Object.freeze([
    "right", "right", "left", "right", "left", "left",
    "right", "left", "right", "right", "left", "left",
  ]),
  moon: Object.freeze([
    "left", "right", "left", "left", "right", "right",
    "left", "right", "right", "left", "right", "left",
  ]),
});
const ACCENTS = Object.freeze({
  scrapyard: "#35e8ef", factory: "#ff8a32",
  "launch-tower": "#4ce8ff", "space-station": "#77efff",
  moon: "#9aefff",
});

/** Builds rare wall features, not the later intermediate jump route. */
export class SparseWallPlatformBuilder {
  /** @param {number} worldWidth */
  constructor(worldWidth) {
    this.worldWidth = worldWidth;
  }

  /** Returns one safe floor plus twelve landmark wall platforms per biome. */
  build(sections) {
    const platforms = [this.#createFloor()];
    this.#groupBiomes(sections).forEach((biome) => {
      const profile = getWallFeatureProfile(biome.id);
      const entrances = WALL_BOUNCE_CHALLENGES.filter((challenge) => {
        return challenge.biomeId === biome.id;
      });
      this.#createFeatureSlots(biome, entrances).forEach((slot, index) => {
        const { entrance, side, y } = slot;
        const width = this.#resolveWidth(profile, FEATURE_WIDTH_ROLES[index]);
        platforms.push(this.#createWallFeature(
          biome.id, side, width, y, index, entrance,
        ));
      });
    });
    return Object.freeze(platforms);
  }

  #createFeatureSlots(biome, entrances) {
    const ratios = FEATURE_RATIOS_BY_BIOME[biome.id] ?? FEATURE_RATIOS;
    const slots = ratios.map((ratio, index) => ({
      entrance: null,
      side: SIDE_PATTERNS[biome.id][index],
      y: Math.round(biome.bottomY - biome.height * ratio),
    }));
    entrances.forEach((entrance) => {
      const targetY = entrance.y + entrance.height;
      const available = slots
        .map((slot, index) => ({ index, distance: Math.abs(slot.y - targetY) }))
        .filter(({ index }) => slots[index].entrance === null)
        .sort((first, second) => first.distance - second.distance)[0];
      Object.assign(slots[available.index], {
        entrance,
        side: entrance.entrySide,
        y: targetY,
      });
    });
    return slots;
  }

  #createFloor() {
    const data = Object.freeze({
      id: "scrapyard-continuous-start-floor",
      kind: "floor",
      x: 0,
      y: START_FLOOR_Y,
      width: this.worldWidth,
      height: 96,
      accentColor: ACCENTS.scrapyard,
    });
    return new SpriteSurfacePlatform(data, getStartFloorSpriteConfig());
  }

  #createWallFeature(biomeId, side, width, y, index, entrance) {
    const innerX = WALL_WIDTH - WALL_OVERLAP;
    const x = entrance
      ? this.#getReboundPlatformX(entrance, side, width)
      : side === "left"
        ? innerX
        : this.worldWidth - innerX - width;
    const data = Object.freeze({
      id: `${biomeId}-${side}-wall-feature-${index + 1}`,
      kind: "wall-feature-platform",
      anchorSide: side,
      anchorStructureId: entrance ? `${entrance.id}-${side}-wall` : null,
      biomeId,
      x,
      y,
      width,
      height: PLATFORM_HEIGHT,
      accentColor: ACCENTS[biomeId],
    });
    return new SpriteSurfacePlatform(data, getWallPlatformSpriteConfig(biomeId));
  }

  #getReboundPlatformX(challenge, side, width) {
    if (side === "left") return challenge.leftX + WALL_WIDTH - WALL_OVERLAP;
    return challenge.rightX + WALL_OVERLAP - width;
  }

  #resolveWidth(profile, role) {
    if (role === "cross") return profile.crossWidth;
    if (role === "small") return profile.smallWidth;
    return profile.standardWidths[role];
  }

  #groupBiomes(sections) {
    const grouped = new Map();
    sections.forEach((section) => {
      const current = grouped.get(section.tileset) ?? {
        id: section.tileset,
        topY: section.topY,
        bottomY: section.bottomY,
      };
      current.topY = Math.min(current.topY, section.topY);
      current.bottomY = Math.max(current.bottomY, section.bottomY);
      grouped.set(section.tileset, current);
    });
    return [...grouped.values()].map((biome) => Object.freeze({
      ...biome,
      height: biome.bottomY - biome.topY,
    }));
  }
}
