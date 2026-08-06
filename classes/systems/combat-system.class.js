/**
 * Coordinates a hit between its source, Byte, and the run's energy.
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
   * Processes exactly one valid hit.
   * @param {Readonly<{amount:number, direction:number}>} hit
   * @param {import("../entities/character.class.js").Character} character
   * @param {import("./run-stats.class.js").RunStats} runStats
   * @returns {boolean} Whether Byte accepted the hit.
   */
  applyHit(hit, character, runStats) {
    this.#validateHit(hit);
    if (!character?.receiveHit(hit.direction, this.#getReactionConfig())) return false;
    const remainingEnergy = runStats.takeDamage(hit.amount);
    if (remainingEnergy === 0) character.die();
    return true;
  }

  /**
   * Reduces Byte's knockback for the current run.
   * @param {number} amount Fraction between zero and one.
   */
  increaseKnockbackResistance(amount) {
    if (!Number.isFinite(amount) || amount <= 0 || amount >= 1) {
      throw new TypeError("Der Rückstoßwiderstand ist ungültig.");
    }
    this.knockbackMultiplier = Math.max(0.4, this.knockbackMultiplier - amount);
  }

  /**
   * Removes all run-specific combat upgrades.
   */
  reset() {
    this.knockbackMultiplier = 1;
  }

  /** Returns reaction config. */
  #getReactionConfig() {
    return Object.freeze({
      ...this.config,
      knockbackHorizontalPixelsPerSecond:
        this.config.knockbackHorizontalPixelsPerSecond * this.knockbackMultiplier,
      knockbackVerticalPixelsPerSecond:
        this.config.knockbackVerticalPixelsPerSecond * this.knockbackMultiplier,
    });
  }

  /** Validates hit. */
  #validateHit(hit) {
    const hasDamage = Number.isFinite(hit?.amount) && hit.amount > 0;
    const hasDirection = Number.isFinite(hit?.direction) &&
      Math.sign(hit.direction) !== 0;
    if (hasDamage && hasDirection) return;
    throw new TypeError("Der Treffer ist unvollständig oder ungültig.");
  }
}
