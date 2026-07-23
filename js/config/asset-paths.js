export const ASSET_PATHS = Object.freeze({
  audio: "./audio",
  backgrounds: "./img/backgrounds",
  characters: "./img/sprites/characters",
  cover: "./img/cover",
  effects: "./img/sprites/effects",
  enemies: "./img/sprites/enemies",
  fonts: "./img/fonts",
  items: "./img/sprites/items",
  props: "./img/sprites/props",
  tilesets: "./img/tilesets",
  ui: "./img/ui",
  weapons: "./img/sprites/weapons",
});

/**
 * Baut einen Assetpfad aus einer bekannten Kategorie und einem Dateinamen.
 * @param {string} category
 * @param {string} fileName
 * @returns {string}
 */
export function getAssetPath(category, fileName) {
  const directory = ASSET_PATHS[category];
  if (!directory) throw new Error(`Unbekannte Assetkategorie: ${category}`);
  if (!fileName || fileName.includes("..")) {
    throw new Error("Der Asset-Dateiname ist ungültig.");
  }
  return `${directory}/${fileName.replace(/^\/+/, "")}`;
}
