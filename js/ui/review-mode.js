import { ReviewModeController } from "../../classes/ui/review-mode-controller.class.js";
import { REVIEW_MODE_CONFIG } from "../config/review-mode-config.js";

/**
 * Initializes the hidden mentor review mode.
 * @param {object} game Active game instance coordinated by the controller.
 * @param {HTMLElement} [root=document.querySelector("[data-game-root]")] Root element queried for the relevant interface controls.
 */
export function initializeReviewMode(game, root = document.querySelector("[data-game-root]")) {
  if (!(root instanceof HTMLElement)) {
    throw new Error("Der Spielbereich für den Review-Modus wurde nicht gefunden.");
  }
  return new ReviewModeController(
    game, root, REVIEW_MODE_CONFIG,
  ).initialize();
}
