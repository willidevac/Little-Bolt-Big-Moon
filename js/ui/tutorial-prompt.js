import { TutorialPromptController } from
  "../../classes/ui/tutorial-prompt-controller.class.js";

/** Initializes the public tutorial lesson prompt. */
export function initializeTutorialPrompt(director) {
  const root = document.querySelector("[data-tutorial-prompt]");
  if (!(root instanceof HTMLElement)) {
    throw new Error("Die Tutorial-Anzeige wurde nicht gefunden.");
  }
  return new TutorialPromptController(director, root).initialize();
}
