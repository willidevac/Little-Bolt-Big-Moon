import { SpriteSurfacePlatform } from "./sprite-surface-platform.class.js";

export const TRAP_PLATFORM_STATES = Object.freeze({
  SAFE: "safe",
  WARNING: "warning",
  ACTIVE: "active",
});

/** A solid floor that visibly warns before its electrical damage phase. */
export class TrapPlatform extends SpriteSurfacePlatform {
  /** @param {Readonly<object>} data @param {Readonly<object>} spriteConfig */
  constructor(data, spriteConfig) {
    super(data, spriteConfig);
    this.#validateTrap(data.trap);
    this.safeSeconds = data.trap.safeSeconds;
    this.warningSeconds = data.trap.warningSeconds;
    this.activeSeconds = data.trap.activeSeconds;
    this.damage = data.trap.damage;
    this.state = TRAP_PLATFORM_STATES.SAFE;
    this.stateSeconds = 0;
  }

  /** @returns {boolean} Whether touching the top surface currently hurts. */
  get isDangerous() {
    return this.state === TRAP_PLATFORM_STATES.ACTIVE;
  }

  /** Advances the safe, warning, and active phases. */
  update(deltaTimeSeconds) {
    if (!Number.isFinite(deltaTimeSeconds) || deltaTimeSeconds <= 0) return;
    this.stateSeconds += deltaTimeSeconds;
    const duration = this.#getStateDuration();
    if (this.stateSeconds < duration) return;
    this.stateSeconds %= duration;
    this.state = this.state === TRAP_PLATFORM_STATES.SAFE
      ? TRAP_PLATFORM_STATES.WARNING
      : this.state === TRAP_PLATFORM_STATES.WARNING
        ? TRAP_PLATFORM_STATES.ACTIVE
        : TRAP_PLATFORM_STATES.SAFE;
  }

  /** @returns {boolean} Whether the target is standing on this surface. */
  wasTouchedBy(target) {
    return target?.groundPlatform === this;
  }

  /** Creates one platform hit during the active phase. */
  createHit(target) {
    if (!this.isDangerous || !this.wasTouchedBy(target)) return null;
    const direction = target.x + target.width / 2 < this.x + this.width / 2
      ? -1
      : 1;
    return Object.freeze({ amount: this.damage, direction });
  }

  /** Draws the sprite plus an unambiguous warning or active glow. */
  draw(context) {
    super.draw(context);
    if (this.state === TRAP_PLATFORM_STATES.SAFE) return;
    const time = globalThis.performance?.now?.() ?? 0;
    const pulse = (Math.sin(time / 75) + 1) / 2;
    context.save();
    context.globalCompositeOperation = "lighter";
    context.globalAlpha = this.isDangerous ? 0.35 + pulse * 0.4 : 0.12 + pulse * 0.22;
    context.fillStyle = this.isDangerous ? "#ff4f2e" : "#ffc247";
    context.fillRect(this.x + 5, this.y, this.width - 10, 7);
    context.restore();
  }

  #getStateDuration() {
    if (this.state === TRAP_PLATFORM_STATES.SAFE) return this.safeSeconds;
    if (this.state === TRAP_PLATFORM_STATES.WARNING) return this.warningSeconds;
    return this.activeSeconds;
  }

  #validateTrap(trap) {
    const values = [
      trap?.safeSeconds, trap?.warningSeconds, trap?.activeSeconds, trap?.damage,
    ];
    if (values.every((value) => Number.isFinite(value) && value > 0)) return;
    throw new TypeError(`The trap platform ${this.id} is invalid.`);
  }
}
