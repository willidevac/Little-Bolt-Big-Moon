import { DrawableObject } from "../base/drawable-object.class.js";
import { WORLD_ENTITY_GROUPS } from "../core/world-entity-groups.js";

/** Seals the sole entry shaft only after Byte has activated the final boss. */
export class BossArenaGate extends DrawableObject {
  /**
   * Creates the configured instance.
   * @param {Readonly<object>} data Source data used to configure the instance.
   */
  constructor(data) {
    super();
    this.#validate(data);
    Object.assign(this, data);
    this.isCollidable = false;
    this.sealProgress = 0;
    this.lightTime = 0;
    this.setCollisionBox({
      offsetX: 0,
      offsetY: 0,
      width: this.width,
      height: 4,
    });
  }

  /**
   * Closes the shaft when the boss is present inside the active world.
   * @param {number} deltaTimeSeconds Elapsed time since the previous frame, in seconds.
   * @param {Readonly<object>} world Active world providing runtime state and entities.
   */
  update(deltaTimeSeconds, world) {
    if (!Number.isFinite(deltaTimeSeconds) || deltaTimeSeconds <= 0) return;
    this.lightTime += deltaTimeSeconds;
    if (!this.isCollidable && this.#isBossActive(world)) {
      this.isCollidable = true;
    }
    if (this.isCollidable) {
      this.sealProgress = Math.min(1,
        this.sealProgress + deltaTimeSeconds * 3.5);
    }
  }

  /**
   * Draws no obstruction while open and a clear energy floor while sealed.
   * @param {CanvasRenderingContext2D} context Canvas context used for rendering.
   */
  draw(context) {
    if (this.sealProgress <= 0) return;
    const pulse = (Math.sin(this.lightTime * 7) + 1) / 2;
    const visibleWidth = this.width * this.sealProgress;
    const left = this.x + (this.width - visibleWidth) / 2;
    this.#prepareSeal(context, pulse, left, visibleWidth);
    this.#drawStripes(context, left, visibleWidth);
    context.restore();
  }

  /**
   * Prepares seal.
   * @param {CanvasRenderingContext2D} context Canvas context used for rendering.
   * @param {number} pulse Current animation pulse used for drawing.
   * @param {number} left Left drawing coordinate in canvas pixels.
   * @param {boolean} visibleWidth Visible drawing width in canvas pixels.
   */
  #prepareSeal(context, pulse, left, visibleWidth) {
    context.save();
    context.globalCompositeOperation = "lighter";
    context.globalAlpha = 0.38 + pulse * 0.2;
    context.fillStyle = "#58eaff";
    context.fillRect(left, this.y - 5, visibleWidth, 7);
    context.globalAlpha = 0.32 * this.sealProgress;
    context.strokeStyle = "#b9faff";
    context.lineWidth = 2;
  }

  /**
   * Draws stripes.
   * @param {CanvasRenderingContext2D} context Canvas context used for rendering.
   * @param {number} left Left drawing coordinate in canvas pixels.
   * @param {boolean} visibleWidth Visible drawing width in canvas pixels.
   */
  #drawStripes(context, left, visibleWidth) {
    for (let x = left + 10; x < left + visibleWidth; x += 18) {
      context.beginPath();
      context.moveTo(x, this.y - 4);
      context.lineTo(x + 9, this.y + 2);
      context.stroke();
    }
  }

  /** The energy seal never moves once deployed. */
  getFrameDisplacement() {
    return Object.freeze({ x: 0, y: 0 });
  }

  /**
   * Checks whether boss active.
   * @param {Readonly<object>} world Active world providing runtime state and entities.
   */
  #isBossActive(world) {
    if (typeof world?.getEntities !== "function") return false;
    return world.getEntities(WORLD_ENTITY_GROUPS.ENEMIES).some(({ id }) => {
      return id === this.bossId;
    });
  }

  /**
   * Validates operation.
   * @param {Readonly<object>} data Source data used to configure the instance.
   */
  #validate(data) {
    const values = [data?.x, data?.y, data?.width, data?.height];
    const hasValues = values.every(Number.isFinite) && data.width > 64 &&
      data.height >= 4;
    const hasBoss = typeof data?.bossId === "string" && data.bossId;
    if (typeof data?.id === "string" && data.id && hasValues && hasBoss) return;
    throw new TypeError("Das Eingangssiegel der Bossarena ist ungültig.");
  }
}
