import { GameStorage } from "../../classes/systems/game-storage.class.js";
import { StorageController } from "../../classes/ui/storage-controller.class.js";
import { GAME_CONFIG } from "../config/game-config.js";

/**
 * Returns browser storage when the browser permits access.
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
 * Creates storage for records and settings.
 * @param {Storage|null} [storage]
 * @returns {GameStorage}
 */
export function createGameStorage(storage = getBrowserStorage()) {
  return new GameStorage(storage, GAME_CONFIG.storage);
}

/**
 * Connects local records and settings to the game.
 * @param {import("../../classes/core/game.class.js").Game} game
 * @param {import("../../classes/systems/game-audio-controller.class.js").GameAudioController} audio
 * @param {HTMLElement} [root=document.body]
 * @returns {StorageController}
 */
export function initializeStorage(
  game, audio, root = document.body, storage = createGameStorage(),
) {
  return new StorageController(game, storage, audio, root).initialize();
}
