import { StatusBar } from "../../classes/ui/status-bar.class.js";

/**
 * Initializes the game HUD.
 * @param {import("../../classes/core/game.class.js").Game} game Active game instance coordinated by the controller.
 * @returns {StatusBar}
 */
export function initializeHud(game) {
  const root = document.querySelector("[data-game-hud]");
  if (!(root instanceof HTMLElement)) {
    throw new Error("Das Spiel-HUD wurde nicht gefunden.");
  }
  return new StatusBar(game, root).initialize();
}
