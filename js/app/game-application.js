import { createGame } from "./create-game.js";
import { GAME_CONFIG } from "../config/game-config.js";
import { initializeScreens } from "../ui/screens.js";
import { initializeHud } from "../ui/hud.js";
import { createGameStorage, initializeStorage } from "../ui/storage.js";
import { initializeLocalization } from "../ui/localization.js";
import { initializeTouchControls } from "../ui/touch-controls.js";
import { initializeAudio } from "../ui/audio.js";
import { initializeReviewMode } from "../ui/review-mode.js";
import { initializeFullscreen } from "../ui/fullscreen.js";
import { loadHtmlFragments } from "../ui/html-fragments.js";
import { initializeTutorialDirector } from
  "../factories/tutorial-director.js";
import { initializeTutorialMovementTracker } from
  "../factories/tutorial-movement-tracker.js";
import { initializeTutorialMechanicsTracker } from
  "../factories/tutorial-mechanics-tracker.js";
import { initializeTutorialCombatBasicsTracker } from
  "../factories/tutorial-combat-basics-tracker.js";
import { initializeTutorialPrompt } from "../ui/tutorial-prompt.js";

/**
 * Loads the interface and creates the complete browser application.
 * @returns {Promise<Readonly<{
 *   game: import("../../classes/core/game.class.js").Game,
 *   destroy: () => boolean
 * }>>}
 */
export async function createGameApplication() {
  await loadHtmlFragments();
  const canvas = configureCanvas(getGameCanvas());
  const storage = createGameStorage();
  const localization = initializeLocalization(storage);
  const game = createGame(canvas, GAME_CONFIG);
  game.initialize();
  const audio = initializeAudio(game);
  const controllers = createControllers(game, audio, storage, localization);
  return createApplicationResult(game, controllers);
}

/** Initializes canvas. */
function configureCanvas(canvas) {
  canvas.width = GAME_CONFIG.canvas.width;
  canvas.height = GAME_CONFIG.canvas.height;
  return canvas;
}

/** Creates controllers. */
function createControllers(game, audio, storage, localization) {
  const tutorial = initializeTutorialDirector(game);
  const movement = initializeTutorialMovementTracker(game, tutorial);
  const mechanics = initializeTutorialMechanicsTracker(game, tutorial);
  const combatBasics = initializeTutorialCombatBasicsTracker(game, tutorial);
  return [
    localization, audio, tutorial, movement, mechanics, combatBasics,
    initializeTutorialPrompt(tutorial),
    initializeScreens(game), initializeHud(game),
    initializeStorage(game, audio, document.body, storage),
    initializeTouchControls(game), initializeReviewMode(game),
    initializeFullscreen(),
  ];
}

/** Creates application result. */
function createApplicationResult(game, controllers) {
  let isDestroyed = false;
  return Object.freeze({
    game,
    /** Destroys the application. */
    destroy() {
      if (isDestroyed) return false;
      [...controllers].reverse().forEach((controller) => controller.destroy?.());
      game.destroy();
      isDestroyed = true;
      return true;
    },
  });
}

/** Returns game canvas. */
function getGameCanvas() {
  const canvas = document.querySelector("[data-game-canvas]");
  if (canvas instanceof HTMLCanvasElement) return canvas;
  throw new Error("Das Spiel-Canvas wurde nicht gefunden.");
}
