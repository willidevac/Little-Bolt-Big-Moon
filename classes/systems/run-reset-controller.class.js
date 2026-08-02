/** Baut für einen Neustart die Welt neu auf und leert alle Laufzustände. */
export class RunResetController {
  #dependencies;

  /** @param {Readonly<object>} dependencies */
  constructor(dependencies) {
    this.#dependencies = Object.freeze({ ...dependencies });
  }

  /**
   * Ersetzt eine alte Welt durch eine vollständig zurückgesetzte neue Welt.
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

  #resetSystems(world) {
    const systems = this.#dependencies;
    const startY = world.level?.playerStart?.y ?? 0;
    systems.runStats.reset(startY);
    systems.weaponSystem.reset();
    systems.combatSystem.reset();
    systems.upgradeFlow.reset();
  }
}
