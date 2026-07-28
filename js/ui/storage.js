import { GameStorage } from "../../classes/systems/game-storage.class.js";
import { StorageController } from "../../classes/ui/storage-controller.class.js";
import { GAME_CONFIG } from "../config/game-config.js";

let storageController = null;

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
 * Verbindet lokale Rekorde und Einstellungen genau einmal mit dem Spiel.
 * @param {import("../../classes/core/game.class.js").Game} game
 * @param {import("../../classes/systems/game-audio-controller.class.js").GameAudioController} audio
 * @param {HTMLElement} [root=document.body]
 * @returns {StorageController}
 */
export function initializeStorage(game, audio, root = document.body) {
  if (storageController) return storageController;
  const storage = new GameStorage(getBrowserStorage(), GAME_CONFIG.storage);
  storageController = new StorageController(game, storage, audio, root).initialize();
  return storageController;
}
