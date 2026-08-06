import { ScrapCrawler } from "../entities/enemies/scrap-crawler.class.js";
import { DroneGuard } from "../entities/enemies/drone-guard.class.js";
import { SpringMine } from "../entities/enemies/spring-mine.class.js";
import { CombatZone } from "../environment/combat-zone.class.js";

const ENEMY_HEIGHT = 64;
const ENEMY_WIDTH = 96;
const PLATFORM_MARGIN = 20;
const TRIGGER_HEIGHT_ABOVE = 500;
const TRIGGER_DEPTH_BELOW = 160;
const ENCOUNTER_PROFILES = Object.freeze([
  Object.freeze(["scrapCrawler"]),
  Object.freeze(["scrapCrawler", "scrapCrawler"]),
  Object.freeze(["scrapCrawler", "droneGuard"]),
  Object.freeze(["springMine", "droneGuard"]),
  Object.freeze(["scrapCrawler", "springMine", "droneGuard"]),
  Object.freeze(["springMine", "droneGuard", "droneGuard"]),
  Object.freeze(["scrapCrawler", "springMine", "springMine", "droneGuard"]),
  Object.freeze(["springMine", "springMine", "droneGuard", "droneGuard"]),
]);

const ENEMY_CLASSES = Object.freeze({
  scrapCrawler: ScrapCrawler,
  droneGuard: DroneGuard,
  springMine: SpringMine,
});
const REQUIRED_STAGE_INDICES = new Set([2, 4, 6, 7]);

/** Populates the eight wide platforms with increasingly difficult encounters. */
export class CombatEncounterBuilder {
  /**
   * Creates the configured builder.
   * @param {number} worldWidth Total playable world width in pixels.
   */
  constructor(worldWidth) {
    if (!Number.isFinite(worldWidth) || worldWidth <= 0) {
      throw new TypeError("Die Weltbreite der Kampfbegegnungen ist ungültig.");
    }
    this.worldWidth = worldWidth;
  }

  /**
   * Runs build with validated construction inputs.
   * @param {ReadonlyArray<object>} platforms Platforms available for route construction.
   * @param {Readonly<object>} enemyConfig Enemy configuration used for encounter creation.
   * @returns {Readonly<{enemies:ReadonlyArray,combatZones:ReadonlyArray}>}
   */
  build(platforms, enemyConfig) {
    this.#validateInputs(platforms, enemyConfig);
    const stages = this.#getStages(platforms);
    const encounters = stages.map((stage, stageIndex) => {
      return this.#createEncounter(
        stage, stageIndex, enemyConfig, platforms,
      );
    });
    return Object.freeze({
      enemies: Object.freeze(encounters.flatMap(({ enemies }) => enemies)),
      combatZones: Object.freeze(encounters.map(({ zone }) => zone)),
    });
  }

  /**
   * Returns stages.
   * @param {ReadonlyArray<object>} platforms Platforms available for route construction.
   */
  #getStages(platforms) {
    return platforms.filter(({ kind }) => kind === "combat-staging-platform")
      .sort((first, second) => this.#getStageNumber(first) -
        this.#getStageNumber(second));
  }

  /**
   * Creates encounter.
   * @param {Readonly<object>} stage Combat or traversal stage being created.
   * @param {number} stageIndex Stage index used while create encounter.
   * @param {Readonly<object>} config Configuration values used by the builder.
   * @param {ReadonlyArray<object>} platforms Platforms available for route construction.
   */
  #createEncounter(stage, stageIndex, config, platforms) {
    const profile = ENCOUNTER_PROFILES[stageIndex];
    const enemies = this.#createEnemies(profile, stage, stageIndex, config);
    const zone = this.#createZone(stage, stageIndex, platforms, enemies);
    return Object.freeze({ enemies: Object.freeze(enemies), zone });
  }

  /**
   * Creates enemies.
   * @param {Readonly<object>} profile Profile used while create enemies.
   * @param {Readonly<object>} stage Combat or traversal stage being created.
   * @param {number} stageIndex Stage index used while create enemies.
   * @param {Readonly<object>} config Configuration values used by the builder.
   */
  #createEnemies(profile, stage, stageIndex, config) {
    const groundCount = profile.filter((type) => type !== "droneGuard").length;
    const droneCount = profile.length - groundCount;
    let groundIndex = 0;
    let droneIndex = 0;
    const enemies = profile.map((type, enemyIndex) => {
      const placement = type === "droneGuard"
        ? this.#getDronePlacement(stage, droneIndex++, droneCount)
        : this.#getGroundPlacement(stage, groundIndex++, groundCount);
      return this.#createEnemy(type, stage, stageIndex, enemyIndex,
        placement, config[type]);
    });
    return enemies;
  }

  /**
   * Creates zone.
   * @param {Readonly<object>} stage Combat or traversal stage being created.
   * @param {number} stageIndex Stage index used while create zone.
   * @param {ReadonlyArray<object>} platforms Platforms available for route construction.
   * @param {ReadonlyArray<object>} enemies Enemies used while create zone.
   */
  #createZone(stage, stageIndex, platforms, enemies) {
    return new CombatZone(Object.freeze({
      id: `${stage.id}-zone`,
      x: 0,
      y: stage.y - TRIGGER_HEIGHT_ABOVE,
      width: this.worldWidth,
      height: TRIGGER_HEIGHT_ABOVE + TRIGGER_DEPTH_BELOW,
      enemyIds: Object.freeze(enemies.map(({ id }) => id)),
      unlockPlatformId: this.#getUnlockPlatformId(
        stage, stageIndex, platforms,
      ),
    }));
  }

  /**
   * Returns unlock platform id.
   * @param {Readonly<object>} stage Combat or traversal stage being created.
   * @param {number} stageIndex Stage index used while get unlock platform id.
   * @param {ReadonlyArray<object>} platforms Platforms available for route construction.
   */
  #getUnlockPlatformId(stage, stageIndex, platforms) {
    if (!REQUIRED_STAGE_INDICES.has(stageIndex)) return null;
    const anchor = platforms.find(({ id }) => {
      return id === stage.anchorRoutePlatformId;
    });
    const next = platforms.find(({ routeRole, routeOrder }) => {
      return routeRole === "main" && routeOrder === anchor?.routeOrder + 1;
    });
    if (next && !next.mechanic && !next.requiresWallBounce &&
      !next.preparesWallBounce) return next.id;
    throw new RangeError(`${stage.id} hat keinen fairen Kampfausgang.`);
  }

  /**
   * Creates enemy.
   * @param {Readonly<object>} type Type used while create enemy.
   * @param {Readonly<object>} stage Combat or traversal stage being created.
   * @param {number} stageIndex Stage index used while create enemy.
   * @param {number} enemyIndex Enemy index used while create enemy.
   * @param {Readonly<object>} placement Placement used while create enemy.
   * @param {Readonly<object>} config Configuration values used by the builder.
   */
  #createEnemy(type, stage, stageIndex, enemyIndex, placement, config) {
    const EnemyClass = ENEMY_CLASSES[type];
    const enemy = new EnemyClass(Object.freeze({
      id: `combat-enemy-${stageIndex + 1}-${enemyIndex + 1}`,
      type,
      x: placement.x,
      y: placement.y,
      patrolMinX: placement.patrolMinX,
      patrolMaxX: placement.patrolMaxX,
      startDirection: enemyIndex % 2 === 0 ? 1 : -1,
    }), config);
    enemy.anchorPlatformId = stage.id;
    return enemy;
  }

  /**
   * Returns ground placement.
   * @param {Readonly<object>} stage Combat or traversal stage being created.
   * @param {Readonly<object>} index Zero-based route or stage index.
   * @param {Readonly<object>} count Count used while get ground placement.
   */
  #getGroundPlacement(stage, index, count) {
    const patrolStart = stage.x + PLATFORM_MARGIN;
    const usableWidth = stage.width - PLATFORM_MARGIN * 2;
    const laneWidth = usableWidth / count;
    const patrolMinX = Math.round(patrolStart + laneWidth * index);
    const patrolMaxX = Math.round(patrolStart + laneWidth * (index + 1));
    return Object.freeze({
      x: Math.round(patrolMinX + (patrolMaxX - patrolMinX - ENEMY_WIDTH) / 2),
      y: stage.y - ENEMY_HEIGHT,
      patrolMinX,
      patrolMaxX,
    });
  }

  /**
   * Returns drone placement.
   * @param {Readonly<object>} stage Combat or traversal stage being created.
   * @param {Readonly<object>} index Zero-based route or stage index.
   * @param {Readonly<object>} count Count used while get drone placement.
   */
  #getDronePlacement(stage, index, count) {
    const patrolMinX = Math.round(stage.x + PLATFORM_MARGIN);
    const patrolMaxX = Math.round(stage.x + stage.width - PLATFORM_MARGIN);
    const travelWidth = patrolMaxX - patrolMinX - ENEMY_WIDTH;
    return Object.freeze({
      x: Math.round(patrolMinX + travelWidth * (index + 1) / (count + 1)),
      y: stage.y - 190 - index * 70,
      patrolMinX,
      patrolMaxX,
    });
  }

  /**
   * Returns stage number.
   * @param {Readonly<object>} stage Combat or traversal stage being created.
   */
  #getStageNumber(stage) {
    return Number.parseInt(stage.id.replace("combat-stage-", ""), 10);
  }

  /**
   * Validates inputs.
   * @param {ReadonlyArray<object>} platforms Platforms available for route construction.
   * @param {Readonly<object>} config Configuration values used by the builder.
   */
  #validateInputs(platforms, config) {
    const stages = Array.isArray(platforms) ? platforms.filter(({ kind }) => {
      return kind === "combat-staging-platform";
    }) : [];
    const hasStages = stages.length === ENCOUNTER_PROFILES.length;
    const hasConfig = Object.keys(ENEMY_CLASSES).every((type) => config?.[type]);
    if (hasStages && hasConfig) return;
    throw new TypeError("Kampfbegegnungen brauchen acht Plattformen und Gegnerwerte.");
  }
}
