import levelData from "../../data/levels/level-01.json" with { type: "json" };
import { Platform } from "../../classes/environment/platform.class.js";
import { MovingPlatform } from "../../classes/environment/moving-platform.class.js";
import { FallingPlatform } from "../../classes/environment/falling-platform.class.js";
import { CollectableObject } from "../../classes/entities/collectables/collectable-object.class.js";
import { DamageZone } from "../../classes/environment/damage-zone.class.js";
import { CombatZone } from "../../classes/environment/combat-zone.class.js";
import { StoryProp } from "../../classes/environment/story-prop.class.js";
import { ScrapCrawler } from "../../classes/entities/enemies/scrap-crawler.class.js";
import { DroneGuard } from "../../classes/entities/enemies/drone-guard.class.js";
import { MoonWarden } from "../../classes/entities/enemies/moon-warden.class.js";
import { PlatformRouteBuilder } from "../../classes/systems/platform-route-builder.class.js";
import { getAssetPath } from "../config/asset-paths.js";
import { STORY_PROP_CONFIGS } from "../config/story-prop-config.js";

const ENEMY_CLASSES = Object.freeze({
  scrapCrawler: ScrapCrawler,
  droneGuard: DroneGuard,
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
 * Erzeugt eine neue, unabhängige Instanz des ersten Levelabschnitts.
 * @param {Readonly<object>} enemyConfig
 * @returns {Readonly<object>}
 */
export function createLevelOne(enemyConfig) {
  validateLevelData(levelData);
  const routeBuilder = new PlatformRouteBuilder(levelData.width);
  const platformData = routeBuilder.build(levelData.sections);
  return createLevelData(enemyConfig, platformData);
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
  return {
    platforms: Object.freeze(platformData.map(createPlatform)),
    collectables: Object.freeze(levelData.collectables.map(createCollectable)),
    storyProps: Object.freeze(levelData.storyProps.map(createStoryProp)),
    hazards: Object.freeze(levelData.hazards.map(createHazard)),
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

function createCollectable(collectableData) {
  return new CollectableObject(collectableData);
}

function createStoryProp(propData) {
  const config = STORY_PROP_CONFIGS[propData.type];
  if (config) return new StoryProp(propData, config);
  throw new RangeError(`Unbekanntes Storyobjekt: ${propData.type}`);
}

function createHazard(hazardData) {
  return new DamageZone(hazardData);
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
    data?.platformTypes &&
    typeof data.platformTypes === "object";
  return hasCollections;
}
