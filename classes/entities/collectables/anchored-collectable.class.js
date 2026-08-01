import { CollectableObject } from "./collectable-object.class.js";

/**
 * Hält einen Fund sichtbar und physikalisch auf seiner Plattform.
 */
export class AnchoredCollectable extends CollectableObject {
  /**
   * @param {Readonly<object>} data
   * @param {Readonly<object>} anchorPlatform
   */
  constructor(data, anchorPlatform) {
    super(data);
    this.#validateAnchor(data, anchorPlatform);
    this.anchorPlatformId = data.anchorPlatformId;
    this.anchorPlatform = anchorPlatform;
    this.y = anchorPlatform.y - this.height;
  }

  /** Folgt auch einer bewegten oder zurückgesetzten Plattform. */
  update(deltaTimeSeconds) {
    super.update(deltaTimeSeconds);
    const movement = this.anchorPlatform.getFrameDisplacement();
    this.x += movement.x;
    this.y += movement.y;
  }

  /** Unsichtbare Fallplattformen verbergen vorübergehend auch ihren Fund. */
  get isAvailable() {
    return this.anchorPlatform.isCollidable !== false;
  }

  /** Zeichnet den Fund nur zusammen mit seiner tragenden Plattform. */
  draw(context) {
    if (this.isAvailable) super.draw(context);
  }

  #validateAnchor(data, platform) {
    const hasMatchingId = data?.anchorPlatformId === platform?.id;
    const hasMovement = typeof platform?.getFrameDisplacement === "function";
    const fitsHorizontally = this.x >= platform?.x &&
      this.x + this.width <= platform?.x + platform?.width;
    if (hasMatchingId && hasMovement && fitsHorizontally) return;
    throw new TypeError("Ein Sammelobjekt braucht eine passende Plattform.");
  }
}
