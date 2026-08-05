import { Game } from "../../classes/core/game.class.js";
import { GAME_CONFIG } from "../config/game-config.js";
import { createLevelOne } from "../levels/level-01.js";
import { createGameCombatSystems } from "../factories/game-combat-systems.js";
import { createRunResetController } from "../factories/run-reset-controller.js";

/**
 * Creates a game with the production level and system factories.
 * @param {HTMLCanvasElement} canvas
 * @param {Readonly<object>} [config=GAME_CONFIG]
 * @param {EventTarget} [inputTarget=globalThis]
 * @returns {Game}
 */
export function createGame(
  canvas,
  config = GAME_CONFIG,
  inputTarget = globalThis,
) {
  return new Game(canvas, config, inputTarget, {
    createLevel: () => createLevelOne(config.enemies),
    createCombatSystems: createGameCombatSystems,
    createResetController: createRunResetController,
  });
}
