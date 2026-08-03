import { getAssetPath } from "./asset-paths.js";

const TILESET_NAMES = Object.freeze([
  "scrapyard", "factory", "launch-tower", "space-station", "moon",
]);

/** Returns the clean-HD tileset used by a biome's small platforms. */
export function getPlatformTilesetConfig(tilesetId) {
  if (!TILESET_NAMES.includes(tilesetId)) {
    throw new RangeError(`Unknown platform tileset: ${tilesetId}`);
  }
  return Object.freeze({
    source: getAssetPath("tilesets", `${tilesetId}-tiles-clean-hd.png`),
    frameWidth: 64,
    frameHeight: 64,
    frameCount: 32,
    renderScale: 1,
    surfaceOffset: 24,
  });
}
