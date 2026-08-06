const HURTBOX_COLOR = "#ff4d6d";
const STOMP_BOX_COLOR = "#35d5d3";

/**
 * Draws precise collision areas only when debug mode is enabled.
 */
export class CollisionDebugRenderer {
  /**
   * Creates the configured system.
   * @param {Readonly<object>} debugConfig Debug rendering configuration.
   */
  constructor(debugConfig) {
    this.isEnabled = debugConfig?.showCollisionBoxes === true;
  }

  /**
   * Draws body and stomp areas for all visible world objects.
   * @param {CanvasRenderingContext2D} context Canvas context used for debug rendering.
   * @param {ReadonlyMap<string, ReadonlyArray<object>>} entityGroups Entity groups inspected by the debug renderer.
   */
  draw(context, entityGroups) {
    if (!this.isEnabled) return;
    context.save();
    context.lineWidth = 2;
    entityGroups.forEach((entities) => {
      entities.forEach((entity) => this.#drawEntity(context, entity));
    });
    context.restore();
  }

  /**
   * Draws entity.
   * @param {CanvasRenderingContext2D} context Canvas context used for debug rendering.
   * @param {Readonly<object>} entity Entity evaluated or rendered by the operation.
   */
  #drawEntity(context, entity) {
    if (typeof entity.getCollisionBoundsList === "function") {
      entity.getCollisionBoundsList().forEach((bounds) => {
        this.#strokeBounds(context, bounds, HURTBOX_COLOR);
      });
      return;
    }
    if (typeof entity.getCollisionBounds !== "function") return;
    this.#strokeBounds(context, entity.getCollisionBounds(), HURTBOX_COLOR);
    if (typeof entity.getStompBounds !== "function") return;
    this.#strokeBounds(context, entity.getStompBounds(), STOMP_BOX_COLOR);
  }

  /**
   * Performs the stroke bounds operation.
   * @param {CanvasRenderingContext2D} context Canvas context used for debug rendering.
   * @param {Readonly<object>} bounds Bounds used by stroke bounds.
   * @param {string} color Stroke color used for the debug bounds.
   */
  #strokeBounds(context, bounds, color) {
    context.strokeStyle = color;
    context.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
  }
}
