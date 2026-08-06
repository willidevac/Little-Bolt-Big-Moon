import { TutorialCompletionController } from
  "../../classes/ui/tutorial-completion-controller.class.js";

/** Connects tutorial completion to storage, game state, and menu emphasis. */
export function initializeTutorialCompletion(game, director, storage) {
  const root = document.querySelector("[data-game-root]");
  if (!(root instanceof HTMLElement)) {
    throw new Error("Der Spielbereich wurde nicht gefunden.");
  }
  return new TutorialCompletionController(
    game, director, storage, root,
  ).initialize();
}
