import { StatusBar } from "../../classes/ui/status-bar.class.js";

let statusBar = null;

/**
 * Initialisiert das Spiel-HUD genau einmal.
 * @param {import("../../classes/core/game.class.js").Game} game
 * @returns {StatusBar}
 */
export function initializeHud(game) {
  if (statusBar) return statusBar;
  const root = document.querySelector("[data-game-hud]");
  if (!(root instanceof HTMLElement)) {
    throw new Error("Das Spiel-HUD wurde nicht gefunden.");
  }
  statusBar = new StatusBar(game, root).initialize();
  return statusBar;
}
