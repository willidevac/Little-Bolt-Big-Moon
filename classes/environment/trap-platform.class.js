import { SpriteSurfacePlatform } from "./sprite-surface-platform.class.js";

export const TRAP_PLATFORM_STATES = Object.freeze({
  SAFE: "safe",
  WARNING: "warning",
  ACTIVE: "active",
});

/** A solid floor that visibly warns before its electrical damage phase. */
export class TrapPlatform extends SpriteSurfacePlatform {
  /**
   * Creates the configured instance.
   * @param {Readonly<object>} data Source data used to configure the instance.
   * @param {Readonly<object>} spriteConfig Sprite configuration used for rendering.
   */
  constructor(data, spriteConfig) {
    super(data, spriteConfig);
    this.#validateTrap(data.trap);
    this.safeSeconds = data.trap.safeSeconds;
    this.warningSeconds = data.trap.warningSeconds;
    this.activeSeconds = data.trap.activeSeconds;
    this.landingGraceSeconds = data.trap.landingGraceSeconds;
    this.damage = data.trap.damage;
    this.state = TRAP_PLATFORM_STATES.SAFE;
    this.stateSeconds = 0;
    this.contactGrace = new Map();
  }

  /** @returns {boolean} Whether touching the top surface currently hurts. */
  get isDangerous() {
    return this.state === TRAP_PLATFORM_STATES.ACTIVE;
  }

  /**
   * Advances the safe, warning, and active phases.
   * @param {number} deltaTimeSeconds Elapsed time since the previous frame, in seconds.
   */
  update(deltaTimeSeconds) {
    if (!Number.isFinite(deltaTimeSeconds) || deltaTimeSeconds <= 0) return;
    this.#updateContactGrace(deltaTimeSeconds);
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

  /**
   * Runs was touched by with validated inputs.
   * @param {Readonly<object>} target Target affected or inspected by the operation.
   * @returns {boolean} Whether the target is standing on this surface.
   */
  wasTouchedBy(target) {
    return target?.groundPlatform === this;
  }

  /**
   * Guarantees reaction time even when Byte lands during an active phase.
   * @param {Readonly<object>} target Target affected or inspected by the operation.
   */
  onLanded(target) {
    const contact = this.contactGrace.get(target);
    if (contact) {
      contact.seen = true;
      return false;
    }
    this.contactGrace.set(target, {
      remainingSeconds: this.landingGraceSeconds,
      seen: true,
    });
    return true;
  }

  /**
   * Creates one platform hit during the active phase.
   * @param {Readonly<object>} target Target affected or inspected by the operation.
   */
  createHit(target) {
    if (!this.isDangerous || !this.wasTouchedBy(target) ||
      this.#hasLandingGrace(target)) return null;
    const direction = target.x + target.width / 2 < this.x + this.width / 2
      ? -1
      : 1;
    return Object.freeze({ amount: this.damage, direction });
  }

  /**
   * Draws the sprite plus an unambiguous warning or active glow.
   * @param {CanvasRenderingContext2D} context Canvas context used for rendering.
   */
  draw(context) {
    super.draw(context);
    const time = globalThis.performance?.now?.() ?? 0;
    const pulse = (Math.sin(time / 75) + 1) / 2;
    context.save();
    context.globalCompositeOperation = "lighter";
    this.#drawHazardSegments(context, pulse);
    context.restore();
  }

  /**
   * Draws hazard segments.
   * @param {CanvasRenderingContext2D} context Canvas context used for rendering.
   * @param {number} pulse Current animation pulse used for drawing.
   */
  #drawHazardSegments(context, pulse) {
    const isWarning = this.state === TRAP_PLATFORM_STATES.WARNING;
    context.fillStyle = this.isDangerous ? "#ff3b22" : "#ffc247";
    context.globalAlpha = this.isDangerous
      ? 0.62 + pulse * 0.3
      : isWarning ? 0.38 + pulse * 0.42 : 0.22;
    const segmentCount = Math.max(3, Math.floor(this.width / 42));
    const segmentGap = 5;
    const segmentWidth = (this.width - 12 - segmentGap *
      (segmentCount - 1)) / segmentCount;
    this.#drawSegments(context, segmentCount, segmentGap, segmentWidth);
    this.#drawHazardGlow(context, pulse, isWarning);
  }

  /**
   * Draws segments.
   * @param {CanvasRenderingContext2D} context Canvas context used for rendering.
   * @param {number} count Count supplied to draw segments.
   * @param {number} gap Gap supplied to draw segments.
   * @param {number} width Width supplied to draw segments.
   */
  #drawSegments(context, count, gap, width) {
    for (let index = 0; index < count; index += 1) {
      const x = this.x + 6 + index * (width + gap);
      context.fillRect(x, this.y, width, this.isDangerous ? 10 : 7);
    }
  }

  /**
   * Draws hazard glow.
   * @param {CanvasRenderingContext2D} context Canvas context used for rendering.
   * @param {number} pulse Current animation pulse used for drawing.
   * @param {boolean} isWarning Is warning supplied to draw hazard glow.
   */
  #drawHazardGlow(context, pulse, isWarning) {
    if (!isWarning && !this.isDangerous) return;
    context.globalAlpha = this.isDangerous ? 0.2 + pulse * 0.16 : 0.1 + pulse * 0.12;
    context.fillRect(this.x + 4, this.y + 10, this.width - 8,
      this.isDangerous ? 18 : 10);
  }

  /**
   * Updates contact grace.
   * @param {number} deltaTimeSeconds Elapsed time since the previous frame, in seconds.
   */
  #updateContactGrace(deltaTimeSeconds) {
    this.contactGrace.forEach((contact, target) => {
      if (!contact.seen) {
        this.contactGrace.delete(target);
        return;
      }
      contact.remainingSeconds = Math.max(
        0, contact.remainingSeconds - deltaTimeSeconds,
      );
      contact.seen = false;
    });
  }

  /**
   * Checks whether landing grace.
   * @param {Readonly<object>} target Target affected or inspected by the operation.
   */
  #hasLandingGrace(target) {
    return (this.contactGrace.get(target)?.remainingSeconds ?? 0) > 0;
  }

  /** Returns state duration. */
  #getStateDuration() {
    if (this.state === TRAP_PLATFORM_STATES.SAFE) return this.safeSeconds;
    if (this.state === TRAP_PLATFORM_STATES.WARNING) return this.warningSeconds;
    return this.activeSeconds;
  }

  /**
   * Validates trap.
   * @param {Readonly<object>} trap Trap supplied to validate trap.
   */
  #validateTrap(trap) {
    const values = [
      trap?.safeSeconds, trap?.warningSeconds, trap?.activeSeconds,
      trap?.landingGraceSeconds, trap?.damage,
    ];
    if (values.every((value) => Number.isFinite(value) && value > 0)) return;
    throw new TypeError(`The trap platform ${this.id} is invalid.`);
  }
}
