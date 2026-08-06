import { UpgradeManager } from "./upgrade-manager.class.js";

const EMPTY_CONTEXT = Object.freeze({ didUnlockPath: false });

/**
 * Connects upgrade data to the five focused effects of a run.
 */
export class RunUpgradeFlow {
  #dependencies;
  #manager;
  #context;

  /**
   * Creates the configured system.
   * @param {Readonly<object>} data Source definitions used to configure the system.
   * @param {Readonly<object>} dependencies Dependencies used by constructor.
   */
  constructor(data, dependencies) {
    this.#validateDependencies(dependencies);
    this.#dependencies = dependencies;
    this.#manager = new UpgradeManager(data, this.#createEffects());
    this.#context = EMPTY_CONTEXT;
  }

  /**
   * Returns the current selection.
   * @returns {ReadonlyArray<Readonly<object>>}
   */
  getOptions() {
    return this.#manager.getSelection();
  }

  /**
   * Opens a selection when the world reports a completed wave.
   * @param {import("../core/world.class.js").World} world World used by open from.
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

  /** Returns the reason for the currently visible upgrade selection. */
  getContext() {
    return this.#context;
  }

  /**
   * Applies an offered upgrade.
   * @param {string} upgradeId Identifier of the selected upgrade.
   * @returns {Readonly<object>}
   */
  choose(upgradeId) {
    return this.#manager.choose(upgradeId);
  }

  /**
   * Begins a run without previous upgrade levels.
   */
  reset() {
    this.#manager.reset();
    this.#context = EMPTY_CONTEXT;
  }

  /** Creates effects. */
  #createEffects() {
    const systems = this.#dependencies;
    return Object.freeze({
      /**
       * Performs the maximum energy operation.
       * @param {Readonly<object>} value Value used by maximum energy.
       */
      maximumEnergy: (value) => systems.runStats.increaseMaximumEnergy(value),
      /**
       * Performs the wrench damage operation.
       * @param {Readonly<object>} value Value used by wrench damage.
       */
      wrenchDamage: (value) => {
        systems.weaponSystem.increaseDamage("repairWrench", value);
      },
      /**
       * Performs the arc charge capacity operation.
       * @param {Readonly<object>} value Value used by arc charge capacity.
       */
      arcChargeCapacity: (value) => systems.runStats.increaseArcChargeCapacity(value),
      /**
       * Performs the knockback resistance operation.
       * @param {Readonly<object>} value Value used by knockback resistance.
       */
      knockbackResistance: (value) => {
        systems.combatSystem.increaseKnockbackResistance(value);
      },
      /**
       * Performs the jump control operation.
       * @param {Readonly<object>} value Value used by jump control.
       */
      jumpControl: (value) => systems.getCharacter().increaseJumpControl(value),
    });
  }

  /**
   * Validates dependencies.
   * @param {Readonly<object>} dependencies Dependencies used by validate dependencies.
   */
  #validateDependencies(dependencies) {
    const methods = [
      dependencies?.runStats?.increaseMaximumEnergy,
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
