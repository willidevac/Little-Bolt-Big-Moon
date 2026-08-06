/** Rebuilds the world for a restart and clears all run states. */
export class RunResetController {
  #dependencies;

  /**
   * Creates the configured system.
   * @param {ReadonlyArray<object>} dependencies Dependencies used while constructor.
   */
  constructor(dependencies) {
    this.#dependencies = Object.freeze({ ...dependencies });
  }

  /**
   * Replaces an old world with a completely reset new world.
   * @param {import("../core/world.class.js").World} currentWorld Current world used while restart.
   * @param {Readonly<{x:number,y:number}>|null} [startPosition=null] Start position used while restart.
   * @returns {import("../core/world.class.js").World}
   */
  restart(currentWorld, startPosition = null) {
    const { keyboard, createWorld, replaceWorld } = this.#dependencies;
    currentWorld.destroy();
    keyboard.reset();
    const nextWorld = createWorld();
    replaceWorld(nextWorld);
    nextWorld.initialize();
    if (startPosition) nextWorld.placeCharacterAt(startPosition);
    this.#resetSystems(nextWorld);
    return nextWorld;
  }

  /**
   * Clears systems.
   * @param {Readonly<object>} world Active world providing entities and runtime state.
   */
  #resetSystems(world) {
    const systems = this.#dependencies;
    const startY = world.level?.playerStart?.y ?? 0;
    systems.runStats.reset(startY);
    systems.weaponSystem.reset();
    systems.combatSystem.reset();
    systems.upgradeFlow.reset();
  }
}
