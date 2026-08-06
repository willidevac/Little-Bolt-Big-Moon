import { TutorialPromptController } from
  "../../classes/ui/tutorial-prompt-controller.class.js";

/**
 * Initializes the public tutorial lesson prompt.
 * @param {object} director Tutorial director supplying the current lesson.
 */
export function initializeTutorialPrompt(director) {
  const root = document.querySelector("[data-tutorial-prompt]");
  if (!(root instanceof HTMLElement)) {
    throw new Error("Die Tutorial-Anzeige wurde nicht gefunden.");
  }
  return new TutorialPromptController(director, root).initialize();
}
