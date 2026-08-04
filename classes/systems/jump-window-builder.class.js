import { JumpWindowStructure } from
  "../environment/jump-window-structure.class.js";
import {
  getJumpWindowBiomeIds,
  getJumpWindowProfile,
} from "../../js/config/jump-window-config.js";

const MINIMUM_ROUTE_RISE = 280;
const MINIMUM_WING_WIDTH = 96;

/** Places sparse animated openings directly across valid jump trajectories. */
export class JumpWindowBuilder {
  /** @param {number} worldWidth */
  constructor(worldWidth) {
    if (!Number.isFinite(worldWidth) || worldWidth <= 0) {
      throw new TypeError("The jump-window world width is invalid.");
    }
    this.worldWidth = worldWidth;
  }

  /** Returns factory and launch-tower windows without route obstruction. */
  build(sections, platforms) {
    const route = platforms.filter(({ routeRole }) => routeRole === "main")
      .sort((first, second) => first.routeOrder - second.routeOrder);
    const bounds = this.#getBiomeBounds(sections);
    const windows = getJumpWindowBiomeIds().flatMap((biomeId) => {
      return this.#buildBiome(biomeId, bounds.get(biomeId), route);
    });
    return Object.freeze(windows);
  }

  #buildBiome(biomeId, biome, route) {
    const profile = getJumpWindowProfile(biomeId);
    const pairs = this.#getCandidatePairs(route, biomeId);
    const selected = new Set();
    return profile.ratios.map((ratio, index) => {
      const targetY = biome.bottomY - (biome.bottomY - biome.topY) * ratio;
      const pair = pairs.filter(({ upper }) => !selected.has(upper.id))
        .sort((first, second) => {
          return Math.abs(first.midpointY - targetY) -
            Math.abs(second.midpointY - targetY);
        })[0];
      selected.add(pair.upper.id);
      return this.#createWindow(biomeId, profile, pair, index);
    });
  }

  #getCandidatePairs(route, biomeId) {
    return route.slice(0, -1).map((lower, index) => ({
      lower,
      upper: route[index + 1],
      midpointY: (lower.y + route[index + 1].y) / 2,
    })).filter(({ lower, upper }) => {
      return lower.biomeId === biomeId && upper.biomeId === biomeId &&
        lower.y - upper.y >= MINIMUM_ROUTE_RISE &&
        !lower.mechanic && !upper.mechanic &&
        !lower.requiresWallBounce && !upper.requiresWallBounce &&
        !lower.preparesWallBounce && !upper.preparesWallBounce;
    });
  }

  #createWindow(biomeId, profile, pair, index) {
    const lowerCenter = pair.lower.x + pair.lower.width / 2;
    const upperCenter = pair.upper.x + pair.upper.width / 2;
    const desiredCenter = (lowerCenter + upperCenter) / 2;
    const halfOpening = profile.openingWidth / 2;
    const center = Math.min(
      this.worldWidth - MINIMUM_WING_WIDTH - halfOpening,
      Math.max(MINIMUM_WING_WIDTH + halfOpening, desiredCenter),
    );
    const data = Object.freeze({
      id: `${biomeId}-jump-window-${index + 1}`,
      role: "jump-window",
      biomeId,
      lowerPlatformId: pair.lower.id,
      upperPlatformId: pair.upper.id,
      x: 0,
      y: Math.round(pair.midpointY - profile.height / 2),
      width: this.worldWidth,
      height: profile.height,
      openingX: Math.round(center - halfOpening),
      openingWidth: profile.openingWidth,
      animationFrameSeconds: profile.animationFrameSeconds,
      guidanceColor: profile.guidanceColor,
      surfaceOffsetRatio: profile.surfaceOffsetRatio,
      outerWallRatio: profile.outerWallRatio,
      sourceOpeningStart: profile.sourceOpeningStart,
      sourceOpeningEnd: profile.sourceOpeningEnd,
      phaseOffset: index * profile.animationFrameSeconds * 0.7,
    });
    return new JumpWindowStructure(data, profile.sprite);
  }

  #getBiomeBounds(sections) {
    const bounds = new Map();
    sections.forEach((section) => {
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
