import { SpriteSurfacePlatform } from
  "../environment/sprite-surface-platform.class.js";
import {
  getCombatPlatformSpriteConfig,
  getScrapyardPrototypePlatformSpriteConfig,
  getWallPlatformSpriteConfig,
} from "../../js/config/wall-course-config.js";
import { getProgressionProfile } from
  "../../js/config/progression-route-config.js";
import { EXPLORATION_CONFIG } from
  "../../js/config/world-content-config.js";

const {
  searchTargets: SEARCH_TARGETS,
  combatTargets: COMBAT_TARGETS,
  searchWidths: SEARCH_WIDTHS,
  combatWidths: COMBAT_WIDTHS,
  sideMargin: SIDE_MARGIN,
  branchEdgeX: BRANCH_EDGE_X,
} = EXPLORATION_CONFIG;

/** Adds ambiguous scouting branches and future combat staging floors. */
export class ExplorationAreaBuilder {
  /**
   * Creates the configured builder.
   * @param {number} worldWidth Total playable world width in pixels.
   */
  constructor(worldWidth) {
    if (!Number.isFinite(worldWidth) || worldWidth <= 0) {
      throw new TypeError("Die Breite der Erkundungsbereiche ist ungültig.");
    }
    this.worldWidth = worldWidth;
  }

  /**
   * Runs build with validated construction inputs.
   * @param {ReadonlyArray<object>} platforms Platforms available for route construction.
   * @param {Readonly<object>} firstWeapon First weapon used while build.
   * @returns {ReadonlyArray<SpriteSurfacePlatform>}
   */
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

  /**
   * Creates search area.
   * @param {ReadonlyArray<object>} route Ordered route entries created so far.
   * @param {ReadonlyArray<object>} reservedPlatforms Reserved platforms used while create search area.
   * @param {number} targetY Target y used while create search area.
   * @param {number} areaIndex Area index used while create search area.
   */
  #createSearchArea(route, reservedPlatforms, targetY, areaIndex) {
    const placements = this.#findStableIndices(route, targetY, 3)
      .map((baseIndex) => this.#getSearchPlacement(route, baseIndex))
      .filter((placement) => this.#hasSearchClearance(placement,
        reservedPlatforms));
    const placement = placements[0];
    if (!placement) throw new RangeError("Der Suchbereich ist visuell blockiert.");
    const { base, correct, upper, firstX, secondX } = placement;
    correct.searchPathCue = centerX(upper) < centerX(correct) ? "left" : "right";
    const areaId = `search-area-${areaIndex + 1}`;
    return this.#createSearchPlatforms(
      areaId, base, correct, upper, firstX, secondX,
    );
  }

  /**
   * Creates search platforms.
   * @param {string} areaId Area id used while create search platforms.
   * @param {Readonly<object>} base Base used while create search platforms.
   * @param {Readonly<object>} correct Correct used while create search platforms.
   * @param {Readonly<object>} upper Upper used while create search platforms.
   * @param {number} firstX First x used while create search platforms.
   * @param {number} secondX Second x used while create search platforms.
   */
  #createSearchPlatforms(areaId, base, correct, upper, firstX, secondX) {
    return [
      this.#createSearchPlatform(areaId, 1, base, correct, firstX,
        correct.y, SEARCH_WIDTHS[0], false),
      this.#createSearchPlatform(areaId, 2, base, upper, secondX,
        upper.y, SEARCH_WIDTHS[1], true),
    ];
  }

  /**
   * Returns search placement.
   * @param {ReadonlyArray<object>} route Ordered route entries created so far.
   * @param {number} baseIndex Base index used while get search placement.
   */
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

  /**
   * Checks whether search clearance.
   * @param {Readonly<object>} placement Placement used while has search clearance.
   * @param {ReadonlyArray<object>} reservedPlatforms Reserved platforms used while has search clearance.
   */
  #hasSearchClearance(placement, reservedPlatforms) {
    const candidates = [
      { x: placement.firstX, y: placement.correct.y, width: SEARCH_WIDTHS[0] },
      { x: placement.secondX, y: placement.upper.y, width: SEARCH_WIDTHS[1] },
    ];
    if (horizontalGap(candidates[0], placement.correct) < 64 ||
      horizontalGap(candidates[1], placement.upper) < 64) return false;
    const wallFeatures = reservedPlatforms.filter(({ kind }) =>
      kind === "wall-feature-platform");
    return candidates.every((candidate) => this.#clearsWalls(
      candidate, wallFeatures,
    ));
  }

  /**
   * Performs walls.
   * @param {Readonly<object>} candidate Candidate used while clears walls.
   * @param {ReadonlyArray<object>} wallFeatures Wall features used while clears walls.
   */
  #clearsWalls(candidate, wallFeatures) {
    return wallFeatures.every((feature) => {
      if (Math.abs(feature.y - candidate.y) >= 144) return true;
      return candidate.x + candidate.width + 32 <= feature.x ||
        candidate.x >= feature.x + feature.width + 32;
    });
  }

  /**
   * Creates search platform.
   * @param {string} areaId Area id used while create search platform.
   * @param {Readonly<object>} branchOrder Branch order used while create search platform.
   * @param {Readonly<object>} base Base used while create search platform.
   * @param {Readonly<object>} parallel Parallel used while create search platform.
   * @param {Readonly<object>} x X used while create search platform.
   * @param {Readonly<object>} y Y used while create search platform.
   * @param {Readonly<object>} width Width used while create search platform.
   * @param {boolean} isDeadEnd Is dead end used while create search platform.
   */
  #createSearchPlatform(areaId, branchOrder, base, parallel, x, y, width,
    isDeadEnd) {
    const biomeId = parallel.biomeId;
    const data = this.#createSearchData({ areaId, branchOrder, base, parallel,
      x, y, width, isDeadEnd, biomeId });
    return new SpriteSurfacePlatform(data, this.#getSprite(biomeId));
  }

  /**
   * Creates search data.
   * @param {Readonly<object>} value Value used while create search data.
   */
  #createSearchData(value) {
    const { areaId, branchOrder, base, parallel, x, y, width, isDeadEnd,
      biomeId } = value;
    return Object.freeze({
      id: `${areaId}-branch-${branchOrder}`,
      kind: "search-route-platform", routeRole: "search-branch",
      routeOrder: null, searchAreaId: areaId, branchOrder, isDeadEnd,
      searchBasePlatformId: base.id, parallelMainPlatformId: parallel.id,
      biomeId, platformRole: "precision", mechanic: null,
      x, y, width, height: 64,
      accentColor: getProgressionProfile(biomeId).accent,
      suggestedDirection: null,
    });
  }

  /**
   * Creates combat stage.
   * @param {ReadonlyArray<object>} route Ordered route entries created so far.
   * @param {number} targetY Target y used while create combat stage.
   * @param {Readonly<object>} index Zero-based route or stage index.
   * @param {number} weaponY Weapon y used while create combat stage.
   */
  #createCombatStage(route, targetY, index, weaponY) {
    const candidates = this.#getCombatCandidates(route, targetY, weaponY);
    const desiredWidth = COMBAT_WIDTHS[index];
    const placement = candidates.map((anchor) => {
      return this.#getCombatPlacement(anchor, desiredWidth);
    }).find(Boolean);
    if (!placement) throw new RangeError("Keine freie Fläche für Kampfplattform.");
    const { anchor, x, width } = placement;
    const sprite = getCombatPlatformSpriteConfig(anchor.biomeId);
    const data = this.#createCombatData(anchor, x, width, index, sprite);
    return new SpriteSurfacePlatform(data, sprite);
  }

  /**
   * Returns combat candidates.
   * @param {ReadonlyArray<object>} route Ordered route entries created so far.
   * @param {number} targetY Target y used while get combat candidates.
   * @param {number} weaponY Weapon y used while get combat candidates.
   */
  #getCombatCandidates(route, targetY, weaponY) {
    return route.filter((platform) => platform.y < weaponY &&
      !platform.mechanic && !platform.requiresWallBounce &&
      !platform.preparesWallBounce).sort((first, second) =>
      Math.abs(first.y - targetY) - Math.abs(second.y - targetY));
  }

  /**
   * Creates combat data.
   * @param {Readonly<object>} anchor Platform used as the placement anchor.
   * @param {Readonly<object>} x X used while create combat data.
   * @param {Readonly<object>} width Width used while create combat data.
   * @param {Readonly<object>} index Zero-based route or stage index.
   * @param {Readonly<object>} sprite Sprite definition assigned to the created object.
   */
  #createCombatData(anchor, x, width, index, sprite) {
    return Object.freeze({
      id: `combat-stage-${index + 1}`,
      kind: "combat-staging-platform", routeRole: "combat-stage",
      routeOrder: null, anchorRoutePlatformId: anchor.id,
      biomeId: anchor.biomeId, platformRole: "rest", mechanic: null,
      unlockedAfterWeaponId: "boltThrower", x, y: anchor.y,
      width, height: Math.round(width * sprite.frameHeight / sprite.frameWidth),
      accentColor: getProgressionProfile(anchor.biomeId).accent,
      suggestedDirection: null,
    });
  }

  /**
   * Returns combat placement.
   * @param {Readonly<object>} anchor Platform used as the placement anchor.
   * @param {number} desiredWidth Desired width used while get combat placement.
   */
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

  /**
   * Finds stable indices.
   * @param {ReadonlyArray<object>} route Ordered route entries created so far.
   * @param {number} targetY Target y used while find stable indices.
   * @param {Readonly<object>} lookAhead Look ahead used while find stable indices.
   */
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

  /**
   * Returns opposite side.
   * @param {Readonly<object>} platform Platform inspected or extended by the builder.
   */
  #getOppositeSide(platform) {
    return platform.x + platform.width / 2 < this.worldWidth / 2
      ? "right" : "left";
  }

  /**
   * Clamps branch x.
   * @param {ReadonlyArray<object>} previous Previous used while clamp branch x.
   * @param {Readonly<object>} side Side used while clamp branch x.
   * @param {Readonly<object>} width Width used while clamp branch x.
   * @param {number} [inset=0] Inset used while clamp branch x.
   */
  #clampBranchX(previous, side, width, inset = 0) {
    const target = BRANCH_EDGE_X[side] + (side === "left" ? inset : -inset);
    const minimum = previous.x - width - 410;
    const maximum = previous.x + previous.width + 410;
    return Math.round(Math.min(Math.max(SIDE_MARGIN, target, minimum),
      maximum, this.worldWidth - width - SIDE_MARGIN));
  }

  /**
   * Returns sprite.
   * @param {string} biomeId Biome id used while get sprite.
   */
  #getSprite(biomeId) {
    return biomeId === "scrapyard"
      ? getScrapyardPrototypePlatformSpriteConfig("precision")
      : getWallPlatformSpriteConfig(biomeId);
  }

  /**
   * Validates inputs.
   * @param {ReadonlyArray<object>} platforms Platforms available for route construction.
   * @param {Readonly<object>} firstWeapon First weapon used while validate inputs.
   */
  #validateInputs(platforms, firstWeapon) {
    const hasPlatforms = Array.isArray(platforms) && platforms.length > 0;
    const hasWeapon = firstWeapon?.weaponId === "boltThrower" &&
      Number.isFinite(firstWeapon.y);
    if (hasPlatforms && hasWeapon) return;
    throw new TypeError("Erkundungsbereiche brauchen Route und Schusswaffe.");
  }
}

/**
 * Performs x.
 * @param {Readonly<object>} platform Platform inspected or extended by the builder.
 */
function centerX(platform) {
  return platform.x + platform.width / 2;
}

/**
 * Performs gap.
 * @param {Readonly<object>} first First used while horizontal gap.
 * @param {Readonly<object>} second Second used while horizontal gap.
 */
function horizontalGap(first, second) {
  return Math.max(0,
    second.x - (first.x + first.width),
    first.x - (second.x + second.width),
  );
}
