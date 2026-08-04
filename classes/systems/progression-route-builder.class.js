import { SpriteSurfacePlatform } from
  "../environment/sprite-surface-platform.class.js";
import { BossArenaFloor } from
  "../environment/boss-arena-floor.class.js";
import { BossArenaGate } from
  "../environment/boss-arena-gate.class.js";
import { MechanicPlatformBuilder } from "./mechanic-platform-builder.class.js";
import {
  getScrapyardPrototypePlatformSpriteConfig,
  getWallPlatformSpriteConfig,
  WALL_BOUNCE_CHALLENGES,
} from "../../js/config/wall-course-config.js";
import {
  BOSS_ARENA,
  getBossEntranceLiftSpriteConfig,
  getProgressionProfile,
  WALL_CHALLENGE_ENTRY_OFFSET,
  WALL_CHALLENGE_EXIT_OFFSET,
} from "../../js/config/progression-route-config.js";
import { GAME_CONFIG } from "../../js/config/game-config.js";
import { evaluateJumpWindow } from "../../js/utils/jump-reachability.js";

const PLATFORM_HEIGHTS = Object.freeze({
  precision: 58, standard: 64, rest: 88,
  trap: 70, falling: 74, spring: 82,
});
const RESERVED_CLEARANCE = 144;
const MAXIMUM_HORIZONTAL_EDGE_GAP = 410;
const WALL_ENTRY_MINIMUM_OFFSET = 32;
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

/** Builds the complete increasingly difficult jump route to the final boss. */
export class ProgressionRouteBuilder {
  /** @param {number} worldWidth */
  constructor(worldWidth) {
    if (!Number.isFinite(worldWidth) || worldWidth <= 0) {
      throw new TypeError("The progression world width is invalid.");
    }
    this.worldWidth = worldWidth;
    this.mechanics = new MechanicPlatformBuilder();
  }

  /** Returns all intermediate floors plus the final boss floor. */
  build(sections, reservedPlatforms, previousPlatform) {
    this.#validateInputs(sections, reservedPlatforms, previousPlatform);
    const biomes = this.#groupBiomes(sections);
    const state = this.#createState(previousPlatform);
    const platforms = [];
    while (state.y > BOSS_ARENA.approachY) {
      platforms.push(this.#createNext(state, biomes, reservedPlatforms));
    }
    platforms.push(...this.#createBossFloors(state));
    this.#configureSpringLaunches(platforms);
    return Object.freeze(platforms);
  }

  #createState(previousPlatform) {
    return {
      y: previousPlatform.y,
      previous: previousPlatform,
      order: previousPlatform.routeOrder,
      biomeSteps: new Map(),
      pendingChallenge: null,
      pendingMechanic: null,
    };
  }

  #createNext(state, biomes, reservedPlatforms) {
    const step = this.#getNextStep(state, biomes);
    const profile = getProgressionProfile(step.biome.id);
    const index = this.#takeBiomeIndex(state, step.biome.id);
    const definition = this.#createDefinition(
      state, step, profile, index, reservedPlatforms,
    );
    const platform = this.#instantiate(definition, profile);
    Object.assign(state, {
      y: platform.y, previous: platform, order: platform.routeOrder,
    });
    return platform;
  }

  #getNextStep(state, biomes) {
    if (state.pendingChallenge) return this.#exitWallChallenge(state, biomes);
    const biome = this.#findBiome(biomes, state.y - 1);
    const index = state.biomeSteps.get(biome.id) ?? 0;
    const profile = getProgressionProfile(biome.id);
    let y = Math.max(BOSS_ARENA.approachY,
      state.y - profile.gaps[index % profile.gaps.length]);
    const challenge = this.#findUpcomingChallenge(state.y, y);
    if (challenge) {
      y = Math.max(y, challenge.y + challenge.height +
        WALL_ENTRY_MINIMUM_OFFSET);
      state.pendingChallenge = challenge;
    }
    return {
      y, biome: this.#findBiome(biomes, y), challenge: null,
      approachChallenge: challenge,
    };
  }

  #exitWallChallenge(state, biomes) {
    const challenge = state.pendingChallenge;
    state.pendingChallenge = null;
    const y = challenge.y - WALL_CHALLENGE_EXIT_OFFSET;
    return { y, biome: this.#findBiome(biomes, y), challenge,
      approachChallenge: null };
  }

  #findUpcomingChallenge(currentY, nextY) {
    return WALL_BOUNCE_CHALLENGES.find((challenge) => {
      const approachY = challenge.y + challenge.height +
        WALL_CHALLENGE_ENTRY_OFFSET;
      return currentY > approachY && nextY <= approachY;
    }) ?? null;
  }

  #createDefinition(state, step, profile, index, reservedPlatforms) {
    const isBossEntranceLift = step.y === BOSS_ARENA.approachY;
    const stableRole = step.challenge
      ? "rest"
      : step.approachChallenge
        ? "standard"
        : this.#getStableRole(profile, index);
    const mechanicsAllowed = !step.challenge && !step.approachChallenge &&
      stableRole !== "rest";
    const newlyScheduled = mechanicsAllowed
      ? this.#getMechanic(profile, index)
      : null;
    const scheduledMechanic = state.pendingMechanic ?? newlyScheduled;
    const mechanic = mechanicsAllowed && !state.previous.mechanic
      ? scheduledMechanic
      : null;
    state.pendingMechanic = scheduledMechanic && !mechanic
      ? scheduledMechanic
      : null;
    const role = mechanic ?? stableRole;
    const width = isBossEntranceLift ? 240 : this.#getWidth(profile, role);
    const x = this.#getX(
      state.previous, step, profile, index, width, reservedPlatforms,
    );
    return Object.freeze({
      id: `route-${step.biome.id}-${state.order + 1}`,
      kind: isBossEntranceLift ? "boss-entrance-lift" : "progression-platform",
      routeRole: "main",
      routeOrder: state.order + 1, biomeId: step.biome.id,
      platformRole: role, mechanic, x, y: step.y, width,
      height: isBossEntranceLift
        ? Math.round(width * 107 / 512)
        : PLATFORM_HEIGHTS[role],
      accentColor: profile.accent,
      suggestedDirection: this.#getDirection(state.previous, x, width),
      requiresWallBounce: step.challenge?.id ?? null,
      preparesWallBounce: step.approachChallenge?.id ?? null,
      ...this.#getMechanicData(mechanic),
    });
  }

  #instantiate(definition) {
    if (definition.mechanic) return this.mechanics.create(definition);
    if (definition.kind === "boss-entrance-lift") {
      return new SpriteSurfacePlatform(
        definition, getBossEntranceLiftSpriteConfig(),
      );
    }
    const sprite = definition.biomeId === "scrapyard"
      ? getScrapyardPrototypePlatformSpriteConfig(definition.platformRole)
      : getWallPlatformSpriteConfig(definition.biomeId);
    return new SpriteSurfacePlatform(definition, sprite);
  }

  #getMechanic(profile, index) {
    return ["spring", "trap", "falling"].find((mechanic) => {
      const schedule = profile.mechanics[mechanic];
      return schedule && index % schedule[0] === schedule[1];
    }) ?? null;
  }

  #getStableRole(profile, index) {
    if (index > 0 && index % profile.restEvery === 0) return "rest";
    if (index % profile.precisionEvery === profile.precisionEvery - 1) {
      return "precision";
    }
    return "standard";
  }

  #getWidth(profile, role) {
    if (role === "rest") return profile.widths[3];
    if (role === "precision") return profile.widths[2];
    if (role === "spring") return profile.widths[1];
    if (role === "trap" || role === "falling") return profile.widths[0];
    return profile.widths[0];
  }

  #getX(previous, step, profile, index, width, reservedPlatforms) {
    if (step.y === BOSS_ARENA.approachY) {
      return Math.round((this.worldWidth - width) / 2);
    }
    if (step.challenge) return Math.round((this.worldWidth - width) / 2);
    if (step.approachChallenge) {
      return this.#getWallApproachX(
        previous, step.y, step.approachChallenge, width, reservedPlatforms,
      );
    }
    const laneCandidates = profile.lanes.map((lane, offset) => {
      const candidate = profile.lanes[(index + offset) % profile.lanes.length];
      return Math.min(Math.max(56, candidate), this.worldWidth - width - 56);
    });
    const searchCandidates = Array.from(
      { length: Math.floor((this.worldWidth - width - 112) / 16) + 1 },
      (_, candidateIndex) => 56 + candidateIndex * 16,
    );
    const candidates = [...new Set([...laneCandidates, ...searchCandidates])]
      .filter((x) => this.#hasReservedClearance(
        x, step.y, width, reservedPlatforms,
      ));
    const lane = this.#selectReachableX(
      previous, step, profile, index, width, candidates,
    ) ?? Math.round((this.worldWidth - width) / 2);
    return Math.min(Math.max(56, lane), this.worldWidth - width - 56);
  }

  #selectReachableX(previous, step, profile, index, width, candidates) {
    const minimumFrames = MINIMUM_SAFE_FRAMES[step.biome.id];
    const ratios = DESIRED_CHARGE_RATIOS[step.biome.id];
    const desiredRatio = ratios[index % ratios.length];
    const wantsLongTransfer = ["scrapyard", "factory"].includes(step.biome.id) &&
      index % 11 === 7;
    return candidates.map((x, order) => {
      const target = { x, y: step.y, width };
      const window = evaluateJumpWindow(
        previous, target, GAME_CONFIG.physics, GAME_CONFIG.character,
      );
      const ratiosForWindow = window.samples.map(({ ratio }) => ratio);
      const centerRatio = ratiosForWindow.length
        ? ratiosForWindow.reduce((total, ratio) => total + ratio, 0) /
          ratiosForWindow.length
        : 2;
      const centerDistance = Math.abs(
        x + width / 2 - (previous.x + previous.width / 2),
      );
      const longTransferPenalty = wantsLongTransfer && centerDistance < 360
        ? 10000
        : 0;
      const score = longTransferPenalty +
        Math.abs(centerRatio - desiredRatio) * 1000 + order;
      return { x, window, score };
    }).filter(({ window }) => window.frameCount >= minimumFrames)
      .sort((first, second) => first.score - second.score)[0]?.x ?? null;
  }

  #getWallApproachX(previous, y, challenge, width, reservedPlatforms) {
    const anchorId = `${challenge.id}-${challenge.entrySide}-wall`;
    const entry = reservedPlatforms.find((platform) => {
      return platform.anchorStructureId === anchorId;
    });
    if (!entry) return Math.round((this.worldWidth - width) / 2);
    const target = challenge.entrySide === "left"
      ? entry.x + entry.width + 64
      : entry.x - width - 64;
    const candidates = Array.from(
      { length: Math.floor((this.worldWidth - width - 112) / 8) + 1 },
      (_, index) => 56 + index * 8,
    ).filter((x) => this.#hasReservedClearance(
      x, y, width, reservedPlatforms,
    )).map((x) => ({
      x,
      routeWindow: evaluateJumpWindow(
        previous, { x, y, width }, GAME_CONFIG.physics, GAME_CONFIG.character,
      ),
      entryWindow: evaluateJumpWindow(
        { x, y, width }, entry, GAME_CONFIG.physics, GAME_CONFIG.character,
      ),
    })).filter(({ routeWindow, entryWindow }) => {
      return routeWindow.frameCount >= MINIMUM_SAFE_FRAMES[challenge.biomeId] &&
        entryWindow.frameCount >= 6;
    }).sort((first, second) => {
      return Math.abs(first.x - target) - Math.abs(second.x - target);
    });
    return candidates[0]?.x ?? this.#clampToReach(previous, target, width);
  }

  #clampToReach(previous, target, width) {
    const minimum = previous.x - width - MAXIMUM_HORIZONTAL_EDGE_GAP;
    const maximum = previous.x + previous.width + MAXIMUM_HORIZONTAL_EDGE_GAP;
    return Math.min(Math.max(56, target, minimum),
      maximum, this.worldWidth - width - 56);
  }

  #hasReservedClearance(x, y, width, reservedPlatforms) {
    return reservedPlatforms.every((platform) => {
      if (Math.abs(platform.y - y) >= RESERVED_CLEARANCE) return true;
      return x + width + 32 <= platform.x ||
        x >= platform.x + platform.width + 32;
    });
  }

  #getMechanicData(mechanic) {
    if (mechanic === "trap") return {
      trap: Object.freeze({
        safeSeconds: 1.35, warningSeconds: 0.65,
        activeSeconds: 0.85, damage: 14,
      }),
    };
    if (mechanic === "falling") return {
      fall: Object.freeze({
        warningDelaySeconds: 1, speedPixelsPerSecond: 560,
        maximumDropPixels: 920, respawnDelaySeconds: 2.4,
      }),
    };
    if (mechanic === "spring") return {
      bounceSpeedPixelsPerSecond: 1360,
      bounceHorizontalSpeedPixelsPerSecond: 400,
      bounceDirection: "right",
    };
    return {};
  }

  #configureSpringLaunches(platforms) {
    const route = platforms.filter(({ routeRole }) => routeRole === "main");
    route.forEach((platform, index) => {
      if (platform.mechanic !== "spring" || !route[index + 1]) return;
      const target = route[index + 1];
      const sourceCenter = platform.x + platform.width / 2;
      const targetCenter = target.x + target.width / 2;
      const distance = Math.abs(targetCenter - sourceCenter);
      platform.bounceDirection = targetCenter < sourceCenter ? "left" : "right";
      platform.bounceHorizontalSpeedPixelsPerSecond = Math.min(
        560, Math.max(280, Math.round(distance / 0.88)),
      );
      platform.springTargetId = target.id;
    });
  }

  #createBossFloors(state) {
    const gapLeft = BOSS_ARENA.entranceCenterX -
      BOSS_ARENA.entranceWidth / 2;
    const gapRight = BOSS_ARENA.entranceCenterX +
      BOSS_ARENA.entranceWidth / 2;
    const common = {
      kind: "boss-arena-floor", biomeId: "moon",
      platformRole: "rest", accentColor: "#9aefff",
      suggestedDirection: null, requiresWallBounce: null,
      preparesWallBounce: null, y: BOSS_ARENA.floorY,
      height: BOSS_ARENA.floorHeight,
    };
    const left = new BossArenaFloor(Object.freeze({
      ...common, id: "moon-warden-arena-floor-left",
      routeRole: "boss-arena-support", routeOrder: null,
      x: BOSS_ARENA.floorX, width: gapLeft - BOSS_ARENA.floorX,
    }));
    const gate = new BossArenaGate(Object.freeze({
      ...common, id: "moon-warden-arena-floor", routeRole: "main",
      routeOrder: state.order + 1, bossId: "moon-warden-final",
      x: gapLeft, width: BOSS_ARENA.entranceWidth,
    }));
    const right = new BossArenaFloor(Object.freeze({
      ...common, id: "moon-warden-arena-floor-right",
      routeRole: "boss-arena-support", routeOrder: null,
      x: gapRight,
      width: BOSS_ARENA.floorX + BOSS_ARENA.floorWidth - gapRight,
    }));
    return Object.freeze([left, gate, right]);
  }

  #getDirection(previous, x, width) {
    const previousCenter = previous.x + previous.width / 2;
    return x + width / 2 < previousCenter ? "left" : "right";
  }

  #takeBiomeIndex(state, biomeId) {
    const index = state.biomeSteps.get(biomeId) ?? 0;
    state.biomeSteps.set(biomeId, index + 1);
    return index;
  }

  #findBiome(biomes, y) {
    return biomes.find((biome) => y >= biome.topY && y <= biome.bottomY) ??
      biomes.at(-1);
  }

  #groupBiomes(sections) {
    const grouped = new Map();
    sections.forEach((section) => {
      const current = grouped.get(section.tileset) ?? {
        id: section.tileset, topY: section.topY, bottomY: section.bottomY,
      };
      current.topY = Math.min(current.topY, section.topY);
      current.bottomY = Math.max(current.bottomY, section.bottomY);
      grouped.set(section.tileset, current);
    });
    return [...grouped.values()];
  }

  #validateInputs(sections, reservedPlatforms, previousPlatform) {
    const hasSections = Array.isArray(sections) && sections.length > 0;
    const hasReserved = Array.isArray(reservedPlatforms);
    const hasPrevious = Number.isFinite(previousPlatform?.y) &&
      Number.isFinite(previousPlatform?.routeOrder);
    if (hasSections && hasReserved && hasPrevious) return;
    throw new TypeError("The progression route inputs are invalid.");
  }
}
