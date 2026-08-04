import { CollectableObject } from "./collectable-object.class.js";

/**
 * Keeps a pickup visibly and physically attached to its platform.
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
    this.isPreBossSupply = Boolean(data.isPreBossSupply);
    this.y = anchorPlatform.y - this.height;
  }

  /** Also follows a moving or reset platform. */
  update(deltaTimeSeconds) {
    super.update(deltaTimeSeconds);
    const movement = this.anchorPlatform.getFrameDisplacement();
    this.x += movement.x;
    this.y += movement.y;
  }

  /** Hidden falling platforms temporarily hide their pickup as well. */
  get isAvailable() {
    return this.anchorPlatform.isCollidable !== false;
  }

  /** Draws the pickup only together with its supporting platform. */
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
