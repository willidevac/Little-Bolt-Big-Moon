import { clamp } from "../../js/utils/math.js";

/**
 * Charges a jump on the ground and returns its fixed impulse on release.
 */
export class PrecisionJumpController {
  /** Creates an empty jump charge without a requested direction. */
  constructor() {
    this.controlBonusSeconds = 0;
    this.reset();
  }

  /**
   * Updates the charge and returns at most one new jump impulse.
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

  /** Resets the current input sequence. */
  reset() {
    this.chargeSeconds = 0;
    this.isCharging = false;
    this.wasJumpHeld = false;
    this.direction = 0;
  }

  /**
   * Extends charge time to provide finer jump increments.
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

  /** Performs the charge operation. */
  #charge(deltaTimeSeconds, input) {
    if (!this.wasJumpHeld) this.isCharging = true;
    this.wasJumpHeld = true;
    if (!this.isCharging) return null;
    this.direction = Number(input.right) - Number(input.left);
    this.chargeSeconds += deltaTimeSeconds;
    return null;
  }

  /** Performs the release operation. */
  #release(input, config) {
    const shouldLaunch = this.wasJumpHeld && this.isCharging;
    this.wasJumpHeld = false;
    if (!shouldLaunch) return null;
    const ratio = this.getChargeRatio(config);
    const direction = this.direction || this.#getDirection(input);
    this.reset();
    return this.#createLaunch(ratio, direction, config);
  }

  /** Updates in air. */
  #updateInAir(isHeld) {
    this.chargeSeconds = 0;
    this.isCharging = false;
    this.wasJumpHeld = isHeld;
    return null;
  }

  /** Returns direction. */
  #getDirection(input) {
    return Number(input.right) - Number(input.left);
  }

  /** Performs the consume press operation. */
  #consumePress(input) {
    if (typeof input.consumePress !== "function") return false;
    return input.consumePress("jump");
  }

  /** Creates launch. */
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
