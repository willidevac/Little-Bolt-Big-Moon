import { ScreenController } from "../../classes/ui/screen-controller.class.js";
import { StorySequenceController } from "../../classes/ui/story-sequence-controller.class.js";

/**
 * Initializes screen control.
 * @param {import("../../classes/core/game.class.js").Game} game Active game instance coordinated by the controller.
 * @returns {ScreenController}
 */
export function initializeScreens(game) {
  const root = document.querySelector("[data-game-root]");
  if (!(root instanceof HTMLElement)) {
    throw new Error("Der Spielbereich wurde nicht gefunden.");
  }
  return createControllers(game, root);
}

/**
 * Creates controllers.
 * @param {object} game Active game instance coordinated by the controller.
 * @param {HTMLElement} root Root element queried for the relevant interface controls.
 */
function createControllers(game, root) {
  const storySequenceController = new StorySequenceController(game, root);
  const screenController = new ScreenController(
    game,
    root,
    storySequenceController,
  ).initialize();
  storySequenceController.initialize();
  return screenController;
}
