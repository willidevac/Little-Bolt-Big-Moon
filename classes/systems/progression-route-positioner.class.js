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
   * @param {number} worldWidth
   * @param {number} bossApproachY
   */
  constructor(worldWidth, bossApproachY) {
    this.worldWidth = worldWidth;
    this.bossApproachY = bossApproachY;
  }

  /** Returns a reachable and unobstructed horizontal platform position. */
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

  #createLaneCandidates(profile, index, width) {
    return profile.lanes.map((lane, offset) => {
      const candidate = profile.lanes[(index + offset) % profile.lanes.length];
      return this.#clampToWorld(candidate, width);
    });
  }

  #createSearchCandidates(width, spacing) {
    const count = Math.floor((this.worldWidth - width - 112) / spacing) + 1;
    return Array.from({ length: count }, (_, index) => 56 + index * spacing);
  }

  #selectReachableX(previous, step, profile, index, width, candidates) {
    const minimumFrames = MINIMUM_SAFE_FRAMES[step.biome.id];
    const desiredRatio = this.#getDesiredChargeRatio(step.biome.id, index);
    const wantsLongTransfer = ["scrapyard", "factory"].includes(
      step.biome.id,
    ) && index % 11 === 7;
    return candidates.map((x, order) => {
      const window = evaluateJumpWindow(
        previous, { x, y: step.y, width },
        GAME_CONFIG.physics, GAME_CONFIG.character,
      );
      const score = this.#scoreCandidate(
        previous, x, width, window, desiredRatio, wantsLongTransfer, order,
      );
      return { x, window, score };
    }).filter(({ window }) => window.frameCount >= minimumFrames)
      .sort((first, second) => first.score - second.score)[0]?.x ?? null;
  }

  #getDesiredChargeRatio(biomeId, index) {
    const ratios = DESIRED_CHARGE_RATIOS[biomeId];
    return ratios[index % ratios.length];
  }

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

  #findWallApproachX(previous, y, challenge, width, reservedPlatforms) {
    const entry = this.#findWallEntry(challenge, reservedPlatforms);
    if (!entry) return Math.round((this.worldWidth - width) / 2);
    const target = challenge.entrySide === "left"
      ? entry.x + entry.width + 64
      : entry.x - width - 64;
    const candidates = this.#createSearchCandidates(width, 8)
      .filter((x) => this.#hasReservedClearance(
        x, y, width, reservedPlatforms,
      ))
      .map((x) => this.#evaluateWallApproach(
        previous, entry, x, y, width,
      ))
      .filter(({ routeWindow, entryWindow }) => {
        return routeWindow.frameCount >= MINIMUM_SAFE_FRAMES[challenge.biomeId] &&
          entryWindow.frameCount >= 6;
      })
      .sort((first, second) => {
        return Math.abs(first.x - target) - Math.abs(second.x - target);
      });
    return candidates[0]?.x ?? this.#clampToReach(previous, target, width);
  }

  #findWallEntry(challenge, reservedPlatforms) {
    const anchorId = `${challenge.id}-${challenge.entrySide}-wall`;
    return reservedPlatforms.find((platform) => {
      return platform.anchorStructureId === anchorId;
    });
  }

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

  #clampToReach(previous, target, width) {
    const minimum = previous.x - width - MAXIMUM_HORIZONTAL_EDGE_GAP;
    const maximum = previous.x + previous.width + MAXIMUM_HORIZONTAL_EDGE_GAP;
    return Math.min(Math.max(56, target, minimum),
      maximum, this.worldWidth - width - 56);
  }

  #clampToWorld(x, width) {
    return Math.min(Math.max(56, x), this.worldWidth - width - 56);
  }

  #hasReservedClearance(x, y, width, reservedPlatforms) {
    return reservedPlatforms.every((platform) => {
      if (Math.abs(platform.y - y) >= RESERVED_CLEARANCE) return true;
      return x + width + 32 <= platform.x ||
        x >= platform.x + platform.width + 32;
    });
  }
}
