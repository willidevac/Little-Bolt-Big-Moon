import { Game } from "../../classes/core/game.class.js";
import { GAME_CONFIG } from "../config/game-config.js";
import { createGameLevelSelection } from
  "../levels/game-level-selection.js";
import { createGameCombatSystems } from "../factories/game-combat-systems.js";
import { createRunResetController } from "../factories/run-reset-controller.js";

/**
 * Creates a game with the production level and system factories.
 * @param {HTMLCanvasElement} canvas Canvas used to render the game.
 * @param {Readonly<object>} [config=GAME_CONFIG] Configuration values used to construct the requested component.
 * @param {EventTarget} [inputTarget=globalThis] Event target that receives keyboard input.
 * @param {import("../../classes/core/level-selection.class.js").LevelSelection} [levelSelection] Level-selection strategy used to create playable worlds.
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
