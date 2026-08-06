/**
 * Manages a time-limited action chain without knowing score values.
 */
export class RunCombo {
  /**
   * @param {Readonly<object>} config
   */
  constructor(config) {
    this.#validateConfig(config);
    this.config = config;
    this.reset();
  }

  /** Begins a run without an active chain. */
  reset() {
    this.count = 0;
    this.multiplier = 1;
    this.remainingSeconds = 0;
    this.fallAnchorPixels = 0;
  }

  /**
   * Records a valid action and returns its multiplier.
   * @returns {number}
   */
  recordActivity() {
    this.count += 1;
    this.multiplier = Math.min(this.config.maximumMultiplier, this.count);
    this.remainingSeconds = this.config.windowSeconds;
    return this.multiplier;
  }

  /**
   * Processes idle time and height loss.
   * @param {number} deltaTimeSeconds
   * @param {number} heightLossPixels
   * @returns {boolean} Whether the visible chain ended.
   */
  update(deltaTimeSeconds, heightLossPixels) {
    this.#validateUpdate(deltaTimeSeconds, heightLossPixels);
    const timedOut = this.#updateTimer(deltaTimeSeconds);
    const fellTooFar = this.#updateFall(heightLossPixels);
    return timedOut || fellTooFar;
  }

  /**
   * Ends an active chain, for example after taking damage.
   * @returns {boolean}
   */
  break() {
    if (this.count === 0) return false;
    this.count = 0;
    this.multiplier = 1;
    this.remainingSeconds = 0;
    return true;
  }

  /**
   * Returns the immutable state for the HUD and tests.
   * @returns {Readonly<object>}
   */
  getSnapshot() {
    return Object.freeze({
      count: this.count,
      multiplier: this.multiplier,
      isActive: this.count > 0,
    });
  }

  /** Updates timer. */
  #updateTimer(deltaTimeSeconds) {
    if (this.remainingSeconds <= 0) return false;
    this.remainingSeconds = Math.max(0, this.remainingSeconds - deltaTimeSeconds);
    if (this.remainingSeconds > 0) return false;
    return this.break();
  }

  /** Updates fall. */
  #updateFall(heightLossPixels) {
    this.fallAnchorPixels = Math.min(this.fallAnchorPixels, heightLossPixels);
    const distance = heightLossPixels - this.fallAnchorPixels;
    if (distance < this.config.fallResetPixels) return false;
    const changed = this.break();
    this.fallAnchorPixels = heightLossPixels;
    return changed;
  }

  /** Validates update. */
  #validateUpdate(deltaTimeSeconds, heightLossPixels) {
    const values = [deltaTimeSeconds, heightLossPixels];
    if (values.every((value) => Number.isFinite(value) && value >= 0)) return;
    throw new TypeError("Combo-Zeit und Höhenverlust müssen positiv sein.");
  }

  /** Validates config. */
  #validateConfig(config) {
    const values = [
      config?.windowSeconds,
      config?.maximumMultiplier,
      config?.fallResetPixels,
    ];
    const hasPositiveValues = values.every((value) => {
      return Number.isFinite(value) && value > 0;
    });
    if (hasPositiveValues && Number.isInteger(config.maximumMultiplier)) return;
    throw new TypeError("Die Combo-Konfiguration ist unvollständig oder ungültig.");
  }
}
