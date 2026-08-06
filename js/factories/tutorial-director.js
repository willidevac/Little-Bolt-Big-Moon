import { TutorialDirector } from
  "../../classes/systems/tutorial-director.class.js";
import { GAME_LEVEL_IDS } from "../config/level-config.js";
import { TUTORIAL_STEP_ORDER } from "../config/tutorial-config.js";

/**
 * Connects tutorial orchestration to the public game lifecycle.
 * @param {import("../../classes/core/game.class.js").Game} game
 * @returns {TutorialDirector}
 */
export function initializeTutorialDirector(game) {
  return new TutorialDirector(game, {
    levelId: GAME_LEVEL_IDS.TUTORIAL,
    steps: TUTORIAL_STEP_ORDER,
  }).initialize();
}
