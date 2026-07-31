import { CollectableObject } from "./collectable-object.class.js";

/**
 * Optionales Erinnerungsstück, das seiner Nebenweg-Plattform folgt.
 */
export class StoryBadge extends CollectableObject {
  /**
   * @param {Readonly<object>} badgeData
   * @param {Readonly<object>} anchorPlatform
   */
  constructor(badgeData, anchorPlatform) {
    super(badgeData);
    this.#validateAnchor(badgeData, anchorPlatform);
    this.anchorPlatform = anchorPlatform;
  }

  /** Hält das Abzeichen auch auf beweglichen Plattformen sichtbar verankert. */
  update(deltaTimeSeconds) {
    super.update(deltaTimeSeconds);
    const movement = this.anchorPlatform.getFrameDisplacement();
    this.x += movement.x;
    this.y += movement.y;
  }

  #validateAnchor(data, platform) {
    const hasMatchingId = typeof data?.anchorPlatformId === "string" &&
      data.anchorPlatformId === platform?.id;
    const hasMovement = typeof platform?.getFrameDisplacement === "function";
    if (hasMatchingId && hasMovement) return;
    throw new TypeError("Das Storyabzeichen braucht eine bekannte Plattform.");
  }
}
