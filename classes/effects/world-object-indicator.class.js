const FULL_CIRCLE_RADIANS = Math.PI * 2;
const PULSE_SPEED = 3;

export const WORLD_OBJECT_INDICATOR_TYPES = Object.freeze({
  PICKUP: "pickup",
  DANGER: "danger",
});

const INDICATOR_CONFIGS = Object.freeze({
  pickup: Object.freeze({
    color: "#6df6ff",
    shadowBlur: 12,
    radiusRatio: 0.42,
    ringHeight: 5,
  }),
  danger: Object.freeze({
    color: "#ff5b3d",
    shadowBlur: 18,
    radiusRatio: 0.48,
    ringHeight: 7,
  }),
});

/** Gives helpful and harmful world objects a consistent visual language. */
export class WorldObjectIndicator {
  /**
   * Creates the configured instance.
   * @param {string} type A supported indicator type.
   */
  constructor(type) {
    this.config = INDICATOR_CONFIGS[type];
    if (!this.config) throw new RangeError(`Unknown object indicator: ${type}`);
    this.ageSeconds = 0;
  }

  /**
   * Advances the subtle marker pulse.
   * @param {number} deltaTimeSeconds Elapsed time since the previous frame, in seconds.
   */
  update(deltaTimeSeconds) {
    if (!Number.isFinite(deltaTimeSeconds) || deltaTimeSeconds <= 0) return;
    this.ageSeconds += deltaTimeSeconds;
  }

  /**
   * Draws a thin pulsing ring exactly where the object meets the ground.
   * @param {CanvasRenderingContext2D} context Canvas context used for rendering.
   * @param {Readonly<object>} object World object represented by the indicator.
   */
  drawGroundMarker(context, object) {
    const pulse = (Math.sin(this.ageSeconds * PULSE_SPEED) + 1) / 2;
    context.save();
    this.#applyRingStyle(context, pulse);
    context.beginPath();
    context.ellipse(...this.#getEllipse(object, pulse));
    context.stroke();
    context.restore();
  }

  /**
   * Applies the matching outline glow to the sprite drawn afterwards.
   * @param {CanvasRenderingContext2D} context Canvas context used for rendering.
   */
  applyGlow(context) {
    context.shadowColor = this.config.color;
    context.shadowBlur = this.config.shadowBlur;
  }

  /**
   * Applies ring style.
   * @param {CanvasRenderingContext2D} context Canvas context used for rendering.
   * @param {number} pulse Current animation pulse used for drawing.
   */
  #applyRingStyle(context, pulse) {
    context.strokeStyle = this.config.color;
    context.lineWidth = 2;
    context.globalAlpha = 0.55 + pulse * 0.25;
    this.applyGlow(context);
  }

  /**
   * Returns ellipse.
   * @param {Readonly<object>} object World object represented by the indicator.
   * @param {number} pulse Current animation pulse used for drawing.
   */
  #getEllipse(object, pulse) {
    const centerX = object.x + object.width / 2;
    const radiusX = object.width * this.config.radiusRatio + pulse * 3;
    const groundY = object.y + object.height - 2;
    return [centerX, groundY, radiusX, this.config.ringHeight, 0, 0,
      FULL_CIRCLE_RADIANS];
  }
}
