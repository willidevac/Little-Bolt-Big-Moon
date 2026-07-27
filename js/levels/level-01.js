import levelData from "../../data/levels/level-01.json" with { type: "json" };
import { Platform } from "../../classes/environment/platform.class.js";
import { CollectableObject } from "../../classes/entities/collectables/collectable-object.class.js";
import { DamageZone } from "../../classes/environment/damage-zone.class.js";
import { CombatZone } from "../../classes/environment/combat-zone.class.js";
import { ScrapCrawler } from "../../classes/entities/enemies/scrap-crawler.class.js";
import { DroneGuard } from "../../classes/entities/enemies/drone-guard.class.js";
import { MoonWarden } from "../../classes/entities/enemies/moon-warden.class.js";
import { getAssetPath } from "../config/asset-paths.js";

const ENEMY_CLASSES = Object.freeze({
  scrapCrawler: ScrapCrawler,
  droneGuard: DroneGuard,
  moonWarden: MoonWarden,
});
const TILESET_CONFIGS = Object.freeze({
  scrapyard: Object.freeze({
    source: getAssetPath("tilesets", "scrapyard-tiles.png"),
    frameWidth: 32,
    frameHeight: 32,
    frameCount: 32,
    renderScale: 2,
    surfaceOffset: 12,
  }),
});

/**
 * Erzeugt eine neue, unabhängige Instanz des ersten Levelabschnitts.
 * @param {Readonly<object>} enemyConfig
 * @returns {Readonly<object>}
 */
export function createLevelOne(enemyConfig) {
  validateLevelData(levelData);
  return Object.freeze({
    id: levelData.id,
    width: levelData.width,
    height: levelData.height,
    playerStart: Object.freeze({ ...levelData.playerStart }),
    sections: Object.freeze(levelData.sections.map(createSection)),
    platforms: Object.freeze(levelData.platforms.map(createPlatform)),
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
  return new Platform(resolvedData, tilesetConfig);
}

function createSection(sectionData) {
  return Object.freeze({ ...sectionData });
}

function validateLevelData(data) {
  const hasSize = Number.isFinite(data?.width) && Number.isFinite(data?.height);
  const hasStart = Number.isFinite(data?.playerStart?.x) &&
    Number.isFinite(data?.playerStart?.y);
  const hasCollections = Array.isArray(data?.sections) &&
    Array.isArray(data?.platforms) &&
    Array.isArray(data?.collectables) &&
    Array.isArray(data?.hazards) &&
    Array.isArray(data?.combatZones) &&
    Array.isArray(data?.enemies) &&
    data?.platformTypes &&
    typeof data.platformTypes === "object";
  if (typeof data?.id === "string" && hasSize && hasStart && hasCollections) {
    return;
  }
  throw new TypeError("Die Leveldaten sind unvollständig oder ungültig.");
}
