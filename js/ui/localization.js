import { LocalizationController } from "../../classes/ui/localization-controller.class.js";

/**
 * Connects the central localization system to the interface.
 * @param {import("../../classes/systems/game-storage.class.js").GameStorage} storage
 * @param {HTMLElement} [root=document.body]
 * @returns {LocalizationController}
 */
export function initializeLocalization(storage, root = document.body) {
  return new LocalizationController(storage, root).initialize();
}
