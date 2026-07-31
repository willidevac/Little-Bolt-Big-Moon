import { Platform } from "./platform.class.js";

export const FALLING_PLATFORM_STATES = Object.freeze({
  STABLE: "stable",
  WARNING: "warning",
  FALLING: "falling",
  FALLEN: "fallen",
});

const FULL_CIRCLE_RADIANS = Math.PI * 2;
const WARNING_SHAKE_CYCLES_PER_SECOND = 8;
const WARNING_PULSE_CYCLES_PER_SECOND = 4;
const WARNING_SHAKE_DISTANCE_PIXELS = 3;

/**
 * Warnt nach Bytes Landung sichtbar und faellt anschliessend nach unten.
 */
export class FallingPlatform extends Platform {
  /**
   * @param {Readonly<object>} platformData
   * @param {Readonly<object>} tilesetConfig
   */
  constructor(platformData, tilesetConfig) {
    super(platformData, tilesetConfig);
    this.#validateFall(platformData.fall);
    this.warningDelaySeconds = platformData.fall.warningDelaySeconds;
    this.fallSpeedPixelsPerSecond = platformData.fall.speedPixelsPerSecond;
    this.maximumDropPixels = platformData.fall.maximumDropPixels;
    this.respawnDelaySeconds = platformData.fall.respawnDelaySeconds;
    this.initialY = this.y;
    this.warningSecondsRemaining = 0;
    this.warningElapsedSeconds = 0;
    this.respawnSecondsRemaining = 0;
    this.state = FALLING_PLATFORM_STATES.STABLE;
  }

  /**
   * Startet die Warnphase nur bei Bytes erster Landung.
   * @param {object} movableObject
   * @returns {boolean}
   */
  onLanded(movableObject) {
    const canTrigger = this.state === FALLING_PLATFORM_STATES.STABLE &&
      movableObject?.team !== "enemy";
    if (!canTrigger) return false;
    this.state = FALLING_PLATFORM_STATES.WARNING;
    this.warningSecondsRemaining = this.warningDelaySeconds;
    return true;
  }

  /**
   * @param {number} deltaTimeSeconds
   * @param {Readonly<object>} world
   */
  update(deltaTimeSeconds, world) {
    this.setFrameDisplacement(0, 0);
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

  /** Unsichtbare gefallene Plattformen besitzen vorübergehend keine Oberfläche. */
  get isCollidable() {
    return this.state !== FALLING_PLATFORM_STATES.FALLEN;
  }

  /**
   * Zeichnet waehrend der Warnzeit ein deutliches Zittern und Blinken.
   * @param {CanvasRenderingContext2D} context
   */
  draw(context) {
    if (this.state === FALLING_PLATFORM_STATES.FALLEN) return;
    if (this.state !== FALLING_PLATFORM_STATES.WARNING) {
      return super.draw(context);
    }
    context.save();
    context.translate(this.#getWarningShake(), 0);
    context.globalAlpha = this.#getWarningOpacity();
    super.draw(context);
    context.restore();
  }

  #updateWarning(deltaTimeSeconds, world) {
    this.warningElapsedSeconds += deltaTimeSeconds;
    this.warningSecondsRemaining -= deltaTimeSeconds;
    if (this.warningSecondsRemaining > 0) return;
    const fallSeconds = Math.abs(this.warningSecondsRemaining);
    this.warningSecondsRemaining = 0;
    this.state = FALLING_PLATFORM_STATES.FALLING;
    if (fallSeconds > 0) this.#fall(fallSeconds, world);
  }

  #fall(deltaTimeSeconds, world) {
    const previousY = this.y;
    const maximumY = this.#getMaximumY(world);
    this.y = Math.min(
      this.y + this.fallSpeedPixelsPerSecond * deltaTimeSeconds,
      maximumY,
    );
    this.setFrameDisplacement(0, this.y - previousY);
    if (this.y >= maximumY) this.#beginRespawnWait();
  }

  #getMaximumY(world) {
    const worldHeight = world?.config?.world?.height;
    const dropY = this.initialY + this.maximumDropPixels;
    if (!Number.isFinite(worldHeight)) return dropY;
    return Math.min(dropY, worldHeight + this.height);
  }

  #beginRespawnWait() {
    this.state = FALLING_PLATFORM_STATES.FALLEN;
    this.respawnSecondsRemaining = this.respawnDelaySeconds;
  }

  #updateRespawn(deltaTimeSeconds) {
    this.respawnSecondsRemaining = Math.max(
      0, this.respawnSecondsRemaining - deltaTimeSeconds,
    );
    if (this.respawnSecondsRemaining > 0) return;
    this.y = this.initialY;
    this.warningElapsedSeconds = 0;
    this.state = FALLING_PLATFORM_STATES.STABLE;
  }

  #getWarningShake() {
    const angle = this.warningElapsedSeconds *
      WARNING_SHAKE_CYCLES_PER_SECOND *
      FULL_CIRCLE_RADIANS;
    return Math.sin(angle) * WARNING_SHAKE_DISTANCE_PIXELS;
  }

  #getWarningOpacity() {
    const angle = this.warningElapsedSeconds *
      WARNING_PULSE_CYCLES_PER_SECOND *
      FULL_CIRCLE_RADIANS;
    return 0.7 + (Math.sin(angle) + 1) * 0.15;
  }

  #validateFall(fall) {
    const values = [
      fall?.warningDelaySeconds,
      fall?.speedPixelsPerSecond,
      fall?.maximumDropPixels,
      fall?.respawnDelaySeconds,
    ];
    if (values.every((value) => Number.isFinite(value) && value > 0)) return;
    throw new TypeError(`Der Fall von Plattform ${this.id} ist ungueltig.`);
  }
}
