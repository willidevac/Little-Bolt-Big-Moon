const HURTBOX_COLOR = "#ff4d6d";
const STOMP_BOX_COLOR = "#35d5d3";

/**
 * Zeichnet präzise Kollisionsflächen nur im aktivierten Debugmodus.
 */
export class CollisionDebugRenderer {
  /**
   * @param {Readonly<object>} debugConfig
   */
  constructor(debugConfig) {
    this.isEnabled = debugConfig?.showCollisionBoxes === true;
  }

  /**
   * Zeichnet Körper- und Stompflächen aller sichtbaren Weltobjekte.
   * @param {CanvasRenderingContext2D} context
   * @param {ReadonlyMap<string, ReadonlyArray<object>>} entityGroups
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

  #drawEntity(context, entity) {
    if (typeof entity.getCollisionBounds !== "function") return;
    this.#strokeBounds(context, entity.getCollisionBounds(), HURTBOX_COLOR);
    if (typeof entity.getStompBounds !== "function") return;
    this.#strokeBounds(context, entity.getStompBounds(), STOMP_BOX_COLOR);
  }

  #strokeBounds(context, bounds, color) {
    context.strokeStyle = color;
    context.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
  }
}
