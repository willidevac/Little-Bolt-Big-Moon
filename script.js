import { Game } from "./classes/core/game.class.js";
import { GAME_CONFIG } from "./js/config/game-config.js";
import { initializeScreens } from "./js/ui/screens.js";
import { initializeHud } from "./js/ui/hud.js";
import { getGameStorage, initializeStorage } from "./js/ui/storage.js";
import { initializeLocalization } from "./js/ui/localization.js";
import { initializeTouchControls } from "./js/ui/touch-controls.js";
import { initializeAudio } from "./js/ui/audio.js";
import { initializeReviewMode } from "./js/ui/review-mode.js";
import { initializeFullscreen } from "./js/ui/fullscreen.js";
import { loadHtmlFragments } from "./js/ui/html-fragments.js";

let gameInstance = null;

/**
 * Returns the authoritative game canvas.
 * @returns {HTMLCanvasElement}
 */
function getGameCanvas() {
  const canvas = document.querySelector("[data-game-canvas]");
  if (canvas instanceof HTMLCanvasElement) return canvas;
  throw new Error("Das Spiel-Canvas wurde nicht gefunden.");
}

/**
 * Applies the fixed internal canvas resolution from the configuration.
 * @param {HTMLCanvasElement} canvas
 */
function configureCanvas(canvas) {
  canvas.width = GAME_CONFIG.canvas.width;
  canvas.height = GAME_CONFIG.canvas.height;
}

/**
 * Creates and initializes exactly one Game instance.
 * @returns {Game}
 */
export function initializeGame() {
  if (gameInstance) return gameInstance;
  const canvas = getGameCanvas();
  configureCanvas(canvas);
  gameInstance = new Game(canvas, GAME_CONFIG);
  gameInstance.initialize();
  return gameInstance;
}

/**
 * Returns the currently used Game instance.
 * @returns {Game|null}
 */
export function getGame() {
  return gameInstance;
}

await loadHtmlFragments();
const storage = getGameStorage();
initializeLocalization(storage);
const game = initializeGame();
const audio = initializeAudio(game);
initializeScreens(game);
initializeHud(game);
initializeStorage(game, audio, document.body, storage);
initializeTouchControls(game);
initializeReviewMode(game);
initializeFullscreen();
globalThis.littleBoltGame = game;
