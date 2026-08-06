import { LevelSelection } from
  "../../classes/core/level-selection.class.js";
import { GAME_LEVEL_IDS } from "../config/level-config.js";
import { createLevelOne } from "./level-01.js";

/**
 * Creates the production level selection at the application boundary.
 * @param {Readonly<object>} enemyConfig
 * @returns {LevelSelection}
 */
export function createGameLevelSelection(enemyConfig) {
  return new LevelSelection({
    /** Creates the main game level. */
    [GAME_LEVEL_IDS.MAIN]: () => createLevelOne(enemyConfig),
  }, GAME_LEVEL_IDS.MAIN);
}
