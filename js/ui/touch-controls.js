import { TouchControls } from "../../classes/input/touch-controls.class.js";

/**
 * Creates and binds the mobile controls.
 * @param {import("../../classes/core/game.class.js").Game} game Active game instance coordinated by the controller.
 * @param {HTMLElement} [root=document.body] Root element queried for the relevant interface controls.
 * @returns {TouchControls}
 */
export function initializeTouchControls(
  game,
  root = document.body,
) {
  if (!(root instanceof HTMLElement)) {
    throw new Error("Der Spielbereich für TouchControls wurde nicht gefunden.");
  }
  return new TouchControls(game, root).initialize();
}
