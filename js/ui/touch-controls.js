import { TouchControls } from "../../classes/input/touch-controls.class.js";

let touchControls = null;

/**
 * Creates and binds the mobile controls exactly once.
 * @param {import("../../classes/core/game.class.js").Game} game
 * @param {HTMLElement} [root=document.querySelector("[data-game-root]")]
 * @returns {TouchControls}
 */
export function initializeTouchControls(
  game,
  root = document.querySelector("[data-game-root]"),
) {
  if (touchControls) return touchControls;
  if (!(root instanceof HTMLElement)) {
    throw new Error("Der Spielbereich für TouchControls wurde nicht gefunden.");
  }
  touchControls = new TouchControls(game, root).initialize();
  return touchControls;
}
