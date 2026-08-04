import { SpriteSurfacePlatform } from
  "../environment/sprite-surface-platform.class.js";
import {
  getCombatPlatformSpriteConfig,
  getScrapyardPrototypePlatformSpriteConfig,
  getWallPlatformSpriteConfig,
} from "../../js/config/wall-course-config.js";
import { getProgressionProfile } from
  "../../js/config/progression-route-config.js";

const SEARCH_TARGETS = Object.freeze([135000, 108000, 74000, 46000, 17000]);
const COMBAT_TARGETS = Object.freeze([
  124000, 108000, 92000, 76000, 60000, 44000, 28000, 12000,
]);
const SEARCH_WIDTHS = Object.freeze([190, 160]);
const COMBAT_WIDTHS = Object.freeze([520, 560, 620, 580, 660, 600, 680, 700]);
const SIDE_MARGIN = 64;
const BRANCH_EDGE_X = Object.freeze({ left: 80, right: 1040 });

/** Adds ambiguous scouting branches and future combat staging floors. */
export class ExplorationAreaBuilder {
  constructor(worldWidth) {
    if (!Number.isFinite(worldWidth) || worldWidth <= 0) {
      throw new TypeError("Die Breite der Erkundungsbereiche ist ungültig.");
    }
    this.worldWidth = worldWidth;
  }

  /** @returns {ReadonlyArray<SpriteSurfacePlatform>} */
  build(platforms, firstWeapon) {
    this.#validateInputs(platforms, firstWeapon);
    const route = platforms.filter(({ routeRole }) => routeRole === "main")
      .sort((first, second) => first.routeOrder - second.routeOrder);
    return Object.freeze([
      ...SEARCH_TARGETS.flatMap((target, index) => {
        return this.#createSearchArea(route, platforms, target, index);
      }),
      ...COMBAT_TARGETS.map((target, index) => {
        return this.#createCombatStage(route, target, index, firstWeapon.y);
      }),
    ]);
  }

  #createSearchArea(route, reservedPlatforms, targetY, areaIndex) {
    const placements = this.#findStableIndices(route, targetY, 3)
      .map((baseIndex) => this.#getSearchPlacement(route, baseIndex))
      .filter((placement) => this.#hasSearchClearance(
        placement, reservedPlatforms,
      ));
    const placement = placements[0];
    if (!placement) throw new RangeError("Der Suchbereich ist visuell blockiert.");
    const { base, correct, upper, firstX, secondX } = placement;
    correct.searchPathCue = centerX(upper) < centerX(correct) ? "left" : "right";
    const areaId = `search-area-${areaIndex + 1}`;
    return [
      this.#createSearchPlatform(areaId, 1, base, correct, firstX,
        correct.y, SEARCH_WIDTHS[0], false),
      this.#createSearchPlatform(areaId, 2, base, upper, secondX,
        upper.y, SEARCH_WIDTHS[1], true),
    ];
  }

  #getSearchPlacement(route, baseIndex) {
    const base = route[baseIndex];
    const correct = route[baseIndex + 1];
    const upper = route[baseIndex + 2];
    const side = this.#getOppositeSide(correct);
    const firstX = this.#clampBranchX(base, side, SEARCH_WIDTHS[0]);
    const upperSide = this.#getOppositeSide(upper);
    const secondX = this.#clampBranchX(
      { x: firstX, width: SEARCH_WIDTHS[0] }, upperSide,
      SEARCH_WIDTHS[1], 70,
    );
    return { base, correct, upper, firstX, secondX };
  }

  #hasSearchClearance(placement, reservedPlatforms) {
    const candidates = [
      { x: placement.firstX, y: placement.correct.y, width: SEARCH_WIDTHS[0] },
      { x: placement.secondX, y: placement.upper.y, width: SEARCH_WIDTHS[1] },
    ];
    if (horizontalGap(candidates[0], placement.correct) < 64 ||
      horizontalGap(candidates[1], placement.upper) < 64) return false;
    const wallFeatures = reservedPlatforms.filter(({ kind }) => {
      return kind === "wall-feature-platform";
    });
    return candidates.every((candidate) => wallFeatures.every((feature) => {
      if (Math.abs(feature.y - candidate.y) >= 144) return true;
      return candidate.x + candidate.width + 32 <= feature.x ||
        candidate.x >= feature.x + feature.width + 32;
    }));
  }

  #createSearchPlatform(areaId, branchOrder, base, parallel, x, y, width,
    isDeadEnd) {
    const biomeId = parallel.biomeId;
    const data = Object.freeze({
      id: `${areaId}-branch-${branchOrder}`,
      kind: "search-route-platform", routeRole: "search-branch",
      routeOrder: null, searchAreaId: areaId, branchOrder, isDeadEnd,
      searchBasePlatformId: base.id, parallelMainPlatformId: parallel.id,
      biomeId, platformRole: "precision", mechanic: null,
      x, y, width, height: 64,
      accentColor: getProgressionProfile(biomeId).accent,
      suggestedDirection: null,
    });
    return new SpriteSurfacePlatform(data, this.#getSprite(biomeId));
  }

  #createCombatStage(route, targetY, index, weaponY) {
    const candidates = route.filter((platform) => {
      return platform.y < weaponY && !platform.mechanic &&
        !platform.requiresWallBounce && !platform.preparesWallBounce;
    }).sort((first, second) => Math.abs(first.y - targetY) -
      Math.abs(second.y - targetY));
    const desiredWidth = COMBAT_WIDTHS[index];
    const placement = candidates.map((anchor) => {
      return this.#getCombatPlacement(anchor, desiredWidth);
    }).find(Boolean);
    if (!placement) throw new RangeError("Keine freie Fläche für Kampfplattform.");
    const { anchor, x, width } = placement;
    const sprite = getCombatPlatformSpriteConfig(anchor.biomeId);
    const data = Object.freeze({
      id: `combat-stage-${index + 1}`,
      kind: "combat-staging-platform", routeRole: "combat-stage",
      routeOrder: null, anchorRoutePlatformId: anchor.id,
      biomeId: anchor.biomeId, platformRole: "rest", mechanic: null,
      unlockedAfterWeaponId: "boltThrower", x, y: anchor.y,
      width, height: Math.round(width * sprite.frameHeight / sprite.frameWidth),
      accentColor: getProgressionProfile(anchor.biomeId).accent,
      suggestedDirection: null,
    });
    return new SpriteSurfacePlatform(data, sprite);
  }

  #getCombatPlacement(anchor, desiredWidth) {
    const leftSpace = anchor.x - SIDE_MARGIN * 2;
    const rightStart = anchor.x + anchor.width + SIDE_MARGIN;
    const rightSpace = this.worldWidth - SIDE_MARGIN - rightStart;
    if (rightSpace >= 500) return {
      anchor, x: rightStart, width: Math.min(desiredWidth, rightSpace),
    };
    if (leftSpace >= 500) return {
      anchor, x: SIDE_MARGIN, width: Math.min(desiredWidth, leftSpace),
    };
    return null;
  }

  #findStableIndices(route, targetY, lookAhead) {
    return route.map((platform, index) => ({ platform, index }))
      .filter(({ platform, index }) => {
        const next = route[index + lookAhead];
        return next && !platform.mechanic && !platform.requiresWallBounce &&
          !platform.preparesWallBounce && platform.biomeId === next.biomeId;
      }).sort((first, second) => {
        return Math.abs(first.platform.y - targetY) -
          Math.abs(second.platform.y - targetY);
      }).map(({ index }) => index);
  }

  #getOppositeSide(platform) {
    return platform.x + platform.width / 2 < this.worldWidth / 2
      ? "right" : "left";
  }

  #clampBranchX(previous, side, width, inset = 0) {
    const target = BRANCH_EDGE_X[side] + (side === "left" ? inset : -inset);
    const minimum = previous.x - width - 410;
    const maximum = previous.x + previous.width + 410;
    return Math.round(Math.min(Math.max(SIDE_MARGIN, target, minimum),
      maximum, this.worldWidth - width - SIDE_MARGIN));
  }

  #getSprite(biomeId) {
    return biomeId === "scrapyard"
      ? getScrapyardPrototypePlatformSpriteConfig("precision")
      : getWallPlatformSpriteConfig(biomeId);
  }

  #validateInputs(platforms, firstWeapon) {
    const hasPlatforms = Array.isArray(platforms) && platforms.length > 0;
    const hasWeapon = firstWeapon?.weaponId === "boltThrower" &&
      Number.isFinite(firstWeapon.y);
    if (hasPlatforms && hasWeapon) return;
    throw new TypeError("Erkundungsbereiche brauchen Route und Schusswaffe.");
  }
}

function centerX(platform) {
  return platform.x + platform.width / 2;
}

function horizontalGap(first, second) {
  return Math.max(0,
    second.x - (first.x + first.width),
    first.x - (second.x + second.width),
  );
}
