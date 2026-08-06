import { TutorialMovementTracker } from
  "../../classes/systems/tutorial-movement-tracker.class.js";
import {
  TUTORIAL_JUMP_THRESHOLDS,
  TUTORIAL_STEP_IDS,
} from "../config/tutorial-config.js";

/**
 * Connects movement lessons to production gameplay events.
 * @param {object} game Active game instance coordinated by the controller.
 * @param {object} director Tutorial director receiving movement progress.
 */
export function initializeTutorialMovementTracker(game, director) {
  return new TutorialMovementTracker(game, director, {
    movementStepId: TUTORIAL_STEP_IDS.MOVEMENT,
    shortJumpStepId: TUTORIAL_STEP_IDS.SHORT_JUMP,
    chargedJumpStepId: TUTORIAL_STEP_IDS.CHARGED_JUMP,
    ...TUTORIAL_JUMP_THRESHOLDS,
  }).initialize();
}
