const BIOME_KEY_BY_BOSS_ZONE = Object.freeze({
  "scrapyard-biome-boss": "biome.factory",
  "factory-biome-boss": "biome.launchTower",
  "launch-tower-biome-boss": "biome.spaceStation",
  "space-station-biome-boss": "biome.moon",
});

/**
 * Returns the translation key for the biome opened by an intermediate boss.
 * @param {string} zoneId Boss-zone identifier that unlocks a biome.
 * @returns {string|null}
 */
export function getBiomeArrivalTranslationKey(zoneId) {
  if (typeof zoneId !== "string") return null;
  return BIOME_KEY_BY_BOSS_ZONE[zoneId] ?? null;
}
