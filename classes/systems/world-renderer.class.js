import { BackgroundRenderer } from "./background-renderer.class.js";
import { CollisionDebugRenderer } from "./collision-debug-renderer.class.js";
import { WORLD_ENTITY_GROUPS } from "../core/world-entity-groups.js";

const DRAW_ORDER = Object.freeze([
  WORLD_ENTITY_GROUPS.DECORATIONS,
  WORLD_ENTITY_GROUPS.PLATFORMS,
  WORLD_ENTITY_GROUPS.HAZARDS,
  WORLD_ENTITY_GROUPS.COLLECTABLES,
  WORLD_ENTITY_GROUPS.ENEMIES,
  WORLD_ENTITY_GROUPS.PROJECTILES,
  WORLD_ENTITY_GROUPS.CHARACTERS,
]);
const CULLING_PADDING = 128;

/** Zeichnet den sichtbaren Ausschnitt der Spielwelt. */
export class WorldRenderer {
  /**
   * @param {CanvasRenderingContext2D} context
   * @param {Readonly<object>} config
   * @param {ReadonlyArray<object>} sections
   */
  constructor(context, config, sections) {
    this.context = context;
    this.viewport = config.canvas;
    this.background = new BackgroundRenderer(sections, config.canvas);
    this.collisionDebug = new CollisionDebugRenderer(config.debug);
  }

  /** Zeichnet Hintergrund und Spielobjekte in ihrer festen Reihenfolge. */
  draw(entityGroups, camera, world) {
    this.background.draw(this.context, camera);
    this.context.save();
    this.context.translate(-camera.x, -camera.y);
    try {
      this.#drawEntities(entityGroups, camera, world);
      world.feedback.draw(this.context);
      this.collisionDebug.draw(this.context, entityGroups);
    } finally {
      this.context.restore();
    }
  }

  #drawEntities(entityGroups, camera, world) {
    DRAW_ORDER.forEach((groupName) => {
      entityGroups.get(groupName).forEach((entity) => {
        if (typeof entity.draw !== "function") return;
        if (this.#isVisible(entity, camera)) entity.draw(this.context, world);
      });
    });
  }

  #isVisible(entity, camera) {
    const left = camera.x - CULLING_PADDING;
    const top = camera.y - CULLING_PADDING;
    const right = camera.x + this.viewport.width + CULLING_PADDING;
    const bottom = camera.y + this.viewport.height + CULLING_PADDING;
    return entity.x + entity.width >= left &&
      entity.x <= right &&
      entity.y + entity.height >= top &&
      entity.y <= bottom;
  }
}
