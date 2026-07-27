/**
 * Kapselt die rein technische Einrichtung der Canvas-Zeichenfläche.
 */
export class GameCanvas {
  /**
   * @param {HTMLCanvasElement} canvas
   */
  constructor(canvas) {
    const context = canvas?.getContext?.("2d");
    if (!context) {
      throw new Error("Der 2D-Canvas-Kontext ist nicht verfügbar.");
    }
    this.element = canvas;
    this.context = context;
    this.context.imageSmoothingEnabled = false;
  }

  /**
   * Leert die vollständige Spielfläche.
   */
  clear() {
    this.context.clearRect(0, 0, this.element.width, this.element.height);
  }

  /**
   * Spiegelt den Loopzustand für UI und Tests am Canvas.
   * @param {"running"|"paused"|"stopped"} state
   */
  setLoopState(state) {
    this.element.dataset.gameLoopState = state;
  }
}
