import { LocalizationController } from "../../classes/ui/localization-controller.class.js";

let localizationController = null;

/**
 * Connects the central localization system to the interface exactly once.
 * @param {import("../../classes/systems/game-storage.class.js").GameStorage} storage
 * @param {HTMLElement} [root=document.body]
 * @returns {LocalizationController}
 */
export function initializeLocalization(storage, root = document.body) {
  if (localizationController) return localizationController;
  localizationController = new LocalizationController(storage, root).initialize();
  return localizationController;
}
