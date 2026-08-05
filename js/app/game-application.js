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

/**
 * Loads the interface and creates the complete browser application.
 * @returns {Promise<Readonly<{
 *   game: import("../../classes/core/game.class.js").Game,
 *   destroy: () => boolean
 * }>>}
 */
export async function createGameApplication() {
  await loadHtmlFragments();
  const canvas = getGameCanvas();
  canvas.width = GAME_CONFIG.canvas.width;
  canvas.height = GAME_CONFIG.canvas.height;

  const storage = createGameStorage();
  const localization = initializeLocalization(storage);
  const game = createGame(canvas, GAME_CONFIG);
  game.initialize();
  const audio = initializeAudio(game);
  const controllers = [
    localization,
    audio,
    initializeScreens(game),
    initializeHud(game),
    initializeStorage(game, audio, document.body, storage),
    initializeTouchControls(game),
    initializeReviewMode(game),
    initializeFullscreen(),
  ];
  let isDestroyed = false;

  return Object.freeze({
    game,
    destroy() {
      if (isDestroyed) return false;
      [...controllers].reverse().forEach((controller) => controller.destroy?.());
      game.destroy();
      isDestroyed = true;
      return true;
    },
  });
}

function getGameCanvas() {
  const canvas = document.querySelector("[data-game-canvas]");
  if (canvas instanceof HTMLCanvasElement) return canvas;
  throw new Error("Das Spiel-Canvas wurde nicht gefunden.");
}
