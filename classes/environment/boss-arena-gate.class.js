import { DrawableObject } from "../base/drawable-object.class.js";
import { WORLD_ENTITY_GROUPS } from "../core/world-entity-groups.js";

/** Seals the sole entry shaft only after Byte has activated the final boss. */
export class BossArenaGate extends DrawableObject {
  /** @param {Readonly<object>} data */
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

  /** Closes the shaft when the boss is present inside the active world. */
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

  /** Draws no obstruction while open and a clear energy floor while sealed. */
  draw(context) {
    if (this.sealProgress <= 0) return;
    const pulse = (Math.sin(this.lightTime * 7) + 1) / 2;
    const visibleWidth = this.width * this.sealProgress;
    const left = this.x + (this.width - visibleWidth) / 2;
    context.save();
    context.globalCompositeOperation = "lighter";
    context.globalAlpha = 0.38 + pulse * 0.2;
    context.fillStyle = "#58eaff";
    context.fillRect(left, this.y - 5, visibleWidth, 7);
    context.globalAlpha = 0.32 * this.sealProgress;
    context.strokeStyle = "#b9faff";
    context.lineWidth = 2;
    for (let x = left + 10; x < left + visibleWidth; x += 18) {
      context.beginPath();
      context.moveTo(x, this.y - 4);
      context.lineTo(x + 9, this.y + 2);
      context.stroke();
    }
    context.restore();
  }

  /** The energy seal never moves once deployed. */
  getFrameDisplacement() {
    return Object.freeze({ x: 0, y: 0 });
  }

  #isBossActive(world) {
    if (typeof world?.getEntities !== "function") return false;
    return world.getEntities(WORLD_ENTITY_GROUPS.ENEMIES).some(({ id }) => {
      return id === this.bossId;
    });
  }

  #validate(data) {
    const values = [data?.x, data?.y, data?.width, data?.height];
    const hasValues = values.every(Number.isFinite) && data.width > 64 &&
      data.height >= 4;
    const hasBoss = typeof data?.bossId === "string" && data.bossId;
    if (typeof data?.id === "string" && data.id && hasValues && hasBoss) return;
    throw new TypeError("Das Eingangssiegel der Bossarena ist ungültig.");
  }
}
