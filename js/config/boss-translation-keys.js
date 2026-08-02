export const BOSS_TRANSLATION_KEYS = Object.freeze({
  Zwischenboss: "boss.default",
  Schrottbrecher: "boss.scrapCrusher",
  "Presswerk-Koloss": "boss.pressworksColossus",
  "Startturm-Sentinel": "boss.launchTowerSentinel",
  "Orbit-Hüter": "boss.orbitGuardian",
  Mondwächter: "boss.moonWarden",
});

/**
 * Liefert für einen sichtbaren Bossnamen den stabilen Übersetzungsschlüssel.
 * @param {string} name
 * @returns {string}
 */
export function getBossTranslationKey(name) {
  return BOSS_TRANSLATION_KEYS[name] ?? "boss.default";
}
