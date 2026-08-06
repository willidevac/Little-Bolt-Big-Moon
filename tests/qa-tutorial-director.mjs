import assert from "node:assert/strict";
import { GAME_STATES } from "../classes/core/game-state-machine.class.js";
import {
  TutorialDirector,
  TUTORIAL_STATUSES,
} from "../classes/systems/tutorial-director.class.js";
import { TUTORIAL_STEP_ORDER } from "../js/config/tutorial-config.js";
import { initializeTutorialDirector } from
  "../js/factories/tutorial-director.js";

const game = createFakeGame();
const director = new TutorialDirector(game, {
  levelId: "tutorial",
  steps: TUTORIAL_STEP_ORDER,
});
const snapshots = [];
director.onChange((snapshot) => snapshots.push(snapshot));

assert.equal(director.initialize(), director);
assert.equal(director.initialize(), director);
assertInactive(director.getSnapshot());
game.emit(GAME_STATES.PLAYING, "main");
assert.equal(snapshots.length, 0);
game.emit(GAME_STATES.PLAYING, "tutorial");
assertActive(director.getSnapshot(), TUTORIAL_STEP_ORDER[0], 0);
assert.equal(director.completeStep("wrong"), false);
game.emit(GAME_STATES.PAUSED, "tutorial");
assertActive(director.getSnapshot(), TUTORIAL_STEP_ORDER[0], 0);
completeTutorial(director);
assertCompleted(director.getSnapshot());
game.emit(GAME_STATES.HOME, "tutorial");
assertInactive(director.getSnapshot());
assertBufferedCompletion(director, game);
game.emit(GAME_STATES.HOME, "tutorial");
assert.ok(snapshots.every(Object.isFrozen));
director.destroy();
game.emit(GAME_STATES.PLAYING, "tutorial");
assertInactive(director.getSnapshot());
assertFactoryWiring();

console.log("TUTORIAL-003: Der TutorialDirector verwaltet den linearen Lebenszyklus.");

/** Verifies the production factory and configured tutorial level ID. */
function assertFactoryWiring() {
  const factoryGame = createFakeGame();
  const factoryDirector = initializeTutorialDirector(factoryGame);
  factoryGame.emit(GAME_STATES.PLAYING, "tutorial");
  assertActive(factoryDirector.getSnapshot(), "movement", 0);
  factoryDirector.destroy();
}

/** Completes every non-terminal tutorial step in order. */
function completeTutorial(directorToComplete) {
  TUTORIAL_STEP_ORDER.slice(0, -1).forEach((stepId, index) => {
    assert.equal(directorToComplete.completeStep(stepId), true);
    const snapshot = directorToComplete.getSnapshot();
    if (index < TUTORIAL_STEP_ORDER.length - 2) {
      assertActive(snapshot, TUTORIAL_STEP_ORDER[index + 1], index + 1);
    }
  });
}

/** Verifies future evidence advances only after every earlier lesson is done. */
function assertBufferedCompletion(directorToComplete, activeGame) {
  activeGame.emit(GAME_STATES.PLAYING, "tutorial");
  assert.equal(directorToComplete.recordStepCompletion("combat"), true);
  assert.equal(directorToComplete.recordStepCompletion("combat"), false);
  assert.equal(directorToComplete.recordStepCompletion("boss"), true);
  assert.equal(directorToComplete.recordStepCompletion("completed"), false);
  assert.equal(directorToComplete.recordStepCompletion("unknown"), false);
  directorToComplete.recordStepCompletion("shortJump");
  directorToComplete.recordStepCompletion("resources");
  directorToComplete.completeStep("movement");
  assertActive(directorToComplete.getSnapshot(), "chargedJump", 3);
  ["chargedJump", "wallRebound", "platformMechanics", "weaponPickup",
    "practiceTarget"].forEach((step) => directorToComplete.completeStep(step));
  assertCompleted(directorToComplete.getSnapshot());
}

/** Verifies an inactive snapshot. */
function assertInactive(snapshot) {
  assert.equal(snapshot.status, TUTORIAL_STATUSES.INACTIVE);
  assert.equal(snapshot.stepId, null);
  assert.equal(snapshot.stepIndex, -1);
}

/** Verifies one active step snapshot. */
function assertActive(snapshot, stepId, index) {
  assert.equal(snapshot.status, TUTORIAL_STATUSES.ACTIVE);
  assert.equal(snapshot.stepId, stepId);
  assert.equal(snapshot.stepIndex, index);
}

/** Verifies the terminal tutorial snapshot. */
function assertCompleted(snapshot) {
  assert.equal(snapshot.status, TUTORIAL_STATUSES.COMPLETED);
  assert.equal(snapshot.stepId, "completed");
  assert.equal(snapshot.completedSteps, TUTORIAL_STEP_ORDER.length - 1);
  assert.equal(snapshot.totalSteps, TUTORIAL_STEP_ORDER.length - 1);
}

/** Creates a minimal observable game lifecycle fixture. */
function createFakeGame() {
  const listeners = new Set();
  return {
    state: GAME_STATES.HOME,
    levelId: "main",
    onStateChange(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    emit(state, levelId) {
      this.state = state;
      this.levelId = levelId;
      listeners.forEach((listener) => listener(state));
    },
  };
}
