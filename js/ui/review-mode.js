import { ReviewModeController } from "../../classes/ui/review-mode-controller.class.js";
import { REVIEW_MODE_CONFIG } from "../config/review-mode-config.js";

let reviewModeController = null;

/** Initialisiert den versteckten Mentor-Review-Modus genau einmal. */
export function initializeReviewMode(game, root = document.querySelector("[data-game-root]")) {
  if (reviewModeController) return reviewModeController;
  if (!(root instanceof HTMLElement)) {
    throw new Error("Der Spielbereich für den Review-Modus wurde nicht gefunden.");
  }
  reviewModeController = new ReviewModeController(
    game, root, REVIEW_MODE_CONFIG,
  ).initialize();
  return reviewModeController;
}
