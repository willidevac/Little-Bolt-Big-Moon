import { AnchoredCollectable } from
  "../entities/collectables/anchored-collectable.class.js";
import { ITEM_PLACEMENT_CONFIG } from
  "../../js/config/world-content-config.js";

const ITEM_WIDTHS = ITEM_PLACEMENT_CONFIG.widths;
const ITEM_PLAN = ITEM_PLACEMENT_CONFIG.plan;
const SEARCH_REWARD_TYPES = ITEM_PLACEMENT_CONFIG.searchRewardTypes;

/** Places useful pickups safely on the newly generated route. */
export class ItemPlacementBuilder {
  /** @returns {ReadonlyArray<AnchoredCollectable>} */
  build(platforms) {
    if (!Array.isArray(platforms) || platforms.length === 0) {
      throw new TypeError("Items brauchen eine gebaute Plattformroute.");
    }
    const usedAnchorIds = new Set();
    const typeCounts = new Map();
    const collectables = [];
    Object.entries(ITEM_PLAN).forEach(([biomeId, definitions]) => {
      const candidates = this.#getCandidates(platforms, biomeId);
      definitions.forEach((definition) => {
        const anchor = this.#selectAnchor(candidates, definition, usedAnchorIds);
        collectables.push(this.#create(definition, biomeId, anchor, typeCounts));
        usedAnchorIds.add(anchor.id);
      });
    });
    return Object.freeze(collectables);
  }

  /** Places one useful, grounded reward at every deliberately explored end. */
  buildSearchRewards(platforms) {
    const anchors = platforms.filter(({ routeRole, isDeadEnd }) => {
      return routeRole === "search-branch" && isDeadEnd;
    }).sort((first, second) => first.searchAreaId.localeCompare(
      second.searchAreaId, undefined, { numeric: true },
    ));
    if (anchors.length !== SEARCH_REWARD_TYPES.length) {
      throw new RangeError("Jeder Suchweg braucht genau eine Belohnung.");
    }
    return Object.freeze(anchors.map((anchor, index) => {
      const type = SEARCH_REWARD_TYPES[index];
      const width = ITEM_WIDTHS[type];
      const data = Object.freeze({
        id: `${anchor.searchAreaId}-reward-${type}`,
        type, visualType: type, amount: type === "energy" ? 25 : 1,
        anchorPlatformId: anchor.id,
        x: Math.round(anchor.x + (anchor.width - width) / 2),
        y: anchor.y,
      });
      return new AnchoredCollectable(data, anchor);
    }));
  }

  /** Adds one final repair cell before the entrance, never inside the arena. */
  buildPreBossSupply(platforms, existingCollectables) {
    const occupied = new Set(existingCollectables.map(({ anchorPlatformId }) => {
      return anchorPlatformId;
    }));
    const anchor = platforms.filter((platform) => {
      return platform.routeRole === "main" && platform.biomeId === "moon" &&
        platform.y > 900 && platform.y < 2200 &&
        platform.kind === "progression-platform" && !platform.mechanic &&
        !platform.requiresWallBounce && !platform.preparesWallBounce &&
        platform.width >= ITEM_WIDTHS.energy + 24 && !occupied.has(platform.id);
    }).sort((first, second) => first.y - second.y)[0];
    if (!anchor) throw new RangeError("Die Vorboss-Versorgung hat keinen Boden.");
    const width = ITEM_WIDTHS.energy;
    const data = Object.freeze({
      id: "moon-pre-boss-energy-cache",
      type: "energy", visualType: "energy", amount: 35,
      anchorPlatformId: anchor.id,
      x: Math.round(anchor.x + (anchor.width - width) / 2),
      y: anchor.y,
      isPreBossSupply: true,
    });
    return Object.freeze([new AnchoredCollectable(data, anchor)]);
  }

  #getCandidates(platforms, biomeId) {
    return platforms.filter((platform) => {
      return platform.biomeId === biomeId && platform.routeRole === "main" &&
        platform.id !== "moon-warden-arena-floor" && !platform.mechanic &&
        !platform.requiresWallBounce && !platform.preparesWallBounce &&
        typeof platform.getFrameDisplacement === "function";
    }).sort((first, second) => first.routeOrder - second.routeOrder);
  }

  #selectAnchor(candidates, definition, usedAnchorIds) {
    const minimumWidth = ITEM_WIDTHS[definition.visualType] + 24;
    const eligible = candidates.filter((platform) => {
      return platform.width >= minimumWidth && !usedAnchorIds.has(platform.id);
    });
    const index = Math.round(definition.position * (eligible.length - 1));
    const anchor = eligible[index];
    if (anchor) return anchor;
    throw new RangeError(`Keine sichere Plattform für ${definition.visualType}.`);
  }

  #create(definition, biomeId, anchor, typeCounts) {
    const count = (typeCounts.get(definition.visualType) ?? 0) + 1;
    typeCounts.set(definition.visualType, count);
    const width = ITEM_WIDTHS[definition.visualType];
    const data = Object.freeze({
      ...definition,
      id: `${biomeId}-${definition.visualType}-${String(count).padStart(2, "0")}`,
      anchorPlatformId: anchor.id,
      x: Math.round(anchor.x + (anchor.width - width) / 2),
      y: anchor.y,
    });
    return new AnchoredCollectable(data, anchor);
  }
}
