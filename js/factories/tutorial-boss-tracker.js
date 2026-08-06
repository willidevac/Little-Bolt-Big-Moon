import { TutorialBossTracker } from
  "../../classes/systems/tutorial-boss-tracker.class.js";
import {
  TUTORIAL_BOSS_ID,
  TUTORIAL_STEP_IDS,
} from "../config/tutorial-config.js";

/** Connects the original tutorial boss defeat to the final lesson. */
export function initializeTutorialBossTracker(game, director) {
  return new TutorialBossTracker(game, director, {
    stepId: TUTORIAL_STEP_IDS.BOSS,
    bossId: TUTORIAL_BOSS_ID,
  }).initialize();
}
