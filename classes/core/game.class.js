/**
 * Einstiegspunkt für Initialisierung und Lebenszyklus des Spiels.
 */
export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.context = canvas.getContext("2d");
  }

  initialize() {
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}

