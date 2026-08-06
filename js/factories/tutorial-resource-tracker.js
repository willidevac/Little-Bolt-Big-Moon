import { TutorialResourceTracker } from
  "../../classes/systems/tutorial-resource-tracker.class.js";
import {
  TUTORIAL_RESOURCE_PICKUP_TYPES,
  TUTORIAL_STEP_IDS,
} from "../config/tutorial-config.js";

/** Connects production pickup events to the resource lesson. */
export function initializeTutorialResourceTracker(game, director) {
  return new TutorialResourceTracker(game, director, {
    stepId: TUTORIAL_STEP_IDS.RESOURCES,
    requiredTypes: TUTORIAL_RESOURCE_PICKUP_TYPES,
  }).initialize();
}
