import { ScreenController } from "../../classes/ui/screen-controller.class.js";

let screenController = null;

/**
 * Initialisiert die Bildschirmsteuerung genau einmal.
 * @param {import("../../classes/core/game.class.js").Game} game
 * @returns {ScreenController}
 */
export function initializeScreens(game) {
  if (screenController) return screenController;
  const root = document.querySelector("[data-game-root]");
  if (!(root instanceof HTMLElement)) {
    throw new Error("Der Spielbereich wurde nicht gefunden.");
  }
  screenController = new ScreenController(game, root).initialize();
  return screenController;
}
