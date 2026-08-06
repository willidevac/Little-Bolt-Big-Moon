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
import { PLATFORM_MECHANIC_CONFIG } from
  "../../js/config/world-content-config.js";

const PLATFORM_HEIGHTS = PLATFORM_MECHANIC_CONFIG.heights;
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

  /** Creates state. */
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

  /** Creates next. */
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

  /** Returns next step. */
  #getNextStep(state, biomes) {
    if (state.pendingChallenge) return this.#exitWallChallenge(state, biomes);
    const biome = this.#findBiome(biomes, state.y - 1);
    const index = state.biomeSteps.get(biome.id) ?? 0;
    const profile = getProgressionProfile(biome.id);
    const initialY = Math.max(BOSS_ARENA.approachY,
      state.y - profile.gaps[index % profile.gaps.length]);
    const { y, challenge } = this.#scheduleChallenge(state, initialY);
    return { y, biome: this.#findBiome(biomes, y), challenge: null,
      approachChallenge: challenge };
  }

  /** Schedules challenge. */
  #scheduleChallenge(state, initialY) {
    let y = initialY;
    const challenge = this.#findUpcomingChallenge(state.y, y);
    if (challenge) {
      y = Math.max(y, challenge.y + challenge.height +
        WALL_ENTRY_MINIMUM_OFFSET);
      state.pendingChallenge = challenge;
    }
    return { y, challenge };
  }

  /** Performs wall challenge. */
  #exitWallChallenge(state, biomes) {
    const challenge = state.pendingChallenge;
    state.pendingChallenge = null;
    const y = challenge.y - WALL_CHALLENGE_EXIT_OFFSET;
    return { y, biome: this.#findBiome(biomes, y), challenge,
      approachChallenge: null };
  }

  /** Finds upcoming challenge. */
  #findUpcomingChallenge(currentY, nextY) {
    return WALL_BOUNCE_CHALLENGES.find((challenge) => {
      const approachY = challenge.y + challenge.height +
        WALL_CHALLENGE_ENTRY_OFFSET;
      return currentY > approachY && nextY <= approachY;
    }) ?? null;
  }

  /** Creates definition. */
  #createDefinition(state, step, profile, index, reservedPlatforms) {
    const isBossEntranceLift = step.y === BOSS_ARENA.approachY;
    const stableRole = this.#getRouteRole(step, profile, index);
    const mechanic = this.#scheduleMechanic(state, step, profile, index,
      stableRole);
    const role = mechanic ?? stableRole;
    const width = isBossEntranceLift ? 240 : this.#getWidth(profile, role);
    const x = this.positioner.findPlatformX(
      state.previous, step, profile, index, width, reservedPlatforms,
    );
    return this.#createRouteData(state, step, profile, index,
      { isBossEntranceLift, mechanic, role, width, x });
  }

  /** Returns route role. */
  #getRouteRole(step, profile, index) {
    if (step.challenge) return "rest";
    if (step.approachChallenge) return "standard";
    return this.#getStableRole(profile, index);
  }

  /** Schedules mechanic. */
  #scheduleMechanic(state, step, profile, index, stableRole) {
    const mechanicsAllowed = !step.challenge && !step.approachChallenge &&
      stableRole !== "rest";
    const newlyScheduled = mechanicsAllowed ? this.#getMechanic(profile, index) : null;
    const scheduledMechanic = state.pendingMechanic ?? newlyScheduled;
    const mechanic = mechanicsAllowed && !state.previous.mechanic
      ? scheduledMechanic
      : null;
    state.pendingMechanic = scheduledMechanic && !mechanic ? scheduledMechanic : null;
    return mechanic;
  }

  /** Creates route data. */
  #createRouteData(state, step, profile, index, values) {
    const { isBossEntranceLift, mechanic, role, width, x } = values;
    return Object.freeze({
      id: `route-${step.biome.id}-${state.order + 1}`,
      kind: isBossEntranceLift ? "boss-entrance-lift" : "progression-platform",
      routeRole: "main", routeOrder: state.order + 1, biomeId: step.biome.id,
      platformRole: role, mechanic, x, y: step.y, width,
      height: isBossEntranceLift ? Math.round(width * 107 / 512) :
        PLATFORM_HEIGHTS[role],
      accentColor: profile.accent, suggestedDirection: this.#getDirection(state.previous, x, width),
      requiresWallBounce: step.challenge?.id ?? null, preparesWallBounce: step.approachChallenge?.id ?? null,
      ...this.#getMechanicData(mechanic, step.biome.id, index),
    });
  }

  /** Performs operation. */
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

  /** Returns mechanic. */
  #getMechanic(profile, index) {
    return ["spring", "trap", "falling", "crane"].find((mechanic) => {
      const schedule = profile.mechanics[mechanic];
      return schedule && index % schedule[0] === schedule[1];
    }) ?? null;
  }

  /** Returns stable role. */
  #getStableRole(profile, index) {
    if (index > 0 && index % profile.restEvery === 0) return "rest";
    if (index % profile.precisionEvery === profile.precisionEvery - 1) {
      return "precision";
    }
    return "standard";
  }

  /** Returns width. */
  #getWidth(profile, role) {
    if (role === "rest") return profile.widths[3];
    if (role === "precision") return profile.widths[2];
    if (role === "spring") return profile.widths[1];
    if (role === "crane") return profile.widths[0];
    if (role === "trap" || role === "falling") return profile.widths[0];
    return profile.widths[0];
  }

  /** Returns mechanic data. */
  #getMechanicData(mechanic, biomeId, index) {
    if (mechanic === "trap") return {
      trap: PLATFORM_MECHANIC_CONFIG.trap,
    };
    if (mechanic === "falling") return {
      fall: PLATFORM_MECHANIC_CONFIG.falling,
    };
    if (mechanic === "spring") return PLATFORM_MECHANIC_CONFIG.spring;
    if (mechanic === "crane") return this.#getCraneData(biomeId, index);
    return {};
  }

  /** Returns crane data. */
  #getCraneData(biomeId, index) {
    return { crane: Object.freeze({
      axis: index % 2 === 0 ? "horizontal" : "vertical",
      travelPixels: this.#getCraneValue("travelPixels", biomeId),
      cycleSeconds: this.#getCraneValue("cycleSeconds", biomeId),
      cableLengthPixels: this.#getCraneValue("cableLengthPixels", biomeId),
      animationFrameSeconds: this.#getCraneValue("animationFrameSeconds", biomeId),
      surfaceRatio: this.#getCraneValue("surfaceRatio", biomeId),
    }) };
  }

  /** Returns crane value. */
  #getCraneValue(property, biomeId) {
    const values = PLATFORM_MECHANIC_CONFIG.crane[property];
    return values[biomeId] ?? values.default;
  }

  /** Configures spring launches. */
  #configureSpringLaunches(platforms) {
    const route = platforms.filter(({ routeRole }) => routeRole === "main");
    route.forEach((platform, index) => {
      if (platform.mechanic !== "spring" || !route[index + 1]) return;
      this.#configureSpring(platform, route[index + 1]);
    });
  }

  /** Configures spring. */
  #configureSpring(platform, target) {
    const sourceCenter = platform.x + platform.width / 2;
    const targetCenter = target.x + target.width / 2;
    const distance = Math.abs(targetCenter - sourceCenter);
    platform.bounceDirection = targetCenter < sourceCenter ? "left" : "right";
    platform.bounceHorizontalSpeedPixelsPerSecond = Math.min(
      560, Math.max(280, Math.round(distance / 0.88)),
    );
    platform.springTargetId = target.id;
  }

  /** Creates boss floors. */
  #createBossFloors(state) {
    const gapLeft = BOSS_ARENA.entranceCenterX -
      BOSS_ARENA.entranceWidth / 2;
    const gapRight = BOSS_ARENA.entranceCenterX +
      BOSS_ARENA.entranceWidth / 2;
    const common = this.#getBossFloorDefaults();
    const left = this.#createBossSideFloor("left", common, gapLeft);
    const gate = this.#createBossGate(common, state.order + 1, gapLeft);
    const right = this.#createBossSideFloor("right", common, gapRight);
    return Object.freeze([left, gate, right]);
  }

  /** Creates boss gate. */
  #createBossGate(common, routeOrder, x) {
    return new BossArenaGate(Object.freeze({
      ...common, id: "moon-warden-arena-floor", routeRole: "main",
      routeOrder, bossId: "moon-warden-final", x,
      width: BOSS_ARENA.entranceWidth,
    }));
  }

  /** Returns boss floor defaults. */
  #getBossFloorDefaults() {
    return {
      kind: "boss-arena-floor", biomeId: "moon",
      platformRole: "rest", accentColor: "#9aefff",
      suggestedDirection: null, requiresWallBounce: null,
      preparesWallBounce: null, y: BOSS_ARENA.floorY,
      height: BOSS_ARENA.floorHeight,
    };
  }

  /** Creates boss side floor. */
  #createBossSideFloor(side, common, gap) {
    const isLeft = side === "left";
    const x = isLeft ? BOSS_ARENA.floorX : gap;
    const width = isLeft ? gap - BOSS_ARENA.floorX :
      BOSS_ARENA.floorX + BOSS_ARENA.floorWidth - gap;
    return new BossArenaFloor(Object.freeze({ ...common,
      id: `moon-warden-arena-floor-${side}`,
      routeRole: "boss-arena-support", routeOrder: null, x, width }));
  }

  /** Returns direction. */
  #getDirection(previous, x, width) {
    const previousCenter = previous.x + previous.width / 2;
    return x + width / 2 < previousCenter ? "left" : "right";
  }

  /** Takes biome index. */
  #takeBiomeIndex(state, biomeId) {
    const index = state.biomeSteps.get(biomeId) ?? 0;
    state.biomeSteps.set(biomeId, index + 1);
    return index;
  }

  /** Finds biome. */
  #findBiome(biomes, y) {
    return biomes.find((biome) => y >= biome.topY && y <= biome.bottomY) ??
      biomes.at(-1);
  }

  /** Performs biomes. */
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

  /** Validates inputs. */
  #validateInputs(sections, reservedPlatforms, previousPlatform) {
    const hasSections = Array.isArray(sections) && sections.length > 0;
    const hasReserved = Array.isArray(reservedPlatforms);
    const hasPrevious = Number.isFinite(previousPlatform?.y) &&
      Number.isFinite(previousPlatform?.routeOrder);
    if (hasSections && hasReserved && hasPrevious) return;
    throw new TypeError("The progression route inputs are invalid.");
  }
}
