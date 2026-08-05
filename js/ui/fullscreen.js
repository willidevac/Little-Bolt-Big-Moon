import {
  FullscreenController,
} from "../../classes/ui/fullscreen-controller.class.js";

/** Creates the fullscreen controller. */
export function initializeFullscreen(root = document.querySelector("[data-game-root]")) {
  const button = root?.querySelector("[data-fullscreen-toggle]");
  if (!(root instanceof HTMLElement) || !(button instanceof HTMLButtonElement)) {
    throw new Error("Die Vollbildsteuerung ist unvollständig.");
  }
  return new FullscreenController(document, root, button).initialize();
}
