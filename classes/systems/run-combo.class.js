/**
 * Verwaltet eine zeitlich begrenzte Aktionsserie ohne Wissen über Punktwerte.
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

  /** Beginnt einen Lauf ohne aktive Serie. */
  reset() {
    this.count = 0;
    this.multiplier = 1;
    this.remainingSeconds = 0;
    this.fallAnchorPixels = 0;
  }

  /**
   * Nimmt eine gültige Aktion auf und liefert ihren Multiplikator.
   * @returns {number}
   */
  recordActivity() {
    this.count += 1;
    this.multiplier = Math.min(this.config.maximumMultiplier, this.count);
    this.remainingSeconds = this.config.windowSeconds;
    return this.multiplier;
  }

  /**
   * Verarbeitet Leerlauf und Höhenverlust.
   * @param {number} deltaTimeSeconds
   * @param {number} heightLossPixels
   * @returns {boolean} Ob die sichtbare Serie beendet wurde.
   */
  update(deltaTimeSeconds, heightLossPixels) {
    this.#validateUpdate(deltaTimeSeconds, heightLossPixels);
    const timedOut = this.#updateTimer(deltaTimeSeconds);
    const fellTooFar = this.#updateFall(heightLossPixels);
    return timedOut || fellTooFar;
  }

  /**
   * Beendet eine aktive Serie, beispielsweise nach erlittenem Schaden.
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
   * Liefert den unveränderlichen Zustand für HUD und Tests.
   * @returns {Readonly<object>}
   */
  getSnapshot() {
    return Object.freeze({
      count: this.count,
      multiplier: this.multiplier,
      isActive: this.count > 0,
    });
  }

  #updateTimer(deltaTimeSeconds) {
    if (this.remainingSeconds <= 0) return false;
    this.remainingSeconds = Math.max(0, this.remainingSeconds - deltaTimeSeconds);
    if (this.remainingSeconds > 0) return false;
    return this.break();
  }

  #updateFall(heightLossPixels) {
    this.fallAnchorPixels = Math.min(this.fallAnchorPixels, heightLossPixels);
    const distance = heightLossPixels - this.fallAnchorPixels;
    if (distance < this.config.fallResetPixels) return false;
    const changed = this.break();
    this.fallAnchorPixels = heightLossPixels;
    return changed;
  }

  #validateUpdate(deltaTimeSeconds, heightLossPixels) {
    const values = [deltaTimeSeconds, heightLossPixels];
    if (values.every((value) => Number.isFinite(value) && value >= 0)) return;
    throw new TypeError("Combo-Zeit und Höhenverlust müssen positiv sein.");
  }

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
