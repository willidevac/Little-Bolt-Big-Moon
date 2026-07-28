import levelData from "../../data/levels/level-01.json" with { type: "json" };
import { Platform } from "../../classes/environment/platform.class.js";
import { MovingPlatform } from "../../classes/environment/moving-platform.class.js";
import { CollectableObject } from "../../classes/entities/collectables/collectable-object.class.js";
import { DamageZone } from "../../classes/environment/damage-zone.class.js";
import { CombatZone } from "../../classes/environment/combat-zone.class.js";
import { ScrapCrawler } from "../../classes/entities/enemies/scrap-crawler.class.js";
import { DroneGuard } from "../../classes/entities/enemies/drone-guard.class.js";
import { MoonWarden } from "../../classes/entities/enemies/moon-warden.class.js";
import { PlatformRouteBuilder } from "../../classes/systems/platform-route-builder.class.js";
import { getAssetPath } from "../config/asset-paths.js";

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
const TILESET_CONFIGS = Object.freeze(
  Object.fromEntries(TILESET_NAMES.map((tilesetName) => {
    return [tilesetName, Object.freeze({
      source: getAssetPath("tilesets", `${tilesetName}-tiles.png`),
      frameWidth: 32,
      frameHeight: 32,
      frameCount: 32,
      renderScale: 2,
      surfaceOffset: 12,
    })];
  })),
);

/**
 * Erzeugt eine neue, unabhängige Instanz des ersten Levelabschnitts.
 * @param {Readonly<object>} enemyConfig
 * @returns {Readonly<object>}
 */
export function createLevelOne(enemyConfig) {
  validateLevelData(levelData);
  const routeBuilder = new PlatformRouteBuilder(levelData.width);
  const platformData = routeBuilder.build(levelData.sections);
  return Object.freeze({
    id: levelData.id,
    width: levelData.width,
    height: levelData.height,
    playerStart: Object.freeze({ ...levelData.playerStart }),
    sections: Object.freeze(levelData.sections.map(createSection)),
    platforms: Object.freeze(platformData.map(createPlatform)),
    collectables: Object.freeze(levelData.collectables.map(createCollectable)),
    hazards: Object.freeze(levelData.hazards.map(createHazard)),
    combatZones: Object.freeze(levelData.combatZones.map(createCombatZone)),
    enemies: Object.freeze(levelData.enemies.map((enemy) => {
      return createEnemy(enemy, enemyConfig);
    })),
  });
}

function createCombatZone(zoneData) {
  return new CombatZone(zoneData);
}

function createEnemy(enemyData, enemyConfig) {
  const EnemyClass = ENEMY_CLASSES[enemyData.type];
  const config = enemyConfig?.[enemyData.type];
  if (!EnemyClass || !config) {
    throw new RangeError(`Unbekannter Gegnertyp: ${enemyData.type}`);
  }
  return new EnemyClass(enemyData, config);
}

function createCollectable(collectableData) {
  return new CollectableObject(collectableData);
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
  const PlatformClass = resolvedData.movement ? MovingPlatform : Platform;
  return new PlatformClass(resolvedData, tilesetConfig);
}

function createSection(sectionData) {
  const backgroundLayers = [Object.freeze({
    source: getAssetPath(
      "backgrounds",
      `${sectionData.backgroundId}-panorama-v2.png`,
    ),
    frameWidth: 1024,
    frameHeight: 1536,
  })];
  return Object.freeze({
    ...sectionData,
    backgroundLayers: Object.freeze(backgroundLayers),
  });
}

function validateLevelData(data) {
  const hasSize = Number.isFinite(data?.width) && Number.isFinite(data?.height);
  const hasStart = Number.isFinite(data?.playerStart?.x) &&
    Number.isFinite(data?.playerStart?.y);
  const hasCollections = Array.isArray(data?.sections) &&
    Array.isArray(data?.collectables) &&
    Array.isArray(data?.hazards) &&
    Array.isArray(data?.combatZones) &&
    Array.isArray(data?.enemies) &&
    data.sections.every((section) => section?.route) &&
    data?.platformTypes &&
    typeof data.platformTypes === "object";
  if (typeof data?.id === "string" && hasSize && hasStart && hasCollections) {
    return;
  }
  throw new TypeError("Die Leveldaten sind unvollständig oder ungültig.");
}
