import { DrawableObject } from "../base/drawable-object.class.js";

/** A one-way landing surface drawn from one newly generated environment sprite. */
export class SpriteSurfacePlatform extends DrawableObject {
  /** @param {Readonly<object>} data @param {Readonly<object>} spriteConfig */
  constructor(data, spriteConfig) {
    super();
    this.#validate(data);
    Object.assign(this, data);
    this.setCollisionBox({
      offsetX: 0,
      offsetY: 0,
      width: this.width,
      height: Math.min(4, this.height),
    });
    this.loadSprite(spriteConfig);
  }

  /** Pulses the recessed indicator lights without changing geometry. */
  draw(context) {
    this.#drawSprite(context);
    if (this.kind === "floor") return;
    const time = globalThis.performance?.now?.() ?? 0;
    const alpha = 0.18 + (Math.sin(time / 260 + this.y * 0.01) + 1) * 0.1;
    context.save();
    context.globalCompositeOperation = "lighter";
    context.globalAlpha = alpha;
    context.fillStyle = this.accentColor;
    context.fillRect(this.x + 6, this.y + 3, this.width - 12, 3);
    this.#drawRoleSignal(context, time);
    context.restore();
  }

  /** Static platforms still expose the common movement contract. */
  getFrameDisplacement() {
    return Object.freeze({ x: 0, y: 0 });
  }

  /** Draws sprite. */
  #drawSprite(context) {
    if (this.platformRole !== "launch" || this.suggestedDirection !== "left") {
      super.draw(context);
      return;
    }
    context.save();
    context.translate(this.x * 2 + this.width, 0);
    context.scale(-1, 1);
    this.drawCurrentFrame(context, this.x, this.y, this.width, this.height);
    context.restore();
  }

  /** Draws role signal. */
  #drawRoleSignal(context, time) {
    if (this.searchPathCue) this.#drawSearchPathCue(context, time);
    if (this.platformRole === "launch") return this.#drawLaunchSignal(context, time);
    if (this.platformRole === "rescue") return this.#drawRescueSignal(context, time);
    if (this.platformRole === "rest") {
      context.globalAlpha = 0.24;
      context.fillRect(this.x + this.width * 0.2, this.y + 8,
        this.width * 0.6, 4);
    }
  }

  /** Draws search path cue. */
  #drawSearchPathCue(context, time) {
    const direction = this.searchPathCue === "left" ? -1 : 1;
    const pulse = (Math.sin(time / 180) + 1) * 0.12;
    context.fillStyle = "#8fffff";
    context.globalAlpha = 0.32 + pulse;
    const center = this.x + this.width / 2;
    for (let index = 0; index < 3; index += 1) {
      context.fillRect(center + direction * (10 + index * 12) - 3,
        this.y + 8, 6, 4);
    }
  }

  /** Draws launch signal. */
  #drawLaunchSignal(context, time) {
    const travel = Math.max(1, this.width - 54);
    const raw = (time / 3.2) % travel;
    const offset = this.suggestedDirection === "left" ? travel - raw : raw;
    context.globalAlpha = 0.62;
    context.fillRect(this.x + 12 + offset, this.y + 7, 42, 4);
  }

  /** Draws rescue signal. */
  #drawRescueSignal(context, time) {
    const blink = Math.floor(time / 240) % 2 === 0 ? 0.72 : 0.2;
    context.globalAlpha = blink;
    context.fillStyle = "#ffc247";
    context.fillRect(this.x + 8, this.y + 8, 8, 5);
    context.fillRect(this.x + this.width - 16, this.y + 8, 8, 5);
  }

  /** Validates operation. */
  #validate(data) {
    const values = [data?.x, data?.y, data?.width, data?.height];
    const hasValues = values.every(Number.isFinite) && data.width > 0 &&
      data.height > 0;
    if (typeof data?.id === "string" && hasValues) return;
    throw new TypeError("The sprite surface definition is invalid.");
  }
}
