import { GameStorage } from "../../classes/systems/game-storage.class.js";
import { StorageController } from "../../classes/ui/storage-controller.class.js";
import { GAME_CONFIG } from "../config/game-config.js";

let storageController = null;
let gameStorage = null;

/**
 * Liefert den Browserspeicher, falls der Browser seinen Zugriff erlaubt.
 * @returns {Storage|null}
 */
function getBrowserStorage() {
  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
}

/**
 * Erstellt genau einen gemeinsamen Speicher für Rekorde und Einstellungen.
 * @returns {GameStorage}
 */
export function getGameStorage() {
  if (!gameStorage) {
    gameStorage = new GameStorage(getBrowserStorage(), GAME_CONFIG.storage);
  }
  return gameStorage;
}

/**
 * Verbindet lokale Rekorde und Einstellungen genau einmal mit dem Spiel.
 * @param {import("../../classes/core/game.class.js").Game} game
 * @param {import("../../classes/systems/game-audio-controller.class.js").GameAudioController} audio
 * @param {HTMLElement} [root=document.body]
 * @returns {StorageController}
 */
export function initializeStorage(
  game, audio, root = document.body, storage = getGameStorage(),
) {
  if (storageController) return storageController;
  storageController = new StorageController(game, storage, audio, root).initialize();
  return storageController;
}
