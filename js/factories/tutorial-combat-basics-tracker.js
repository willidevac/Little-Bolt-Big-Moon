import { TutorialCombatBasicsTracker } from
  "../../classes/systems/tutorial-combat-basics-tracker.class.js";
import {
  TUTORIAL_PRACTICE_TARGET_ID,
  TUTORIAL_STEP_IDS,
  TUTORIAL_WEAPON_ID,
} from "../config/tutorial-config.js";

/** Connects weapon onboarding to production pickup and defeat events. */
export function initializeTutorialCombatBasicsTracker(game, director) {
  return new TutorialCombatBasicsTracker(game, director, {
    weaponStepId: TUTORIAL_STEP_IDS.WEAPON_PICKUP,
    targetStepId: TUTORIAL_STEP_IDS.PRACTICE_TARGET,
    weaponId: TUTORIAL_WEAPON_ID,
    targetId: TUTORIAL_PRACTICE_TARGET_ID,
  }).initialize();
}
