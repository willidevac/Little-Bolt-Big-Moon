/**
 * Encapsulates the technical setup of the canvas drawing surface.
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
   * Clears the entire game surface.
   */
  clear() {
    this.context.clearRect(0, 0, this.element.width, this.element.height);
  }

  /**
   * Mirrors the loop state on the canvas for the UI and tests.
   * @param {"running"|"paused"|"stopped"} state
   */
  setLoopState(state) {
    this.element.dataset.gameLoopState = state;
  }
}
