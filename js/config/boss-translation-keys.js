export const BOSS_TRANSLATION_KEYS = Object.freeze({
  Zwischenboss: "boss.default",
  Schrottbrecher: "boss.scrapCrusher",
  "Presswerk-Koloss": "boss.pressworksColossus",
  "Startturm-Sentinel": "boss.launchTowerSentinel",
  "Orbit-Hüter": "boss.orbitGuardian",
  Mondwächter: "boss.moonWarden",
});

/**
 * Returns the stable translation key for a visible boss name.
 * @param {string} name Visible boss name to resolve.
 * @returns {string}
 */
export function getBossTranslationKey(name) {
  return BOSS_TRANSLATION_KEYS[name] ?? "boss.default";
}
