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
  TUTORIAL_PLATFORM_DEFINITIONS,
  TUTORIAL_COMBAT_ENEMY_DEFINITIONS,
  TUTORIAL_COMBAT_PROFILES,
  TUTORIAL_COMBAT_ZONE_DEFINITION,
  TUTORIAL_PRACTICE_TARGET_DEFINITION,
  TUTORIAL_PRACTICE_TARGET_PROFILE,
  TUTORIAL_WEAPON_PICKUP_DEFINITION,
} from "../config/tutorial-level-config.js";

/** Creates the compact production tutorial with the regular level contract. */
export function createTutorialLevel(enemyConfig = GAME_CONFIG.enemies) {
  const sections = Object.freeze([createSection()]);
  const platforms = createPlatforms();
  const training = createTrainingContent(platforms, enemyConfig);
  return createLevelResult(sections, platforms, training);
}

/** Creates the immutable regular level contract. */
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

/** Creates the weapon pickup and its harmless production target. */
function createTrainingContent(platforms, enemyConfig) {
  const anchor = platforms.find(({ id }) => {
    return id === TUTORIAL_WEAPON_PICKUP_DEFINITION.anchorPlatformId;
  });
  if (!anchor) throw new RangeError("Der Tutorial-Kampfbereich fehlt.");
  const combatEnemies = createCombatEnemies(enemyConfig);
  return Object.freeze({
    collectables: Object.freeze([createWeaponPickup(anchor)]),
    enemies: Object.freeze([
      createPracticeTarget(anchor, enemyConfig), ...combatEnemies,
    ]),
    combatZones: Object.freeze([new CombatZone(TUTORIAL_COMBAT_ZONE_DEFINITION)]),
  });
}

/** Creates the regular anchored bolt-thrower pickup. */
function createWeaponPickup(anchor) {
  return new AnchoredCollectable(TUTORIAL_WEAPON_PICKUP_DEFINITION, anchor);
}

/** Creates a passive crawler that uses regular projectile hit handling. */
function createPracticeTarget(anchor, enemyConfig) {
  const profile = Object.freeze({
    ...enemyConfig.scrapCrawler, ...TUTORIAL_PRACTICE_TARGET_PROFILE,
  });
  const target = new ScrapCrawler(TUTORIAL_PRACTICE_TARGET_DEFINITION, profile);
  target.anchorPlatformId = anchor.id;
  target.y = anchor.y - target.height;
  return target;
}

/** Creates the mild crawler and drone through their production classes. */
function createCombatEnemies(enemyConfig) {
  const enemyClasses = { scrapCrawler: ScrapCrawler, droneGuard: DroneGuard };
  return TUTORIAL_COMBAT_ENEMY_DEFINITIONS.map((definition) => {
    const EnemyClass = enemyClasses[definition.type];
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

/** Creates one platform with its existing production sprite. */
function createPlatform(definition) {
  if (definition.mechanic) {
    return new MechanicPlatformBuilder().create(definition);
  }
  const sprite = definition.platformRole === "floor"
    ? getStartFloorSpriteConfig()
    : getScrapyardPrototypePlatformSpriteConfig(definition.platformRole);
  return new SpriteSurfacePlatform(definition, sprite);
}
