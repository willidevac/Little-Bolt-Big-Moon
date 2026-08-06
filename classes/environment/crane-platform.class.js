import { SpriteSurfacePlatform } from "./sprite-surface-platform.class.js";

const FULL_CIRCLE_RADIANS = Math.PI * 2;

/** A cable-mounted floor with slow, predictable crane movement. */
export class CranePlatform extends SpriteSurfacePlatform {
  /**
   * Creates the configured instance.
   * @param {Readonly<object>} data Source data used to configure the instance.
   * @param {Readonly<object>} spriteConfig Sprite configuration used for rendering.
   */
  constructor(data, spriteConfig) {
    super(data, spriteConfig);
    this.#validateMotion(data.crane);
    Object.assign(this, data.crane);
    this.initialX = this.x;
    this.initialY = this.y;
    this.motionSeconds = 0;
    this.frameDisplacement = Object.seal({ x: 0, y: 0 });
  }

  /**
   * Advances the crane travel and its four mechanical light frames.
   * @param {number} deltaTimeSeconds Elapsed time since the previous frame, in seconds.
   */
  update(deltaTimeSeconds) {
    this.frameDisplacement.x = 0;
    this.frameDisplacement.y = 0;
    if (!Number.isFinite(deltaTimeSeconds) || deltaTimeSeconds <= 0) return;
    const previous = { x: this.x, y: this.y };
    this.motionSeconds = (this.motionSeconds + deltaTimeSeconds) %
      this.cycleSeconds;
    this.#moveAlongCable();
    this.frameDisplacement.x = this.x - previous.x;
    this.frameDisplacement.y = this.y - previous.y;
    this.setFrameIndex(Math.floor(
      this.motionSeconds / this.animationFrameSeconds,
    ) % 4);
  }

  /** Returns movement that must be transferred to grounded objects. */
  getFrameDisplacement() {
    return this.frameDisplacement;
  }

  /**
   * Draws the fixed overhead rail, live cables and native sprite frame.
   * @param {CanvasRenderingContext2D} context Canvas context used for rendering.
   */
  draw(context) {
    this.#drawCraneRig(context);
    const visualHeight = this.width * this.spriteConfig.frameHeight /
      this.spriteConfig.frameWidth;
    const visualY = this.y - visualHeight * this.surfaceRatio;
    this.drawCurrentFrame(
      context, this.x, visualY, this.width, visualHeight,
    );
    this.#drawSurfaceGlow(context);
  }

  /**
   * Draws surface glow.
   * @param {CanvasRenderingContext2D} context Canvas context used for rendering.
   */
  #drawSurfaceGlow(context) {
    context.save();
    context.globalCompositeOperation = "lighter";
    context.globalAlpha = 0.48;
    context.fillStyle = this.accentColor;
    context.fillRect(this.x + 8, this.y, this.width - 16, 4);
    context.restore();
  }

  /** Moves along cable. */
  #moveAlongCable() {
    const progress = this.motionSeconds / this.cycleSeconds;
    if (this.axis === "horizontal") {
      this.x = this.initialX + Math.sin(
        progress * FULL_CIRCLE_RADIANS,
      ) * this.travelPixels;
      return;
    }
    this.y = this.initialY - (1 - Math.cos(
      progress * FULL_CIRCLE_RADIANS,
    )) * this.travelPixels / 2;
  }

  /**
   * Draws crane rig.
   * @param {CanvasRenderingContext2D} context Canvas context used for rendering.
   */
  #drawCraneRig(context) {
    const anchorY = this.initialY - this.cableLengthPixels;
    const travel = this.axis === "horizontal" ? this.travelPixels : 0;
    context.save();
    this.#drawRail(context, anchorY, travel);
    this.#drawCable(context, this.x + this.width * 0.2, anchorY);
    this.#drawCable(context, this.x + this.width * 0.8, anchorY);
    context.restore();
  }

  /**
   * Draws rail.
   * @param {CanvasRenderingContext2D} context Canvas context used for rendering.
   * @param {number} anchorY Anchor y supplied to draw rail.
   * @param {number} travel Travel supplied to draw rail.
   */
  #drawRail(context, anchorY, travel) {
    context.fillStyle = "#17222b";
    context.fillRect(
      this.initialX - travel - 12, anchorY,
      this.width + travel * 2 + 24, 10,
    );
    context.fillStyle = this.accentColor;
    context.globalAlpha = 0.5;
    context.fillRect(this.initialX - travel, anchorY + 3,
      this.width + travel * 2, 2);
  }

  /**
   * Draws cable.
   * @param {CanvasRenderingContext2D} context Canvas context used for rendering.
   * @param {number} x Horizontal coordinate in canvas pixels.
   * @param {number} anchorY Anchor y supplied to draw cable.
   */
  #drawCable(context, x, anchorY) {
    const cableBottom = this.y - 8;
    context.globalAlpha = 1;
    context.fillStyle = "#263640";
    context.fillRect(Math.round(x) - 2, anchorY + 8, 4,
      Math.max(0, cableBottom - anchorY - 8));
    context.fillStyle = "#91d7dc";
    context.globalAlpha = 0.42;
    context.fillRect(Math.round(x) - 1, anchorY + 8, 1,
      Math.max(0, cableBottom - anchorY - 8));
  }

  /**
   * Validates motion.
   * @param {Readonly<object>} crane Crane supplied to validate motion.
   */
  #validateMotion(crane) {
    const values = [
      crane?.travelPixels, crane?.cycleSeconds, crane?.cableLengthPixels,
      crane?.animationFrameSeconds, crane?.surfaceRatio,
    ];
    const axisIsValid = crane?.axis === "horizontal" ||
      crane?.axis === "vertical";
    if (axisIsValid && values.every((value) => {
      return Number.isFinite(value) && value > 0;
    }) && crane.surfaceRatio < 1) return;
    throw new TypeError(`The crane platform ${this.id} is invalid.`);
  }
}
