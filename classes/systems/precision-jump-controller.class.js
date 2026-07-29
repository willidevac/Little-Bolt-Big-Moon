import { clamp } from "../../js/utils/math.js";

/**
 * Lädt einen Sprung am Boden und liefert beim Loslassen seinen festen Impuls.
 */
export class PrecisionJumpController {
  /** Erstellt eine leere Sprungladung ohne Richtungswunsch. */
  constructor() {
    this.controlBonusSeconds = 0;
    this.reset();
  }

  /**
   * Aktualisiert die Ladung und liefert höchstens einen neuen Sprungimpuls.
   * @param {number} deltaTimeSeconds
   * @param {Readonly<object>} input
   * @param {boolean} isOnGround
   * @param {Readonly<object>} config
   * @returns {Readonly<object>|null}
   */
  update(deltaTimeSeconds, input, isOnGround, config) {
    const isHeld = Boolean(input.jump);
    const wasPressed = this.#consumePress(input);
    if (!isOnGround) return this.#updateInAir(isHeld);
    if (isHeld) return this.#charge(deltaTimeSeconds, input);
    if (wasPressed) return this.#createLaunch(0, this.#getDirection(input), config);
    return this.#release(input, config);
  }

  /** Setzt die aktuelle Eingabefolge zurück. */
  reset() {
    this.chargeSeconds = 0;
    this.isCharging = false;
    this.wasJumpHeld = false;
    this.direction = 0;
  }

  /**
   * Verlängert die Ladezeit für feinere Sprungabstufungen.
   * @param {number} amountSeconds
   */
  increaseControl(amountSeconds) {
    if (!Number.isFinite(amountSeconds) || amountSeconds <= 0) {
      throw new TypeError("Die zusätzliche Sprungkontrolle ist ungültig.");
    }
    this.controlBonusSeconds += amountSeconds;
  }

  /** @param {Readonly<object>} config @returns {number} */
  getChargeRatio(config) {
    if (!this.isCharging) return 0;
    const duration = config.jumpChargeSeconds + this.controlBonusSeconds;
    return clamp(this.chargeSeconds / duration, 0, 1);
  }

  #charge(deltaTimeSeconds, input) {
    if (!this.wasJumpHeld) this.isCharging = true;
    this.wasJumpHeld = true;
    if (!this.isCharging) return null;
    this.direction = Number(input.right) - Number(input.left);
    this.chargeSeconds += deltaTimeSeconds;
    return null;
  }

  #release(input, config) {
    const shouldLaunch = this.wasJumpHeld && this.isCharging;
    this.wasJumpHeld = false;
    if (!shouldLaunch) return null;
    const ratio = this.getChargeRatio(config);
    const direction = this.direction || this.#getDirection(input);
    this.reset();
    return this.#createLaunch(ratio, direction, config);
  }

  #updateInAir(isHeld) {
    this.chargeSeconds = 0;
    this.isCharging = false;
    this.wasJumpHeld = isHeld;
    return null;
  }

  #getDirection(input) {
    return Number(input.right) - Number(input.left);
  }

  #consumePress(input) {
    if (typeof input.consumePress !== "function") return false;
    return input.consumePress("jump");
  }

  #createLaunch(ratio, direction, config) {
    const verticalRange = config.maximumJumpSpeedPixelsPerSecond -
      config.minimumJumpSpeedPixelsPerSecond;
    const horizontalRange = config.maximumJumpHorizontalSpeedPixelsPerSecond -
      config.minimumJumpHorizontalSpeedPixelsPerSecond;
    return Object.freeze({
      velocityX: direction *
        (config.minimumJumpHorizontalSpeedPixelsPerSecond + horizontalRange * ratio),
      velocityY: -(config.minimumJumpSpeedPixelsPerSecond + verticalRange * ratio),
    });
  }
}
