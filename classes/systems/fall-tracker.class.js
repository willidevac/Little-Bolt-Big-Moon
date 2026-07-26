/**
 * Misst Höhenverlust und erkennt die Todeszone unterhalb der Welt.
 */
export class FallTracker {
  #deathZoneY;
  #highestSafeY;
  #heightLossPixels;

  /**
   * @param {Readonly<object>} worldConfig
   */
  constructor(worldConfig) {
    this.#validateWorldConfig(worldConfig);
    this.#deathZoneY = worldConfig.height + worldConfig.deathZoneOffsetPixels;
    this.#highestSafeY = null;
    this.#heightLossPixels = 0;
  }

  /**
   * Beginnt die Messung an der aktuellen Position einer Figur neu.
   * @param {{y:number,isOnGround:boolean}} target
   */
  reset(target) {
    this.#validateTarget(target);
    this.#highestSafeY = target.isOnGround ? target.y : null;
    this.#heightLossPixels = 0;
  }

  /**
   * Aktualisiert höchste sichere Position und aktuellen Höhenverlust.
   * @param {{y:number,isOnGround:boolean}} target
   * @returns {number} Aktuell verlorene Höhe in Weltpixeln.
   */
  update(target) {
    this.#validateTarget(target);
    if (target.isOnGround) this.#recordSafeHeight(target.y);
    if (this.#highestSafeY === null) return 0;
    this.#heightLossPixels = Math.max(0, target.y - this.#highestSafeY);
    return this.#heightLossPixels;
  }

  /**
   * Prüft, ob eine Figur vollständig unter die sichere Welt gefallen ist.
   * @param {{y:number,isOnGround:boolean}} target
   * @returns {boolean}
   */
  hasReachedDeathZone(target) {
    this.#validateTarget(target);
    return target.y >= this.#deathZoneY;
  }

  /**
   * Liefert den aktuellen Höhenverlust.
   * @returns {number}
   */
  getHeightLossPixels() {
    return this.#heightLossPixels;
  }

  #recordSafeHeight(targetY) {
    if (this.#highestSafeY === null) this.#highestSafeY = targetY;
    else this.#highestSafeY = Math.min(this.#highestSafeY, targetY);
  }

  #validateWorldConfig(config) {
    const hasHeight = Number.isFinite(config?.height) && config.height > 0;
    const hasOffset = Number.isFinite(config?.deathZoneOffsetPixels) &&
      config.deathZoneOffsetPixels >= 0;
    if (hasHeight && hasOffset) return;
    throw new TypeError("Die Todeszonen-Konfiguration ist ungültig.");
  }

  #validateTarget(target) {
    const hasPosition = Number.isFinite(target?.y);
    if (hasPosition && typeof target.isOnGround === "boolean") return;
    throw new TypeError("Das Fallziel benötigt Position und Bodenstatus.");
  }
}
