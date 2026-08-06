import { RunResetController } from
  "../../classes/systems/run-reset-controller.class.js";

/**
 * Connects run reset to a game's fixed systems.
 * @param {import("../../classes/core/game.class.js").Game} game
 * @param {() => import("../../classes/core/world.class.js").World} createWorld
 * @returns {RunResetController}
 */
export function createRunResetController(game, createWorld) {
  return new RunResetController({
    keyboard: game.keyboard,
    runStats: game.runStats,
    weaponSystem: game.weaponSystem,
    combatSystem: game.combatSystem,
    upgradeFlow: game.upgradeFlow,
    createWorld,
    /** Performs the replace world operation. */
    replaceWorld: (world) => { game.world = world; },
  });
}
