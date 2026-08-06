import assert from "node:assert/strict";
import { GAME_CONFIG } from "../js/config/game-config.js";
import { GAME_STATES } from "../classes/core/game-state-machine.class.js";
import { GAMEPLAY_EVENTS } from
  "../classes/core/gameplay-event-hub.class.js";
import { RunStats } from "../classes/systems/run-stats.class.js";
import { createTutorialLevel } from "../js/levels/tutorial-level.js";
import { initializeTutorialDirector } from
  "../js/factories/tutorial-director.js";
import { initializeTutorialResourceTracker } from
  "../js/factories/tutorial-resource-tracker.js";

assertPickupPlacement();
assertResourceEffects();
assertLessonProgression();

console.log("TUTORIAL-012: Energie- und Zahnradlektion bestanden.");

/** Verifies two safe production pickups around the tutorial start. */
function assertPickupPlacement() {
  const level = createTutorialLevel();
  const pickups = level.collectables.filter(({ type }) => {
    return ["gear", "energy"].includes(type);
  });
  assert.deepEqual(pickups.map(({ type }) => type), ["gear", "energy"]);
  assert.ok(pickups[0].x < level.playerStart.x);
  assert.ok(pickups[1].x > level.playerStart.x);
  pickups.forEach((pickup) => {
    assert.equal(pickup.anchorPlatformId, "tutorial-floor");
    assert.equal(pickup.y + pickup.height, pickup.anchorPlatform.y);
  });
}

/** Verifies the existing HUD resources receive their documented effects. */
function assertResourceEffects() {
  const stats = new RunStats(GAME_CONFIG.hud, 1353);
  stats.takeDamage(30);
  stats.applyPickups([
    { type: "gear", amount: 1 },
    { type: "energy", amount: 25 },
  ]);
  const snapshot = stats.getSnapshot();
  assert.equal(snapshot.energy, snapshot.maximumEnergy - 5);
  assert.equal(snapshot.gears, 1);
}

/** Verifies both pickups are required and evidence resets between runs. */
function assertLessonProgression() {
  const game = createGameFixture();
  const director = initializeTutorialDirector(game);
  const tracker = initializeTutorialResourceTracker(game, director);
  game.emitState(GAME_STATES.PLAYING, "tutorial");
  game.emitPickup("gear");
  game.emitPickup("gear");
  game.emitPickup("arcCharge");
  game.emitPickup("energy");
  director.completeStep("movement");
  assert.equal(director.getSnapshot().stepId, "shortJump");
  game.emitState(GAME_STATES.HOME, "tutorial");
  game.emitState(GAME_STATES.PLAYING, "tutorial");
  game.emitPickup("energy");
  director.completeStep("movement");
  assert.equal(director.getSnapshot().stepId, "resources");
  game.emitPickup("gear");
  assert.equal(director.getSnapshot().stepId, "shortJump");
  tracker.destroy();
  director.destroy();
}

/** Creates state and gameplay event channels for the production trackers. */
function createGameFixture() {
  const stateListeners = new Set();
  const gameplayListeners = new Set();
  return {
    state: GAME_STATES.HOME,
    levelId: "main",
    onStateChange: (listener) => register(stateListeners, listener),
    onGameplayEvent: (listener) => register(gameplayListeners, listener),
    emitState(state, levelId) {
      Object.assign(this, { state, levelId });
      stateListeners.forEach((listener) => listener(state));
    },
    emitPickup(type) {
      const event = Object.freeze({
        type: GAMEPLAY_EVENTS.PICKUP,
        detail: Object.freeze({ type, amount: 1 }),
      });
      gameplayListeners.forEach((listener) => listener(event));
    },
  };
}

/** Registers one fixture observer. */
function register(listeners, listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
