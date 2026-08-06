import { GAME_CONFIG } from "../../js/config/game-config.js";
import { evaluateJumpWindow } from "../../js/utils/jump-reachability.js";

const RESERVED_CLEARANCE = 144;
const MAXIMUM_HORIZONTAL_EDGE_GAP = 410;
const MINIMUM_SAFE_FRAMES = Object.freeze({
  scrapyard: 7, factory: 6, "launch-tower": 5,
  "space-station": 4, moon: 3,
});
const DESIRED_CHARGE_RATIOS = Object.freeze({
  scrapyard: Object.freeze([0.34, 0.48, 0.62, 0.76]),
  factory: Object.freeze([0.28, 0.5, 0.7, 0.86]),
  "launch-tower": Object.freeze([0.24, 0.46, 0.68, 0.9]),
  "space-station": Object.freeze([0.2, 0.44, 0.7, 0.92]),
  moon: Object.freeze([0.18, 0.42, 0.72, 0.94]),
});

/** Finds safe horizontal positions for generated progression platforms. */
export class ProgressionRoutePositioner {
  /**
   * Creates the configured system.
   * @param {number} worldWidth World width used by constructor.
   * @param {number} bossApproachY Boss approach y used by constructor.
   */
  constructor(worldWidth, bossApproachY) {
    this.worldWidth = worldWidth;
    this.bossApproachY = bossApproachY;
  }

  /**
   * Returns a reachable and unobstructed horizontal platform position.
   * @param {Readonly<object>} previous Previous used by find platform x.
   * @param {Readonly<object>} step Step used by find platform x.
   * @param {Readonly<object>} profile Profile used by find platform x.
   * @param {Readonly<object>} index Index used by find platform x.
   * @param {Readonly<object>} width Width used by find platform x.
   * @param {ReadonlyArray<object>} reservedPlatforms Reserved platforms used by find platform x.
   */
  findPlatformX(previous, step, profile, index, width, reservedPlatforms) {
    if (step.y === this.bossApproachY || step.challenge) {
      return Math.round((this.worldWidth - width) / 2);
    }
    if (step.approachChallenge) {
      return this.#findWallApproachX(
        previous, step.y, step.approachChallenge, width, reservedPlatforms,
      );
    }
    return this.#findRouteX(
      previous, step, profile, index, width, reservedPlatforms,
    );
  }

  /**
   * Finds route x.
   * @param {Readonly<object>} previous Previous used by find route x.
   * @param {Readonly<object>} step Step used by find route x.
   * @param {Readonly<object>} profile Profile used by find route x.
   * @param {Readonly<object>} index Index used by find route x.
   * @param {Readonly<object>} width Width used by find route x.
   * @param {ReadonlyArray<object>} reservedPlatforms Reserved platforms used by find route x.
   */
  #findRouteX(previous, step, profile, index, width, reservedPlatforms) {
    const laneCandidates = this.#createLaneCandidates(profile, index, width);
    const searchCandidates = this.#createSearchCandidates(width, 16);
    const candidates = [...new Set([...laneCandidates, ...searchCandidates])]
      .filter((x) => this.#hasReservedClearance(
        x, step.y, width, reservedPlatforms,
      ));
    const lane = this.#selectReachableX(
      previous, step, profile, index, width, candidates,
    ) ?? Math.round((this.worldWidth - width) / 2);
    return this.#clampToWorld(lane, width);
  }

  /**
   * Creates lane candidates.
   * @param {Readonly<object>} profile Profile used by create lane candidates.
   * @param {Readonly<object>} index Index used by create lane candidates.
   * @param {Readonly<object>} width Width used by create lane candidates.
   */
  #createLaneCandidates(profile, index, width) {
    return profile.lanes.map((lane, offset) => {
      const candidate = profile.lanes[(index + offset) % profile.lanes.length];
      return this.#clampToWorld(candidate, width);
    });
  }

  /**
   * Creates search candidates.
   * @param {Readonly<object>} width Width used by create search candidates.
   * @param {Readonly<object>} spacing Spacing used by create search candidates.
   */
  #createSearchCandidates(width, spacing) {
    const count = Math.floor((this.worldWidth - width - 112) / spacing) + 1;
    return Array.from({ length: count }, (_, index) => 56 + index * spacing);
  }

  /**
   * Selects reachable x.
   * @param {Readonly<object>} previous Previous used by select reachable x.
   * @param {Readonly<object>} step Step used by select reachable x.
   * @param {Readonly<object>} profile Profile used by select reachable x.
   * @param {Readonly<object>} index Index used by select reachable x.
   * @param {Readonly<object>} width Width used by select reachable x.
   * @param {boolean} candidates Candidates used by select reachable x.
   */
  #selectReachableX(previous, step, profile, index, width, candidates) {
    const minimumFrames = MINIMUM_SAFE_FRAMES[step.biome.id];
    const desiredRatio = this.#getDesiredChargeRatio(step.biome.id, index);
    const wantsLongTransfer = ["scrapyard", "factory"].includes(
      step.biome.id,
    ) && index % 11 === 7;
    return candidates.map((x, order) => this.#evaluateCandidate(
      previous, step.y, width, x, desiredRatio, wantsLongTransfer, order,
    )).filter(({ window }) => window.frameCount >= minimumFrames)
      .sort((first, second) => first.score - second.score)[0]?.x ?? null;
  }

  /**
   * Evaluates candidate.
   * @param {Readonly<object>} previous Previous used by evaluate candidate.
   * @param {number} y Y used by evaluate candidate.
   * @param {Readonly<object>} width Width used by evaluate candidate.
   * @param {number} x X used by evaluate candidate.
   * @param {number} desiredRatio Desired ratio used by evaluate candidate.
   * @param {Readonly<object>} long Long used by evaluate candidate.
   * @param {Readonly<object>} order Order used by evaluate candidate.
   */
  #evaluateCandidate(previous, y, width, x, desiredRatio, long, order) {
    const window = evaluateJumpWindow(
      previous, { x, y, width }, GAME_CONFIG.physics, GAME_CONFIG.character,
    );
    const score = this.#scoreCandidate(
      previous, x, width, window, desiredRatio, long, order,
    );
    return { x, window, score };
  }

  /**
   * Returns desired charge ratio.
   * @param {string} biomeId Biome id used by get desired charge ratio.
   * @param {Readonly<object>} index Index used by get desired charge ratio.
   */
  #getDesiredChargeRatio(biomeId, index) {
    const ratios = DESIRED_CHARGE_RATIOS[biomeId];
    return ratios[index % ratios.length];
  }

  /**
   * Scores candidate.
   * @param {Readonly<object>} previous Previous used by score candidate.
   * @param {number} x X used by score candidate.
   * @param {Readonly<object>} width Width used by score candidate.
   * @param {Readonly<object>} window Window used by score candidate.
   * @param {number} desiredRatio Desired ratio used by score candidate.
   * @param {Readonly<object>} long Long used by score candidate.
   * @param {Readonly<object>} order Order used by score candidate.
   */
  #scoreCandidate(previous, x, width, window, desiredRatio, long, order) {
    const ratios = window.samples.map(({ ratio }) => ratio);
    const centerRatio = ratios.length
      ? ratios.reduce((total, ratio) => total + ratio, 0) / ratios.length
      : 2;
    const centerDistance = Math.abs(
      x + width / 2 - (previous.x + previous.width / 2),
    );
    const longTransferPenalty = long && centerDistance < 360 ? 10000 : 0;
    return longTransferPenalty + Math.abs(centerRatio - desiredRatio) * 1000 +
      order;
  }

  /**
   * Finds wall approach x.
   * @param {Readonly<object>} previous Previous used by find wall approach x.
   * @param {number} y Y used by find wall approach x.
   * @param {Readonly<object>} challenge Challenge used by find wall approach x.
   * @param {Readonly<object>} width Width used by find wall approach x.
   * @param {ReadonlyArray<object>} reservedPlatforms Reserved platforms used by find wall approach x.
   */
  #findWallApproachX(previous, y, challenge, width, reservedPlatforms) {
    const entry = this.#findWallEntry(challenge, reservedPlatforms);
    if (!entry) return Math.round((this.worldWidth - width) / 2);
    const target = challenge.entrySide === "left"
      ? entry.x + entry.width + 64
      : entry.x - width - 64;
    const candidates = this.#getWallApproachCandidates(
      previous, entry, y, width, reservedPlatforms, challenge,
    );
    return candidates.sort((first, second) =>
      Math.abs(first.x - target) - Math.abs(second.x - target))[0]?.x ??
      this.#clampToReach(previous, target, width);
  }

  /**
   * Returns wall approach candidates.
   * @param {Readonly<object>} previous Previous used by get wall approach candidates.
   * @param {Readonly<object>} entry Entry used by get wall approach candidates.
   * @param {number} y Y used by get wall approach candidates.
   * @param {Readonly<object>} width Width used by get wall approach candidates.
   * @param {Readonly<object>} reserved Reserved used by get wall approach candidates.
   * @param {Readonly<object>} challenge Challenge used by get wall approach candidates.
   */
  #getWallApproachCandidates(previous, entry, y, width, reserved, challenge) {
    return this.#createSearchCandidates(width, 8)
      .filter((x) => this.#hasReservedClearance(
        x, y, width, reserved,
      ))
      .map((x) => this.#evaluateWallApproach(previous, entry, x, y, width))
      .filter(({ routeWindow, entryWindow }) => {
        return routeWindow.frameCount >= MINIMUM_SAFE_FRAMES[challenge.biomeId] &&
          entryWindow.frameCount >= 6;
      });
  }

  /**
   * Finds wall entry.
   * @param {Readonly<object>} challenge Challenge used by find wall entry.
   * @param {ReadonlyArray<object>} reservedPlatforms Reserved platforms used by find wall entry.
   */
  #findWallEntry(challenge, reservedPlatforms) {
    const anchorId = `${challenge.id}-${challenge.entrySide}-wall`;
    return reservedPlatforms.find((platform) => {
      return platform.anchorStructureId === anchorId;
    });
  }

  /**
   * Evaluates wall approach.
   * @param {Readonly<object>} previous Previous used by evaluate wall approach.
   * @param {Readonly<object>} entry Entry used by evaluate wall approach.
   * @param {number} x X used by evaluate wall approach.
   * @param {number} y Y used by evaluate wall approach.
   * @param {Readonly<object>} width Width used by evaluate wall approach.
   */
  #evaluateWallApproach(previous, entry, x, y, width) {
    return {
      x,
      routeWindow: evaluateJumpWindow(
        previous, { x, y, width }, GAME_CONFIG.physics, GAME_CONFIG.character,
      ),
      entryWindow: evaluateJumpWindow(
        { x, y, width }, entry, GAME_CONFIG.physics, GAME_CONFIG.character,
      ),
    };
  }

  /**
   * Clamps to reach.
   * @param {Readonly<object>} previous Previous used by clamp to reach.
   * @param {Readonly<object>} target Target inspected or updated by the system.
   * @param {Readonly<object>} width Width used by clamp to reach.
   */
  #clampToReach(previous, target, width) {
    const minimum = previous.x - width - MAXIMUM_HORIZONTAL_EDGE_GAP;
    const maximum = previous.x + previous.width + MAXIMUM_HORIZONTAL_EDGE_GAP;
    return Math.min(Math.max(56, target, minimum),
      maximum, this.worldWidth - width - 56);
  }

  /**
   * Clamps to world.
   * @param {number} x X used by clamp to world.
   * @param {Readonly<object>} width Width used by clamp to world.
   */
  #clampToWorld(x, width) {
    return Math.min(Math.max(56, x), this.worldWidth - width - 56);
  }

  /**
   * Checks whether reserved clearance.
   * @param {number} x X used by has reserved clearance.
   * @param {number} y Y used by has reserved clearance.
   * @param {Readonly<object>} width Width used by has reserved clearance.
   * @param {ReadonlyArray<object>} reservedPlatforms Reserved platforms used by has reserved clearance.
   */
  #hasReservedClearance(x, y, width, reservedPlatforms) {
    return reservedPlatforms.every((platform) => {
      if (Math.abs(platform.y - y) >= RESERVED_CLEARANCE) return true;
      return x + width + 32 <= platform.x ||
        x >= platform.x + platform.width + 32;
    });
  }
}
