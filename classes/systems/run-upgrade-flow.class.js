import { UpgradeManager } from "./upgrade-manager.class.js";

const EMPTY_CONTEXT = Object.freeze({ didUnlockPath: false });

/**
 * Verbindet Upgrade-Daten mit den fünf kleinen Effekten eines Laufs.
 */
export class RunUpgradeFlow {
  #dependencies;
  #manager;
  #context;

  /**
   * @param {Readonly<object>} data
   * @param {Readonly<object>} dependencies
   */
  constructor(data, dependencies) {
    this.#validateDependencies(dependencies);
    this.#dependencies = dependencies;
    this.#manager = new UpgradeManager(data, this.#createEffects());
    this.#context = EMPTY_CONTEXT;
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
    const completed = world.waveManager.takeCompletedWaves();
    const completedIds = completed.map(({ id }) => id);
    this.#dependencies.runStats.applyCombatPhases(completedIds);
    if (completedIds.length === 0) return false;
    this.#context = Object.freeze({
      didUnlockPath: completed.some(({ unlockPlatformId }) => unlockPlatformId),
    });
    return this.#manager.openSelection().length > 0;
  }

  /** Liefert den Grund für die gerade sichtbare Upgrade-Auswahl. */
  getContext() {
    return this.#context;
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
    this.#context = EMPTY_CONTEXT;
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
