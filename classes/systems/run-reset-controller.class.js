/** Rebuilds the world for a restart and clears all run states. */
export class RunResetController {
  #dependencies;

  /** @param {Readonly<object>} dependencies */
  constructor(dependencies) {
    this.#dependencies = Object.freeze({ ...dependencies });
  }

  /**
   * Replaces an old world with a completely reset new world.
   * @param {import("../core/world.class.js").World} currentWorld
   * @returns {import("../core/world.class.js").World}
   */
  restart(currentWorld) {
    const { keyboard, createWorld, replaceWorld } = this.#dependencies;
    currentWorld.destroy();
    keyboard.reset();
    const nextWorld = createWorld();
    replaceWorld(nextWorld);
    nextWorld.initialize();
    this.#resetSystems(nextWorld);
    return nextWorld;
  }

  /** Clears systems. */
  #resetSystems(world) {
    const systems = this.#dependencies;
    const startY = world.level?.playerStart?.y ?? 0;
    systems.runStats.reset(startY);
    systems.weaponSystem.reset();
    systems.combatSystem.reset();
    systems.upgradeFlow.reset();
  }
}
