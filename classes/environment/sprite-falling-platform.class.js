import { SpriteSurfacePlatform } from "./sprite-surface-platform.class.js";
import { FALLING_PLATFORM_STATES } from "./falling-platform.class.js";

/** Newly illustrated falling platform with warning, drop and respawn phases. */
export class SpriteFallingPlatform extends SpriteSurfacePlatform {
  /** @param {Readonly<object>} data @param {Readonly<object>} spriteConfig */
  constructor(data, spriteConfig) {
    super(data, spriteConfig);
    this.#validateFall(data.fall);
    Object.assign(this, data.fall);
    this.initialY = this.y;
    this.state = FALLING_PLATFORM_STATES.STABLE;
    this.warningSecondsRemaining = 0;
    this.warningElapsedSeconds = 0;
    this.respawnSecondsRemaining = 0;
    this.frameDisplacement = Object.seal({ x: 0, y: 0 });
  }

  /** @returns {boolean} Whether the temporary floor can be landed on. */
  get isCollidable() {
    return this.state !== FALLING_PLATFORM_STATES.FALLEN;
  }

  /** @returns {{x:number,y:number}} Movement applied during this frame. */
  getFrameDisplacement() {
    return this.frameDisplacement;
  }

  /** Starts the visible warning after Byte lands. */
  onLanded(target) {
    if (this.state !== FALLING_PLATFORM_STATES.STABLE || target?.team === "enemy") {
      return false;
    }
    this.state = FALLING_PLATFORM_STATES.WARNING;
    this.warningSecondsRemaining = this.warningDelaySeconds;
    return true;
  }

  /** Advances warning, fall, hidden wait, and respawn. */
  update(deltaTimeSeconds, world) {
    this.frameDisplacement.x = 0;
    this.frameDisplacement.y = 0;
    if (!Number.isFinite(deltaTimeSeconds) || deltaTimeSeconds <= 0) return;
    if (this.state === FALLING_PLATFORM_STATES.WARNING) {
      return this.#updateWarning(deltaTimeSeconds, world);
    }
    if (this.state === FALLING_PLATFORM_STATES.FALLING) {
      return this.#fall(deltaTimeSeconds, world);
    }
    if (this.state === FALLING_PLATFORM_STATES.FALLEN) {
      this.#updateRespawn(deltaTimeSeconds);
    }
  }

  /** Draws the stable platform or its pre-fall shake. */
  draw(context) {
    if (this.state === FALLING_PLATFORM_STATES.FALLEN) return;
    if (this.state !== FALLING_PLATFORM_STATES.WARNING) return super.draw(context);
    this.#drawWarning(context);
  }

  /** Draws warning. */
  #drawWarning(context) {
    const shake = Math.sin(this.warningElapsedSeconds * Math.PI * 16) * 3;
    context.save();
    context.translate(shake, 0);
    context.globalAlpha = 0.72 +
      (Math.sin(this.warningElapsedSeconds * Math.PI * 8) + 1) * 0.14;
    super.draw(context);
    context.globalCompositeOperation = "lighter";
    context.globalAlpha = 0.28 +
      (Math.sin(this.warningElapsedSeconds * Math.PI * 8) + 1) * 0.18;
    context.fillStyle = "#ffc247";
    context.fillRect(this.x + 8, this.y + 3, this.width - 16, 6);
    context.restore();
  }

  /** Updates warning. */
  #updateWarning(deltaTimeSeconds, world) {
    this.warningElapsedSeconds += deltaTimeSeconds;
    this.warningSecondsRemaining -= deltaTimeSeconds;
    if (this.warningSecondsRemaining > 0) return;
    this.state = FALLING_PLATFORM_STATES.FALLING;
    const overflow = Math.abs(this.warningSecondsRemaining);
    this.warningSecondsRemaining = 0;
    if (overflow > 0) this.#fall(overflow, world);
  }

  /** Performs operation. */
  #fall(deltaTimeSeconds, world) {
    const previousY = this.y;
    const worldHeight = world?.config?.world?.height;
    const targetY = this.initialY + this.maximumDropPixels;
    const maximumY = Number.isFinite(worldHeight)
      ? Math.min(targetY, worldHeight + this.height)
      : targetY;
    this.y = Math.min(maximumY,
      this.y + this.speedPixelsPerSecond * deltaTimeSeconds);
    this.frameDisplacement.y = this.y - previousY;
    if (this.y < maximumY) return;
    this.state = FALLING_PLATFORM_STATES.FALLEN;
    this.respawnSecondsRemaining = this.respawnDelaySeconds;
  }

  /** Updates respawn. */
  #updateRespawn(deltaTimeSeconds) {
    this.respawnSecondsRemaining -= deltaTimeSeconds;
    if (this.respawnSecondsRemaining > 0) return;
    this.frameDisplacement.y = this.initialY - this.y;
    this.y = this.initialY;
    this.warningElapsedSeconds = 0;
    this.state = FALLING_PLATFORM_STATES.STABLE;
  }

  /** Validates fall. */
  #validateFall(fall) {
    const values = [fall?.warningDelaySeconds, fall?.speedPixelsPerSecond,
      fall?.maximumDropPixels, fall?.respawnDelaySeconds];
    if (values.every((value) => Number.isFinite(value) && value > 0)) return;
    throw new TypeError(`The falling platform ${this.id} is invalid.`);
  }
}
