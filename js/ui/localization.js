import { LocalizationController } from "../../classes/ui/localization-controller.class.js";

/**
 * Connects the central localization system to the interface.
 * @param {import("../../classes/systems/game-storage.class.js").GameStorage} storage Persistence service used for player settings and progress.
 * @param {HTMLElement} [root=document.body] Root element queried for the relevant interface controls.
 * @returns {LocalizationController}
 */
export function initializeLocalization(storage, root = document.body) {
  return new LocalizationController(storage, root).initialize();
}
