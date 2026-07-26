import { clamp } from "../../js/utils/math.js";

/**
 * Hält die kleinen Zahlen eines einzelnen Laufs unabhängig von der Anzeige.
 */
export class RunStats {
  /**
   * @param {Readonly<object>} config
   * @param {number} startY
   */
  constructor(config, startY) {
    this.validateConfig(config, startY);
    this.config = config;
    this.startY = startY;
    this.reset();
  }

  /**
   * Setzt alle Laufwerte auf ihren konfigurierten Anfang zurück.
   */
  reset() {
    this.energy = this.config.startingEnergy;
    this.ammo = this.config.startingAmmo;
    this.gears = this.config.startingGears;
    this.score = this.config.startingScore;
    this.heightMeters = 0;
  }

  /**
   * Berechnet die aktuelle Höhe aus Bytes Weltposition.
   * @param {number} characterY
   * @returns {boolean} Ob sich die angezeigten Meter geändert haben.
   */
  updateHeight(characterY) {
    if (!Number.isFinite(characterY)) return false;
    const climbedPixels = Math.max(0, this.startY - characterY);
    const nextHeight = Math.floor(climbedPixels / this.config.heightPixelsPerMeter);
    if (nextHeight === this.heightMeters) return false;
    this.heightMeters = nextHeight;
    return true;
  }

  /**
   * Liefert eine unveränderliche Momentaufnahme für das HUD.
   * @returns {Readonly<object>}
   */
  getSnapshot() {
    return Object.freeze({
      energy: this.energy,
      maximumEnergy: this.config.maximumEnergy,
      ammo: this.ammo,
      gears: this.gears,
      heightMeters: this.heightMeters,
      score: this.score,
    });
  }

  /**
   * Prüft alle Werte, die für einen sicheren Start benötigt werden.
   * @param {Readonly<object>} config
   * @param {number} startY
   */
  validateConfig(config, startY) {
    const values = [
      config?.maximumEnergy,
      config?.startingEnergy,
      config?.startingAmmo,
      config?.startingGears,
      config?.startingScore,
      config?.heightPixelsPerMeter,
      startY,
    ];
    const hasValidNumbers = values.every((value) => {
      return Number.isFinite(value) && value >= 0;
    });
    if (hasValidNumbers && config.heightPixelsPerMeter > 0) {
      this.validateEnergy(config);
      return;
    }
    throw new TypeError("Die HUD-Startwerte sind unvollständig oder ungültig.");
  }

  /**
   * Verhindert einen Energiestart außerhalb der erlaubten Grenzen.
   * @param {Readonly<object>} config
   */
  validateEnergy(config) {
    const energy = clamp(config.startingEnergy, 0, config.maximumEnergy);
    if (energy === config.startingEnergy && config.maximumEnergy > 0) return;
    throw new RangeError("Die Startenergie liegt außerhalb des erlaubten Bereichs.");
  }
}
