/**
 * Koordiniert einen Treffer zwischen Quelle, Byte und Laufenergie.
 */
export class CombatSystem {
  /**
   * @param {Readonly<object>} combatConfig
   */
  constructor(combatConfig) {
    this.config = combatConfig;
    this.reset();
  }

  /**
   * Verarbeitet genau einen gültigen Treffer.
   * @param {Readonly<{amount:number, direction:number}>} hit
   * @param {import("../entities/character.class.js").Character} character
   * @param {import("./run-stats.class.js").RunStats} runStats
   * @returns {boolean} Ob Byte den Treffer angenommen hat.
   */
  applyHit(hit, character, runStats) {
    this.#validateHit(hit);
    if (!character?.receiveHit(hit.direction, this.#getReactionConfig())) return false;
    const remainingEnergy = runStats.takeDamage(hit.amount);
    if (remainingEnergy === 0) character.die();
    return true;
  }

  /**
   * Verringert Bytes Rückstoß für den aktuellen Lauf.
   * @param {number} amount Anteil zwischen null und eins.
   */
  increaseKnockbackResistance(amount) {
    if (!Number.isFinite(amount) || amount <= 0 || amount >= 1) {
      throw new TypeError("Der Rückstoßwiderstand ist ungültig.");
    }
    this.knockbackMultiplier = Math.max(0.4, this.knockbackMultiplier - amount);
  }

  /**
   * Entfernt alle laufbezogenen Kampfverbesserungen.
   */
  reset() {
    this.knockbackMultiplier = 1;
  }

  #getReactionConfig() {
    return Object.freeze({
      ...this.config,
      knockbackHorizontalPixelsPerSecond:
        this.config.knockbackHorizontalPixelsPerSecond * this.knockbackMultiplier,
      knockbackVerticalPixelsPerSecond:
        this.config.knockbackVerticalPixelsPerSecond * this.knockbackMultiplier,
    });
  }

  #validateHit(hit) {
    const hasDamage = Number.isFinite(hit?.amount) && hit.amount > 0;
    const hasDirection = Number.isFinite(hit?.direction) &&
      Math.sign(hit.direction) !== 0;
    if (hasDamage && hasDirection) return;
    throw new TypeError("Der Treffer ist unvollständig oder ungültig.");
  }
}
