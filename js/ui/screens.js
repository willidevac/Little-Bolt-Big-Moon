import { ScreenController } from "../../classes/ui/screen-controller.class.js";
import { StorySequenceController } from "../../classes/ui/story-sequence-controller.class.js";

let screenController = null;
let storySequenceController = null;

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
  return createControllers(game, root);
}

function createControllers(game, root) {
  storySequenceController = new StorySequenceController(game, root);
  screenController = new ScreenController(
    game,
    root,
    storySequenceController,
  ).initialize();
  storySequenceController.initialize();
  return screenController;
}
