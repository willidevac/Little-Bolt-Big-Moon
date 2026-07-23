import { Game } from "./classes/core/game.class.js";
import { GAME_CONFIG } from "./js/config/game-config.js";

let gameInstance = null;

/**
 * Liefert das verbindliche Canvas des Spiels.
 * @returns {HTMLCanvasElement}
 */
function getGameCanvas() {
  const canvas = document.querySelector("[data-game-canvas]");
  if (canvas instanceof HTMLCanvasElement) return canvas;
  throw new Error("Das Spiel-Canvas wurde nicht gefunden.");
}

/**
 * Übernimmt die feste interne Canvas-Auflösung aus der Konfiguration.
 * @param {HTMLCanvasElement} canvas
 */
function configureCanvas(canvas) {
  canvas.width = GAME_CONFIG.canvasWidth;
  canvas.height = GAME_CONFIG.canvasHeight;
}

/**
 * Erstellt und initialisiert genau eine Game-Instanz.
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
 * Gibt die aktuell verwendete Game-Instanz zurück.
 * @returns {Game|null}
 */
export function getGame() {
  return gameInstance;
}

globalThis.littleBoltGame = initializeGame();
