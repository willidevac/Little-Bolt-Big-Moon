/**
 * Koordiniert einen Treffer zwischen Quelle, Byte und Laufenergie.
 */
export class CombatSystem {
  /**
   * @param {Readonly<object>} combatConfig
   */
  constructor(combatConfig) {
    this.config = combatConfig;
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
    if (!character?.receiveHit(hit.direction, this.config)) return false;
    const remainingEnergy = runStats.takeDamage(hit.amount);
    if (remainingEnergy === 0) character.die();
    return true;
  }

  #validateHit(hit) {
    const hasDamage = Number.isFinite(hit?.amount) && hit.amount > 0;
    const hasDirection = Number.isFinite(hit?.direction) &&
      Math.sign(hit.direction) !== 0;
    if (hasDamage && hasDirection) return;
    throw new TypeError("Der Treffer ist unvollständig oder ungültig.");
  }
}
