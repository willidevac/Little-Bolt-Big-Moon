import { TutorialCheckpointController } from
  "../../classes/systems/tutorial-checkpoint-controller.class.js";
import {
  TUTORIAL_CHECKPOINTS,
  TUTORIAL_BOSS_ZONE_ID,
  TUTORIAL_STEP_IDS,
  TUTORIAL_WEAPON_ID,
} from "../config/tutorial-config.js";

const WEAPON_CHECKPOINT_STEPS = Object.freeze([
  TUTORIAL_STEP_IDS.PRACTICE_TARGET,
  TUTORIAL_STEP_IDS.COMBAT,
  TUTORIAL_STEP_IDS.BOSS,
  TUTORIAL_STEP_IDS.COMPLETED,
]);
const ENCOUNTER_CHECKPOINT_STEPS = Object.freeze({
  [TUTORIAL_STEP_IDS.BOSS]: TUTORIAL_BOSS_ZONE_ID,
});

/**
 * Connects section recovery to tutorial progress and gameplay events.
 * @param {object} game Active game instance coordinated by the controller.
 * @param {object} director Tutorial director whose step controls recovery.
 */
export function initializeTutorialCheckpointController(game, director) {
  return new TutorialCheckpointController(game, director, {
    checkpoints: TUTORIAL_CHECKPOINTS,
    weaponSteps: WEAPON_CHECKPOINT_STEPS,
    weaponId: TUTORIAL_WEAPON_ID,
    encounterSteps: ENCOUNTER_CHECKPOINT_STEPS,
  }).initialize();
}
