import levelData from "../../data/levels/level-01.json" with { type: "json" };
import { Platform } from "../../classes/environment/platform.class.js";
import { getAssetPath } from "../config/asset-paths.js";

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
 * @returns {Readonly<object>}
 */
export function createLevelOne() {
  validateLevelData(levelData);
  return Object.freeze({
    id: levelData.id,
    width: levelData.width,
    height: levelData.height,
    playerStart: Object.freeze({ ...levelData.playerStart }),
    platforms: Object.freeze(levelData.platforms.map(createPlatform)),
  });
}

function createPlatform(platformData) {
  const tilesetConfig = TILESET_CONFIGS[platformData.tileset];
  if (!tilesetConfig) {
    throw new RangeError(`Unbekanntes Plattform-Tileset: ${platformData.tileset}`);
  }
  return new Platform(platformData, tilesetConfig);
}

function validateLevelData(data) {
  const hasSize = Number.isFinite(data?.width) && Number.isFinite(data?.height);
  const hasStart = Number.isFinite(data?.playerStart?.x) &&
    Number.isFinite(data?.playerStart?.y);
  if (typeof data?.id === "string" && hasSize && hasStart && Array.isArray(data.platforms)) {
    return;
  }
  throw new TypeError("Die Leveldaten sind unvollständig oder ungültig.");
}
