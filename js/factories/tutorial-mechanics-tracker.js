import { TutorialMechanicsTracker } from
  "../../classes/systems/tutorial-mechanics-tracker.class.js";
import {
  TUTORIAL_PLATFORM_MECHANICS,
  TUTORIAL_STEP_IDS,
} from "../config/tutorial-config.js";

/** Connects environment lessons to production gameplay events. */
export function initializeTutorialMechanicsTracker(game, director) {
  return new TutorialMechanicsTracker(game, director, {
    wallStepId: TUTORIAL_STEP_IDS.WALL_REBOUND,
    platformStepId: TUTORIAL_STEP_IDS.PLATFORM_MECHANICS,
    requiredMechanics: TUTORIAL_PLATFORM_MECHANICS,
  }).initialize();
}
