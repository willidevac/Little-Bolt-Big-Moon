import {
  FullscreenController,
} from "../../classes/ui/fullscreen-controller.class.js";

let fullscreenController = null;

/** Erstellt die Vollbildsteuerung genau einmal. */
export function initializeFullscreen(root = document.querySelector("[data-game-root]")) {
  if (fullscreenController) return fullscreenController;
  const button = root?.querySelector("[data-fullscreen-toggle]");
  if (!(root instanceof HTMLElement) || !(button instanceof HTMLButtonElement)) {
    throw new Error("Die Vollbildsteuerung ist unvollstÃ¤ndig.");
  }
  fullscreenController = new FullscreenController(document, root, button).initialize();
  return fullscreenController;
}
