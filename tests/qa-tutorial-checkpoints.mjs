import assert from "node:assert/strict";
import { GAME_STATES } from "../classes/core/game-state-machine.class.js";
import { GAMEPLAY_EVENTS } from
  "../classes/core/gameplay-event-hub.class.js";
import { initializeTutorialDirector } from
  "../js/factories/tutorial-director.js";
import { initializeTutorialCheckpointController } from
  "../js/factories/tutorial-checkpoint-controller.js";

assertCheckpointRecovery();

console.log("TUTORIAL-009: Abschnitts-Checkpoints für Sturz und Niederlage bestanden.");

/** Verifies latest-position recovery, weapon restore, and cleanup. */
function assertCheckpointRecovery() {
  const game = createGameFixture();
  const director = initializeTutorialDirector(game);
  const checkpoints = initializeTutorialCheckpointController(game, director);
  game.emitState(GAME_STATES.PLAYING, "tutorial");
  game.emitGameplay(GAMEPLAY_EVENTS.PLAYER_FALL);
  assert.deepEqual(game.restarts, [{ x: 560, y: 1353 }]);
  advanceToCombat(director);
  game.emitGameplay(GAMEPLAY_EVENTS.PLAYER_DEATH);
  assert.deepEqual(game.restarts.at(-1), { x: 500, y: 35 });
  assert.deepEqual(game.restoredWeapons, ["boltThrower"]);
  checkpoints.destroy();
  game.emitGameplay(GAMEPLAY_EVENTS.PLAYER_FALL);
  assert.equal(game.restarts.length, 2);
  director.destroy();
}

/** Completes every lesson before combat to select its checkpoint. */
function advanceToCombat(director) {
  ["movement", "resources", "shortJump", "chargedJump", "wallRebound",
    "platformMechanics", "weaponPickup", "practiceTarget"]
    .forEach((step) => director.completeStep(step));
}

/** Creates a recoverable game fixture with semantic event channels. */
function createGameFixture() {
  const stateListeners = new Set();
  const gameplayListeners = new Set();
  const game = {
    state: GAME_STATES.HOME, levelId: "main", restarts: [], restoredWeapons: [],
    onStateChange: (listener) => register(stateListeners, listener),
    onGameplayEvent: (listener) => register(gameplayListeners, listener),
    restartWorldAt(position) {
      this.restarts.push({ ...position });
      return true;
    },
    emitState(state, levelId) {
      Object.assign(this, { state, levelId });
      stateListeners.forEach((listener) => listener(state));
    },
    emitGameplay(type, detail = {}) {
      const event = Object.freeze({ type, detail: Object.freeze(detail) });
      gameplayListeners.forEach((listener) => listener(event));
    },
  };
  game.gameplayEvents = createEventCommands(game, gameplayListeners);
  return game;
}

/** Creates commands that record restored weapons and notify observers. */
function createEventCommands(game, listeners) {
  return {
    emit(type, detail) {
      if (type === GAMEPLAY_EVENTS.PICKUP) {
        game.restoredWeapons.push(detail.weaponId);
      }
      const event = Object.freeze({ type, detail: Object.freeze(detail) });
      listeners.forEach((listener) => listener(event));
    },
  };
}

/** Registers a fixture observer and returns its unsubscribe command. */
function register(listeners, listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
