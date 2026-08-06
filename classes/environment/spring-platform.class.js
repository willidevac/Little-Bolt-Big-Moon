import { SpriteSurfacePlatform } from "./sprite-surface-platform.class.js";

/** Launches a landed character upward with a fixed readable impulse. */
export class SpringPlatform extends SpriteSurfacePlatform {
  /** @param {Readonly<object>} data @param {Readonly<object>} spriteConfig */
  constructor(data, spriteConfig) {
    super(data, spriteConfig);
    this.#validateSpring(data);
    this.bounceSpeedPixelsPerSecond = data.bounceSpeedPixelsPerSecond;
    this.bounceHorizontalSpeedPixelsPerSecond =
      data.bounceHorizontalSpeedPixelsPerSecond;
    this.bounceDirection = data.bounceDirection;
    this.pulseSeconds = 0;
  }

  /** Validates spring. */
  #validateSpring(data) {
    const speeds = [data.bounceSpeedPixelsPerSecond,
      data.bounceHorizontalSpeedPixelsPerSecond];
    const hasSpeeds = speeds.every((speed) => Number.isFinite(speed) && speed > 0);
    if (hasSpeeds && ["left", "right"].includes(data.bounceDirection)) return;
    throw new TypeError(`The spring platform ${this.id} is invalid.`);
  }

  /** Applies the platform's fixed upward launch impulse. */
  onLanded(target) {
    if (typeof target?.applyUpwardImpulse !== "function") return false;
    const direction = this.bounceDirection === "left" ? -1 : 1;
    target.velocityX = direction * this.bounceHorizontalSpeedPixelsPerSecond;
    target.facingDirection = direction;
    target.applyUpwardImpulse(this.bounceSpeedPixelsPerSecond);
    this.pulseSeconds = 0.22;
    return true;
  }

  /** Fades the short activation light. */
  update(deltaTimeSeconds) {
    if (!Number.isFinite(deltaTimeSeconds) || deltaTimeSeconds <= 0) return;
    this.pulseSeconds = Math.max(0, this.pulseSeconds - deltaTimeSeconds);
  }

  /** Draws the sprite and the brief launch flash. */
  draw(context) {
    super.draw(context);
    if (this.pulseSeconds <= 0) return;
    this.#drawLaunchFlash(context);
  }

  /** Draws launch flash. */
  #drawLaunchFlash(context) {
    context.save();
    context.globalCompositeOperation = "lighter";
    context.globalAlpha = Math.min(0.75, this.pulseSeconds * 3.4);
    context.fillStyle = "#baffff";
    context.fillRect(this.x + this.width * 0.2, this.y,
      this.width * 0.6, 8);
    const direction = this.bounceDirection === "left" ? -1 : 1;
    const center = this.x + this.width / 2;
    context.fillRect(center + direction * this.width * 0.16 - 10,
      this.y + 10, 20, 4);
    context.restore();
  }
}
