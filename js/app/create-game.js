import { Game } from "../../classes/core/game.class.js";
import { GAME_CONFIG } from "../config/game-config.js";
import { createGameLevelSelection } from
  "../levels/game-level-selection.js";
import { createGameCombatSystems } from "../factories/game-combat-systems.js";
import { createRunResetController } from "../factories/run-reset-controller.js";

/**
 * Creates a game with the production level and system factories.
 * @param {HTMLCanvasElement} canvas
 * @param {Readonly<object>} [config=GAME_CONFIG]
 * @param {EventTarget} [inputTarget=globalThis]
 * @param {import("../../classes/core/level-selection.class.js").LevelSelection} [levelSelection]
 * @returns {Game}
 */
export function createGame(
  canvas,
  config = GAME_CONFIG,
  inputTarget = globalThis,
  levelSelection = createGameLevelSelection(config.enemies),
) {
  return new Game(canvas, config, inputTarget, {
    levelSelection,
    createCombatSystems: createGameCombatSystems,
    createResetController: createRunResetController,
  });
}
