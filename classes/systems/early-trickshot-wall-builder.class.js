import { AnimatedBiomeWall } from
  "../environment/animated-biome-wall.class.js";
import { getTrickshotWallSpriteConfig } from
  "../../js/config/wall-course-config.js";

const WALL_RATIOS = Object.freeze({
  scrapyard: Object.freeze([0.055, 0.22, 0.43, 0.64, 0.84]),
  factory: Object.freeze([0.06, 0.2, 0.36, 0.53, 0.7, 0.86]),
});
const WALL_HEIGHTS = Object.freeze({
  scrapyard: Object.freeze([240, 256, 288, 320, 288]),
  factory: Object.freeze([272, 288, 336, 304, 368, 336]),
});
const WALL_SPEEDS = Object.freeze({ scrapyard: 0.22, factory: 0.18 });
const WALL_LIGHT_COLORS = Object.freeze({
  scrapyard: "#48f6f2",
  factory: "#ff9c42",
});
const PLATFORM_EDGE_INSET = 12;
const TRICKSHOT_WALL_WIDTH = 64;

/** Adds optional, floor-mounted rebound surfaces to the two opening biomes. */
export class EarlyTrickshotWallBuilder {
  /** Returns sparse trickshot walls without turning them into forced shafts. */
  build(sections, platforms) {
    const biomes = this.#getBiomeBounds(sections);
    const walls = Object.entries(WALL_RATIOS).flatMap(([biomeId, ratios]) => {
      const biome = biomes.get(biomeId);
      const anchors = this.#findAnchors(biome, platforms, ratios);
      return anchors.map(({ anchor, side }, index) => {
        return this.#createWall(biomeId, anchor, side, index);
      });
    });
    return Object.freeze(walls);
  }

  #findAnchors(biome, platforms, ratios) {
    const route = platforms.filter(({ routeRole }) => routeRole === "main")
      .sort((first, second) => first.routeOrder - second.routeOrder);
    const candidates = route.map((anchor, index) => ({
      anchor,
      side: this.#getOpenWallSide(route[index - 1], anchor, route[index + 1]),
    })).filter(({ anchor, side }) => {
      return anchor.biomeId === biome.id && !anchor.mechanic &&
        anchor.width >= 220 && side;
    });
    const selected = new Set();
    return ratios.map((ratio) => {
      const targetY = biome.bottomY - (biome.bottomY - biome.topY) * ratio;
      const result = candidates.filter(({ anchor }) => !selected.has(anchor.id))
        .sort((first, second) => {
          return Math.abs(first.anchor.y - targetY) -
            Math.abs(second.anchor.y - targetY);
        })[0];
      selected.add(result.anchor.id);
      return result;
    });
  }

  #getOpenWallSide(previous, anchor, next) {
    if (!previous || !next) return null;
    const center = anchor.x + anchor.width / 2;
    const previousCenter = previous.x + previous.width / 2;
    const nextCenter = next.x + next.width / 2;
    if (previousCenter < center && nextCenter < center) return "right";
    if (previousCenter > center && nextCenter > center) return "left";
    return null;
  }

  #createWall(biomeId, anchor, side, index) {
    const height = WALL_HEIGHTS[biomeId][index];
    const x = side === "left"
      ? anchor.x + PLATFORM_EDGE_INSET
      : anchor.x + anchor.width - TRICKSHOT_WALL_WIDTH - PLATFORM_EDGE_INSET;
    const data = Object.freeze({
      id: `${biomeId}-trickshot-wall-${index + 1}`,
      role: "early-trickshot-wall",
      biomeId,
      anchorPlatformId: anchor.id,
      side,
      x,
      y: anchor.y - height,
      width: TRICKSHOT_WALL_WIDTH,
      height,
      guidanceDirection: "up",
      guidanceColor: WALL_LIGHT_COLORS[biomeId],
      phaseOffset: index * 0.13,
      animationFrameSeconds: WALL_SPEEDS[biomeId],
    });
    return new AnimatedBiomeWall(
      data, getTrickshotWallSpriteConfig(biomeId),
    );
  }

  #getBiomeBounds(sections) {
    const bounds = new Map();
    sections.forEach((section) => {
      if (!WALL_RATIOS[section.tileset]) return;
      const current = bounds.get(section.tileset) ?? {
        id: section.tileset,
        topY: section.topY,
        bottomY: section.bottomY,
      };
      current.topY = Math.min(current.topY, section.topY);
      current.bottomY = Math.max(current.bottomY, section.bottomY);
      bounds.set(section.tileset, current);
    });
    return bounds;
  }
}
