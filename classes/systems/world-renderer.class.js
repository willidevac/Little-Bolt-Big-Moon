import { BackgroundRenderer } from "./background-renderer.class.js";
import { CollisionDebugRenderer } from "./collision-debug-renderer.class.js";
import { JumpChargeIndicator } from "../effects/jump-charge-indicator.class.js";
import { WORLD_ENTITY_GROUPS } from "../core/world-entity-groups.js";

const DRAW_ORDER = Object.freeze([
  WORLD_ENTITY_GROUPS.STRUCTURES,
  WORLD_ENTITY_GROUPS.DECORATIONS,
  WORLD_ENTITY_GROUPS.PLATFORMS,
  WORLD_ENTITY_GROUPS.HAZARDS,
  WORLD_ENTITY_GROUPS.COLLECTABLES,
  WORLD_ENTITY_GROUPS.ENEMIES,
  WORLD_ENTITY_GROUPS.PROJECTILES,
  WORLD_ENTITY_GROUPS.CHARACTERS,
]);
const CULLING_PADDING = 128;

/** Draws the visible section of the game world. */
export class WorldRenderer {
  /**
   * Creates the configured system.
   * @param {CanvasRenderingContext2D} context Canvas context used for rendering.
   * @param {Readonly<object>} config Configuration values used by the system.
   * @param {ReadonlyArray<object>} sections World sections used by the renderer.
   */
  constructor(context, config, sections) {
    this.context = context;
    this.viewport = config.canvas;
    this.background = new BackgroundRenderer(sections, config.canvas);
    this.collisionDebug = new CollisionDebugRenderer(config.debug);
    this.jumpChargeIndicator = new JumpChargeIndicator(config.canvas);
  }

  /**
   * Draws the background and game objects in their fixed order.
   * @param {ReadonlyArray<object>} entityGroups Entity groups used while draw.
   * @param {Readonly<object>} camera Camera supplying the current world offset.
   * @param {Readonly<object>} world Active world providing entities and runtime state.
   */
  draw(entityGroups, camera, world) {
    this.background.draw(this.context, camera);
    this.context.save();
    this.context.translate(-camera.x, -camera.y);
    try {
      this.#drawEntities(entityGroups, camera, world);
      world.feedback.draw(this.context);
      this.jumpChargeIndicator.draw(this.context, world.character, camera);
      this.collisionDebug.draw(this.context, entityGroups);
    } finally {
      this.context.restore();
    }
  }

  /**
   * Draws entities.
   * @param {ReadonlyArray<object>} entityGroups Entity groups used while draw entities.
   * @param {Readonly<object>} camera Camera supplying the current world offset.
   * @param {Readonly<object>} world Active world providing entities and runtime state.
   */
  #drawEntities(entityGroups, camera, world) {
    DRAW_ORDER.forEach((groupName) => {
      entityGroups.get(groupName).forEach((entity) => {
        if (typeof entity.draw !== "function") return;
        if (this.#isVisible(entity, camera)) entity.draw(this.context, world);
      });
    });
  }

  /**
   * Checks the visible condition.
   * @param {Readonly<object>} entity Entity used while is visible.
   * @param {Readonly<object>} camera Camera supplying the current world offset.
   */
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
