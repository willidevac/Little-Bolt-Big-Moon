import { TutorialCombatTracker } from
  "../../classes/systems/tutorial-combat-tracker.class.js";
import {
  TUTORIAL_COMBAT_ZONE_ID,
  TUTORIAL_STEP_IDS,
} from "../config/tutorial-config.js";

/**
 * Connects the tutorial combat lesson to its production wave.
 * @param {object} game Active game instance coordinated by the controller.
 * @param {object} director Tutorial director receiving encounter progress.
 */
export function initializeTutorialCombatTracker(game, director) {
  return new TutorialCombatTracker(game, director, {
    stepId: TUTORIAL_STEP_IDS.COMBAT,
    zoneId: TUTORIAL_COMBAT_ZONE_ID,
  }).initialize();
}
