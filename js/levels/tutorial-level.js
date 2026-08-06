import { SpriteSurfacePlatform } from
  "../../classes/environment/sprite-surface-platform.class.js";
import { ThinWallBuilder } from
  "../../classes/systems/thin-wall-builder.class.js";
import { MechanicPlatformBuilder } from
  "../../classes/systems/mechanic-platform-builder.class.js";
import { AnchoredCollectable } from
  "../../classes/entities/collectables/anchored-collectable.class.js";
import { ScrapCrawler } from
  "../../classes/entities/enemies/scrap-crawler.class.js";
import { DroneGuard } from
  "../../classes/entities/enemies/drone-guard.class.js";
import { SpringMine } from
  "../../classes/entities/enemies/spring-mine.class.js";
import { ScrapOverseer } from
  "../../classes/entities/enemies/scrap-overseer.class.js";
import { CombatZone } from
  "../../classes/environment/combat-zone.class.js";
import { getAssetPath } from "../config/asset-paths.js";
import { GAME_CONFIG } from "../config/game-config.js";
import {
  getScrapyardPrototypePlatformSpriteConfig,
  getStartFloorSpriteConfig,
} from "../config/wall-course-config.js";
import {
  TUTORIAL_LEVEL_CONFIG,
  TUTORIAL_BOSS_DEFINITION,
  TUTORIAL_BOSS_ZONE_DEFINITION,
  TUTORIAL_PLATFORM_DEFINITIONS,
  TUTORIAL_COMBAT_ENEMY_DEFINITIONS,
  TUTORIAL_COMBAT_PROFILES,
  TUTORIAL_COMBAT_ZONE_DEFINITION,
  TUTORIAL_PRACTICE_TARGET_DEFINITION,
  TUTORIAL_PRACTICE_TARGET_PROFILE,
  TUTORIAL_RESOURCE_PICKUP_DEFINITIONS,
  TUTORIAL_WEAPON_PICKUP_DEFINITION,
} from "../config/tutorial-level-config.js";

const TUTORIAL_ENEMY_CLASSES = Object.freeze({
  scrapCrawler: ScrapCrawler,
  springMine: SpringMine,
  droneGuard: DroneGuard,
  scrapOverseer: ScrapOverseer,
});

/**
 * Creates the compact production tutorial with the regular level contract.
 * @param {object} [enemyConfig=GAME_CONFIG.enemies] Enemy definitions used to populate the level.
 */
export function createTutorialLevel(enemyConfig = GAME_CONFIG.enemies) {
  const sections = Object.freeze([createSection()]);
  const platforms = createPlatforms();
  const training = createTrainingContent(platforms, enemyConfig);
  return createLevelResult(sections, platforms, training);
}

/**
 * Creates the immutable regular level contract.
 * @param {ReadonlyArray<object>} sections Immutable level sections used to assemble the route.
 * @param {ReadonlyArray<object>} platforms Platform definitions used to place level content.
 * @param {object} training Collectables, enemies, and zones created for training.
 */
function createLevelResult(sections, platforms, training) {
  const { id, width, height, playerStart, cameraBounds } = TUTORIAL_LEVEL_CONFIG;
  return Object.freeze({
    id, width, height, sections,
    playerStart: Object.freeze({ ...playerStart }),
    cameraBounds,
    structures: new ThinWallBuilder(TUTORIAL_LEVEL_CONFIG.width).build(sections),
    platforms, collectables: training.collectables,
    storyProps: Object.freeze([]),
    hazards: Object.freeze([]), combatZones: training.combatZones,
    enemies: training.enemies,
  });
}

/**
 * Creates the weapon pickup and its harmless production target.
 * @param {ReadonlyArray<object>} platforms Platform definitions used to place level content.
 * @param {object} enemyConfig Enemy definitions used to populate the level.
 */
function createTrainingContent(platforms, enemyConfig) {
  const weaponAnchor = getAnchor(platforms, TUTORIAL_WEAPON_PICKUP_DEFINITION);
  return Object.freeze({
    collectables: createTrainingCollectables(platforms, weaponAnchor),
    enemies: createTutorialEnemies(weaponAnchor, enemyConfig),
    combatZones: createTutorialZones(),
  });
}

/**
 * Creates all staged training enemies in their activation order.
 * @param {object} weaponAnchor Platform anchoring the weapon-training sequence.
 * @param {object} enemyConfig Enemy definitions used to populate the level.
 */
function createTutorialEnemies(weaponAnchor, enemyConfig) {
  return Object.freeze([
    createPracticeTarget(weaponAnchor, enemyConfig),
    ...createCombatEnemies(enemyConfig),
    createTutorialBoss(enemyConfig),
  ]);
}

/** Creates the regular wave followed by its dependent boss encounter. */
function createTutorialZones() {
  return Object.freeze([
    new CombatZone(TUTORIAL_COMBAT_ZONE_DEFINITION),
    new CombatZone(TUTORIAL_BOSS_ZONE_DEFINITION),
  ]);
}

/**
 * Creates the original boss while keeping it deferred by its own zone.
 * @param {object} enemyConfig Enemy definitions used to populate the level.
 */
function createTutorialBoss(enemyConfig) {
  return new ScrapOverseer(
    TUTORIAL_BOSS_DEFINITION,
    enemyConfig.scrapOverseer,
  );
}

/**
 * Creates every resource and weapon pickup in route order.
 * @param {ReadonlyArray<object>} platforms Platform definitions used to place level content.
 * @param {object} weaponAnchor Platform anchoring the weapon pickup.
 */
function createTrainingCollectables(platforms, weaponAnchor) {
  const resources = TUTORIAL_RESOURCE_PICKUP_DEFINITIONS.map((definition) => {
    return createPickup(definition, getAnchor(platforms, definition));
  });
  return Object.freeze([
    ...resources,
    createPickup(TUTORIAL_WEAPON_PICKUP_DEFINITION, weaponAnchor),
  ]);
}

/**
 * Returns the platform referenced by one tutorial pickup.
 * @param {ReadonlyArray<object>} platforms Platform definitions used to place level content.
 * @param {object} definition Immutable source definition used to create the entity.
 */
function getAnchor(platforms, definition) {
  const anchor = platforms.find(({ id }) => id === definition.anchorPlatformId);
  if (anchor) return anchor;
  throw new RangeError(`Tutorial-Plattform fehlt: ${definition.anchorPlatformId}`);
}

/**
 * Creates one regular anchored production pickup.
 * @param {object} definition Immutable source definition used to create the entity.
 * @param {object} anchor Tutorial position used to place the entity.
 */
function createPickup(definition, anchor) {
  return new AnchoredCollectable(definition, anchor);
}

/**
 * Creates a passive crawler that uses regular projectile hit handling.
 * @param {object} anchor Tutorial position used to place the entity.
 * @param {object} enemyConfig Enemy definitions used to populate the level.
 */
function createPracticeTarget(anchor, enemyConfig) {
  const profile = Object.freeze({
    ...enemyConfig.scrapCrawler, ...TUTORIAL_PRACTICE_TARGET_PROFILE,
  });
  const target = new ScrapCrawler(TUTORIAL_PRACTICE_TARGET_DEFINITION, profile);
  target.anchorPlatformId = anchor.id;
  target.y = anchor.y - target.height;
  return target;
}

/**
 * Creates the mild crawler and drone through their production classes.
 * @param {object} enemyConfig Enemy definitions used to populate the level.
 */
function createCombatEnemies(enemyConfig) {
  return TUTORIAL_COMBAT_ENEMY_DEFINITIONS.map((definition) => {
    const EnemyClass = TUTORIAL_ENEMY_CLASSES[definition.type];
    const profile = Object.freeze({
      ...enemyConfig[definition.type], ...TUTORIAL_COMBAT_PROFILES[definition.type],
    });
    return new EnemyClass(definition, profile);
  });
}

/** Creates the tutorial background section from an existing panorama. */
function createSection() {
  return Object.freeze({
    ...TUTORIAL_LEVEL_CONFIG.section,
    backgroundLayers: Object.freeze([Object.freeze({
      source: getAssetPath(
        "backgrounds", "scrapyard-machine-graveyard-background-v1.png",
      ),
      frameWidth: 1024, frameHeight: 1536, scrollRate: 1,
    })]),
  });
}

/** Creates fresh platform entities for every tutorial run. */
function createPlatforms() {
  return Object.freeze(TUTORIAL_PLATFORM_DEFINITIONS.map(createPlatform));
}

/**
 * Creates one platform with its existing production sprite.
 * @param {object} definition Immutable source definition used to create the entity.
 */
function createPlatform(definition) {
  if (definition.mechanic) {
    return new MechanicPlatformBuilder().create(definition);
  }
  const sprite = definition.platformRole === "floor"
    ? getStartFloorSpriteConfig()
    : getScrapyardPrototypePlatformSpriteConfig(definition.platformRole);
  return new SpriteSurfacePlatform(definition, sprite);
}
