const FULL_CIRCLE = Math.PI * 2;
const UPWARD_ARC_START = Math.PI;

const BURST_CONFIGS = Object.freeze({
  jump: Object.freeze({
    count: 5, duration: 0.24, distance: 22, gravity: 8,
    size: 5, startAngle: UPWARD_ARC_START, arc: Math.PI,
    colors: Object.freeze(["#b9b19d", "#38dcda"]), anchor: "feet",
  }),
  land: Object.freeze({
    count: 8, duration: 0.32, distance: 34, gravity: 10,
    size: 6, startAngle: UPWARD_ARC_START, arc: Math.PI,
    colors: Object.freeze(["#d8cdb5", "#d8792b"]), anchor: "feet",
  }),
  hurt: Object.freeze({
    count: 10, duration: 0.3, distance: 38, gravity: 4,
    size: 5, startAngle: 0, arc: FULL_CIRCLE,
    colors: Object.freeze(["#ff645f", "#ff9b42"]), anchor: "center",
  }),
  pickup: Object.freeze({
    count: 8, duration: 0.42, distance: 32, gravity: -8,
    size: 5, startAngle: 0, arc: FULL_CIRCLE,
    colors: Object.freeze(["#38dcda", "#ffe08a"]), anchor: "center",
  }),
});

/** Draws a short, reproducible particle burst. */
export class FeedbackBurst {
  /** @param {string} type Burst type. @param {Readonly<object>} target Effect target. */
  constructor(type, target) {
    this.config = BURST_CONFIGS[type];
    this.#validateTarget(target);
    if (!this.config) throw new RangeError(`Unbekannter Feedbacktyp: ${type}`);
    this.x = target.x + target.width / 2;
    this.y = this.#getAnchorY(target);
    this.ageSeconds = 0;
  }

  /** Advances the effect and reports whether it remains visible. */
  update(deltaTimeSeconds) {
    if (Number.isFinite(deltaTimeSeconds) && deltaTimeSeconds > 0) {
      this.ageSeconds += deltaTimeSeconds;
    }
    return this.ageSeconds < this.config.duration;
  }

  /** Draws every particle at the current burst time. */
  draw(context) {
    const progress = Math.min(1, this.ageSeconds / this.config.duration);
    context.save();
    context.globalAlpha = 1 - progress;
    for (let index = 0; index < this.config.count; index += 1) {
      this.#drawParticle(context, index, progress);
    }
    context.restore();
  }

  /** Draws particle. */
  #drawParticle(context, index, progress) {
    const angleStep = this.config.arc / Math.max(1, this.config.count - 1);
    const angle = this.config.startAngle + angleStep * index;
    const distance = this.config.distance * progress;
    const gravityY = this.config.gravity * progress * progress;
    const size = Math.max(1, this.config.size * (1 - progress * 0.5));
    context.fillStyle = this.config.colors[index % this.config.colors.length];
    context.fillRect(
      this.x + Math.cos(angle) * distance - size / 2,
      this.y + Math.sin(angle) * distance + gravityY - size / 2,
      size,
      size,
    );
  }

  /** Returns anchor y. */
  #getAnchorY(target) {
    return this.config.anchor === "feet"
      ? target.y + target.height
      : target.y + target.height / 2;
  }

  /** Validates target. */
  #validateTarget(target) {
    const values = [target?.x, target?.y, target?.width, target?.height];
    if (values.every(Number.isFinite)) return;
    throw new TypeError("Dem Feedbackeffekt fehlt eine gültige Position.");
  }
}
