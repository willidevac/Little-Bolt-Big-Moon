import { SpriteSurfacePlatform } from
  "../environment/sprite-surface-platform.class.js";
import { BossArenaFloor } from
  "../environment/boss-arena-floor.class.js";
import { BossArenaGate } from
  "../environment/boss-arena-gate.class.js";
import { MechanicPlatformBuilder } from "./mechanic-platform-builder.class.js";
import { ProgressionRoutePositioner } from
  "./progression-route-positioner.class.js";
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
const PLATFORM_HEIGHTS = Object.freeze({
  precision: 58, standard: 64, rest: 88,
  trap: 70, falling: 74, spring: 82,
});
const WALL_ENTRY_MINIMUM_OFFSET = 32;

/** Builds the complete increasingly difficult jump route to the final boss. */
export class ProgressionRouteBuilder {
  /** @param {number} worldWidth */
  constructor(worldWidth) {
    if (!Number.isFinite(worldWidth) || worldWidth <= 0) {
      throw new TypeError("The progression world width is invalid.");
    }
    this.worldWidth = worldWidth;
    this.mechanics = new MechanicPlatformBuilder();
    this.positioner = new ProgressionRoutePositioner(
      worldWidth, BOSS_ARENA.approachY,
    );
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
    const x = this.positioner.findPlatformX(
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
