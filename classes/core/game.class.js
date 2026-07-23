/**
 * Einstiegspunkt für Initialisierung und Lebenszyklus des Spiels.
 */
export class Game {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {Readonly<object>} config
   */
  constructor(canvas, config) {
    this.canvas = canvas;
    this.context = canvas.getContext("2d");
    this.config = config;
    this.isInitialized = false;
    this.validateContext();
  }

  /**
   * Initialisiert die Spielfläche höchstens einmal.
   */
  initialize() {
    if (this.isInitialized) return;
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.canvas.dataset.gameState = "initialized";
    this.isInitialized = true;
  }

  /**
   * Bricht kontrolliert ab, falls kein 2D-Kontext verfügbar ist.
   */
  validateContext() {
    if (this.context) return;
    throw new Error("Der 2D-Canvas-Kontext ist nicht verfügbar.");
  }
}
