import { DrawableObject } from "./drawable-object.class.js";

/**
 * Grundlage für Objekte mit Geschwindigkeit und Bewegung.
 */
export class MovableObject extends DrawableObject {
  constructor() {
    super();
    this.velocityX = 0;
    this.velocityY = 0;
  }
}

