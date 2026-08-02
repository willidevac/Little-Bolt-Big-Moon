import levelData from "../../data/levels/level-01.json" with { type: "json" };
import { Platform } from "../../classes/environment/platform.class.js";
import { MovingPlatform } from "../../classes/environment/moving-platform.class.js";
import { FallingPlatform } from "../../classes/environment/falling-platform.class.js";
import {
  COLLECTABLE_TYPES,
} from "../../classes/entities/collectables/collectable-object.class.js";
import { StoryBadge } from "../../classes/entities/collectables/story-badge.class.js";
import { AnchoredCollectable } from
  "../../classes/entities/collectables/anchored-collectable.class.js";
import { DamageZone } from "../../classes/environment/damage-zone.class.js";
import { CombatZone } from "../../classes/environment/combat-zone.class.js";
import { StoryProp } from "../../classes/environment/story-prop.class.js";
import { ScrapCrawler } from "../../classes/entities/enemies/scrap-crawler.class.js";
import { DroneGuard } from "../../classes/entities/enemies/drone-guard.class.js";
import { SpringMine } from "../../classes/entities/enemies/spring-mine.class.js";
import { MoonWarden } from "../../classes/entities/enemies/moon-warden.class.js";
import { PlatformRouteBuilder } from "../../classes/systems/platform-route-builder.class.js";
import { getAssetPath } from "../config/asset-paths.js";
import { STORY_PROP_CONFIGS } from "../config/story-prop-config.js";

const ENEMY_CLASSES = Object.freeze({
  scrapCrawler: ScrapCrawler,
  droneGuard: DroneGuard,
  springMine: SpringMine,
  moonWarden: MoonWarden,
});
const TILESET_NAMES = Object.freeze([
  "scrapyard",
  "factory",
  "launch-tower",
  "space-station",
  "moon",
]);
const CLEAN_HD_TILESET_IDS = new Set([
  "scrapyard",
  "factory",
  "launch-tower",
  "space-station",
  "moon",
]);
const TILESET_CONFIGS = Object.freeze(
  Object.fromEntries(TILESET_NAMES.map(createTilesetEntry)),
);
const CLEAN_HD_BACKGROUND_IDS = new Set([
  "scrapyard",
  "factory",
  "launch-tower",
  "space-station",
  "moon",
]);
const CLEAN_HD_BACKGROUND_LAYERS = Object.freeze([
  Object.freeze({ name: "far", scrollRate: 0.72 }),
  Object.freeze({ name: "mid", scrollRate: 0.86 }),
  Object.freeze({ name: "near", scrollRate: 1 }),
]);

function createTilesetEntry(tilesetName) {
  const isCleanHd = CLEAN_HD_TILESET_IDS.has(tilesetName);
  const fileSuffix = isCleanHd ? "-tiles-clean-hd.png" : "-tiles.png";
  return [tilesetName, Object.freeze({
    source: getAssetPath("tilesets", `${tilesetName}${fileSuffix}`),
    frameWidth: isCleanHd ? 64 : 32,
    frameHeight: isCleanHd ? 64 : 32,
    frameCount: 32,
    renderScale: isCleanHd ? 1 : 2,
    surfaceOffset: isCleanHd ? 24 : 12,
  })];
}

/**
 * Creates a new independent instance of the first level section.
 * @param {Readonly<object>} enemyConfig
 * @returns {Readonly<object>}
 */
export function createLevelOne(enemyConfig) {
  validateLevelData(levelData);
  const routeBuilder = new PlatformRouteBuilder(levelData.width);
  const routePlatforms = routeBuilder.build(levelData.sections);
  const platformData = createPlatformPlan(routePlatforms);
  return createLevelData(enemyConfig, platformData);
}

function createPlatformPlan(routePlatforms) {
  const arena = levelData.bossArena;
  const route = routePlatforms.filter((platform) => {
    return platform.y >= arena.replacePlatformsAboveY;
  });
  return Object.freeze([...route, ...arena.platforms.map(Object.freeze)]);
}

function createLevelData(enemyConfig, platformData) {
  return Object.freeze({
    id: levelData.id,
    width: levelData.width,
    height: levelData.height,
    playerStart: Object.freeze({ ...levelData.playerStart }),
    sections: Object.freeze(levelData.sections.map(createSection)),
    ...createLevelEntities(enemyConfig, platformData),
  });
}

function createLevelEntities(enemyConfig, platformData) {
  const platforms = platformData.map(createPlatform);
  return {
    platforms: Object.freeze(platforms),
    collectables: Object.freeze(createCollectables(platforms)),
    storyProps: Object.freeze(createStoryProps(platforms)),
    hazards: Object.freeze(createHazards(platforms)),
    combatZones: Object.freeze(levelData.combatZones.map(createCombatZone)),
    enemies: Object.freeze(createEnemies(enemyConfig)),
  };
}

function createEnemies(enemyConfig) {
  return levelData.enemies.map((enemy) => createEnemy(enemy, enemyConfig));
}

function createCombatZone(zoneData) {
  return new CombatZone(zoneData);
}

function createEnemy(enemyData, enemyConfig) {
  const EnemyClass = ENEMY_CLASSES[enemyData.type];
  const config = createEnemyConfig(enemyData, enemyConfig);
  if (!EnemyClass || !config) {
    throw new RangeError(`Unbekannter Gegnertyp: ${enemyData.type}`);
  }
  return new EnemyClass(enemyData, config);
}

function createEnemyConfig(enemyData, enemyConfig) {
  const baseConfig = enemyConfig?.[enemyData.type];
  if (!baseConfig) return null;
  const overrides = enemyData.combat ?? {};
  if (!overrides || typeof overrides !== "object" || Array.isArray(overrides)) {
    throw new TypeError(`Ungültige Kampfwerte: ${enemyData.id}`);
  }
  return Object.freeze({ ...baseConfig, ...overrides });
}

function createCollectables(platforms) {
  return levelData.collectables.map((data) => createCollectable(data, platforms));
}

function createCollectable(collectableData, platforms) {
  const anchor = findPlatform(platforms, collectableData.anchorPlatformId);
  const CollectableClass = collectableData.type === COLLECTABLE_TYPES.STORY_BADGE
    ? StoryBadge
    : AnchoredCollectable;
  return new CollectableClass(collectableData, anchor);
}

function createStoryProps(platforms) {
  return levelData.storyProps.map((data) => createStoryProp(data, platforms));
}

function createStoryProp(propData, platforms) {
  const config = STORY_PROP_CONFIGS[propData.type];
  const anchor = findPlatform(platforms, propData.anchorPlatformId);
  if (config) return new StoryProp(propData, config, anchor);
  throw new RangeError(`Unbekanntes Storyobjekt: ${propData.type}`);
}

function findPlatform(platforms, platformId) {
  return platforms.find(({ id }) => id === platformId);
}

function createHazards(platforms) {
  return levelData.hazards.map((data) => createHazard(data, platforms));
}

function createHazard(hazardData, platforms) {
  const anchor = findPlatform(platforms, hazardData.anchorPlatformId);
  return new DamageZone(hazardData, anchor);
}

function createPlatform(platformData) {
  const platformType = levelData.platformTypes[platformData.type];
  if (!platformType) {
    throw new RangeError(`Unbekannter Plattformtyp: ${platformData.type}`);
  }
  const resolvedData = { ...platformType, ...platformData };
  const tilesetConfig = TILESET_CONFIGS[resolvedData.tileset];
  if (!tilesetConfig) {
    throw new RangeError(`Unbekanntes Plattform-Tileset: ${resolvedData.tileset}`);
  }
  const PlatformClass = getPlatformClass(resolvedData);
  return new PlatformClass(resolvedData, tilesetConfig);
}

function getPlatformClass(platformData) {
  if (platformData.movement) return MovingPlatform;
  if (platformData.fall) return FallingPlatform;
  return Platform;
}

function createSection(sectionData) {
  const backgroundLayers = CLEAN_HD_BACKGROUND_IDS.has(sectionData.backgroundId)
    ? createCleanHdBackgroundLayers(sectionData.backgroundId)
    : createRoomBackgroundLayer(sectionData.id);
  return Object.freeze({
    ...sectionData,
    backgroundLayers,
  });
}

function createCleanHdBackgroundLayers(backgroundId) {
  return Object.freeze(CLEAN_HD_BACKGROUND_LAYERS.map((layer) => {
    return Object.freeze({
      source: getAssetPath(
        "backgrounds",
        `${backgroundId}-${layer.name}-clean-hd.png`,
      ),
      frameWidth: 1024,
      frameHeight: 1536,
      scrollRate: layer.scrollRate,
    });
  }));
}

function createRoomBackgroundLayer(sectionId) {
  return Object.freeze([Object.freeze({
    source: getAssetPath(
      "backgrounds",
      `${sectionId}-background-v1.png`,
    ),
    frameWidth: 1024,
    frameHeight: 1536,
    scrollRate: 1,
  })]);
}

function validateLevelData(data) {
  const hasSize = Number.isFinite(data?.width) && Number.isFinite(data?.height);
  const hasStart = Number.isFinite(data?.playerStart?.x) &&
    Number.isFinite(data?.playerStart?.y);
  if (typeof data?.id === "string" && hasSize && hasStart &&
    hasValidCollections(data)) return;
  throw new TypeError("Die Leveldaten sind unvollständig oder ungültig.");
}

function hasValidCollections(data) {
  const hasCollections = Array.isArray(data?.sections) &&
    Array.isArray(data?.collectables) &&
    Array.isArray(data?.storyProps) &&
    Array.isArray(data?.hazards) &&
    Array.isArray(data?.combatZones) &&
    Array.isArray(data?.enemies) &&
    data.sections.every((section) => section?.route) &&
    hasValidBossArena(data.bossArena) &&
    data?.platformTypes &&
    typeof data.platformTypes === "object";
  return hasCollections;
}

function hasValidBossArena(arena) {
  const hasBoundary = Number.isFinite(arena?.replacePlatformsAboveY);
  const hasPlatforms = Array.isArray(arena?.platforms) &&
    arena.platforms.length >= 3;
  return hasBoundary && hasPlatforms;
}
