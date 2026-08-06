import { LevelSelection } from
  "../../classes/core/level-selection.class.js";
import { GAME_LEVEL_IDS } from "../config/level-config.js";
import { createLevelOne } from "./level-01.js";
import { createTutorialLevel } from "./tutorial-level.js";

/**
 * Creates the production level selection at the application boundary.
 * @param {Readonly<object>} enemyConfig Enemy definitions used to populate the level.
 * @returns {LevelSelection}
 */
export function createGameLevelSelection(enemyConfig) {
  return new LevelSelection({
    /** Creates the main game level. */
    [GAME_LEVEL_IDS.MAIN]: () => createLevelOne(enemyConfig),
    /** Creates the tutorial level. */
    [GAME_LEVEL_IDS.TUTORIAL]: () => createTutorialLevel(enemyConfig),
  }, GAME_LEVEL_IDS.MAIN);
}
