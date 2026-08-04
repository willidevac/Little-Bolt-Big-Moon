import { AnchoredCollectable } from
  "../entities/collectables/anchored-collectable.class.js";

const ITEM_WIDTHS = Object.freeze({
  gear: 64, energy: 64, arcCharge: 48,
  boltThrower: 64, arcCannon: 96, storyBadge: 64,
});

const ITEM_PLAN = Object.freeze({
  scrapyard: Object.freeze([
    item("gear", 0.01), item("energy", 0.22), badge("left", 0.38),
    item("gear", 0.54), weapon("boltThrower", 0.74), item("energy", 0.9),
  ]),
  factory: Object.freeze([
    item("gear", 0.08), item("energy", 0.18), item("arcCharge", 0.32),
    item("gear", 0.46), weapon("arcCannon", 0.62, 3),
    item("energy", 0.77), item("gear", 0.92),
  ]),
  "launch-tower": Object.freeze([
    item("gear", 0.1), item("arcCharge", 0.25), item("energy", 0.42),
    item("gear", 0.58), item("arcCharge", 0.75), item("energy", 0.9),
  ]),
  "space-station": Object.freeze([
    item("gear", 0.1), item("energy", 0.26), item("arcCharge", 0.43),
    item("gear", 0.6), item("energy", 0.76), item("arcCharge", 0.9),
  ]),
  moon: Object.freeze([
    item("gear", 0.08), item("energy", 0.22), item("arcCharge", 0.36),
    item("gear", 0.5), item("energy", 0.64), badge("right", 0.78),
    item("arcCharge", 0.9),
  ]),
});
const SEARCH_REWARD_TYPES = Object.freeze([
  "energy", "gear", "arcCharge", "energy", "arcCharge",
]);

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

function item(type, position) {
  const amount = type === "energy" ? 25 : 1;
  return Object.freeze({ type, visualType: type, amount, position });
}

function weapon(weaponId, position, amount = 1) {
  return Object.freeze({
    type: "weapon", visualType: weaponId, weaponId, amount, position,
  });
}

function badge(badgePart, position) {
  return Object.freeze({
    type: "storyBadge", visualType: "storyBadge",
    badgePart, amount: 1, position,
  });
}
