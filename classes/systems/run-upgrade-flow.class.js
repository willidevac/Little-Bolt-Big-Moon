import { UpgradeManager } from "./upgrade-manager.class.js";

/**
 * Verbindet Upgrade-Daten mit den fünf kleinen Effekten eines Laufs.
 */
export class RunUpgradeFlow {
  #dependencies;
  #manager;

  /**
   * @param {Readonly<object>} data
   * @param {Readonly<object>} dependencies
   */
  constructor(data, dependencies) {
    this.#validateDependencies(dependencies);
    this.#dependencies = dependencies;
    this.#manager = new UpgradeManager(data, this.#createEffects());
  }

  /**
   * Liefert die aktuelle Auswahl.
   * @returns {ReadonlyArray<Readonly<object>>}
   */
  getOptions() {
    return this.#manager.getSelection();
  }

  /**
   * Öffnet eine Auswahl, sobald die Welt einen Wellenabschluss meldet.
   * @param {import("../core/world.class.js").World} world
   * @returns {boolean}
   */
  openFrom(world) {
    const completedIds = world.waveManager.takeCompletedWaveIds();
    this.#dependencies.runStats.applyCombatPhases(completedIds);
    if (completedIds.length === 0) return false;
    return this.#manager.openSelection().length > 0;
  }

  /**
   * Wendet eine angebotene Verbesserung an.
   * @param {string} upgradeId
   * @returns {Readonly<object>}
   */
  choose(upgradeId) {
    return this.#manager.choose(upgradeId);
  }

  /**
   * Beginnt einen Lauf ohne alte Verbesserungsstufen.
   */
  reset() {
    this.#manager.reset();
  }

  #createEffects() {
    const systems = this.#dependencies;
    return Object.freeze({
      maximumEnergy: (value) => systems.runStats.increaseMaximumEnergy(value),
      wrenchDamage: (value) => {
        systems.weaponSystem.increaseDamage("repairWrench", value);
      },
      ammoCapacity: (value) => this.#increaseAmmoCapacity(value),
      knockbackResistance: (value) => {
        systems.combatSystem.increaseKnockbackResistance(value);
      },
      jumpControl: (value) => systems.getCharacter().increaseJumpControl(value),
    });
  }

  #increaseAmmoCapacity(value) {
    this.#dependencies.runStats.increaseAmmoCapacity(value);
    this.#dependencies.runStats.increaseArcChargeCapacity(1);
  }

  #validateDependencies(dependencies) {
    const methods = [
      dependencies?.runStats?.increaseMaximumEnergy,
      dependencies?.runStats?.increaseAmmoCapacity,
      dependencies?.runStats?.increaseArcChargeCapacity,
      dependencies?.runStats?.applyCombatPhases,
      dependencies?.weaponSystem?.increaseDamage,
      dependencies?.combatSystem?.increaseKnockbackResistance,
      dependencies?.getCharacter,
    ];
    if (methods.every((method) => typeof method === "function")) return;
    throw new TypeError("Dem Upgrade-Ablauf fehlen benötigte Spielsysteme.");
  }
}
