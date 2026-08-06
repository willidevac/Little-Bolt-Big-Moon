import assert from "node:assert/strict";
import { GAME_STATES } from "../classes/core/game-state-machine.class.js";
import {
  GameplayEventHub,
  GAMEPLAY_EVENTS,
} from "../classes/core/gameplay-event-hub.class.js";
import { WorldEventReporter } from
  "../classes/systems/world-event-reporter.class.js";
import { initializeTutorialDirector } from
  "../js/factories/tutorial-director.js";
import { initializeTutorialMovementTracker } from
  "../js/factories/tutorial-movement-tracker.js";

assertMovementReporting();
assertLessonProgression();

console.log("TUTORIAL-004: Bewegung sowie kurze und geladene Sprünge werden erkannt.");

/** Verifies semantic movement events after actual position changes. */
function assertMovementReporting() {
  const events = new GameplayEventHub();
  const received = [];
  events.on((event) => received.push(event));
  const reporter = new WorldEventReporter(events);
  reportMovement(reporter, 100, 104, 1);
  reportMovement(reporter, 104, 108, 1);
  reportMovement(reporter, 108, 102, -1);
  const movements = received.filter(({ type }) => {
    return type === GAMEPLAY_EVENTS.PLAYER_MOVE;
  });
  assert.deepEqual(movements.map(({ detail }) => detail), [
    { direction: 1, facingDirection: 1 },
    { direction: -1, facingDirection: -1 },
  ]);
}

/** Captures and reports one horizontal movement frame. */
function reportMovement(reporter, fromX, toX, facingDirection) {
  reporter.capture(createCharacter(fromX, facingDirection), createBoss());
  reporter.report(createCharacter(toX, facingDirection), createBoss());
}

/** Verifies ordered lesson gates and their exact thresholds. */
function assertLessonProgression() {
  const game = createGameFixture();
  const director = initializeTutorialDirector(game);
  const tracker = initializeTutorialMovementTracker(game, director);
  emitMovement(game, -1, -1);
  emitMovement(game, 1, 1);
  emitJump(game, 20);
  emitJump(game, 80);
  game.emitState(GAME_STATES.PLAYING, "tutorial");
  director.recordStepCompletion("resources");
  emitMovement(game, -1, -1);
  emitMovement(game, 1, -1);
  assert.equal(director.getSnapshot().stepId, "movement");
  emitJump(game, 60);
  emitJump(game, 20);
  emitJump(game, 79);
  emitJump(game, 80);
  assert.equal(director.getSnapshot().stepId, "movement");
  emitMovement(game, 1, 1);
  assert.equal(director.getSnapshot().stepId, "wallRebound");
  tracker.destroy();
  director.destroy();
}

/** Emits one movement event. */
function emitMovement(game, direction, facingDirection) {
  game.emitGameplay(GAMEPLAY_EVENTS.PLAYER_MOVE, {
    direction, facingDirection,
  });
}

/** Emits a charged or short jump sequence. */
function emitJump(game, percent) {
  game.emitGameplay(GAMEPLAY_EVENTS.PLAYER_JUMP_CHARGE, {
    percent, isCharging: true,
  });
  game.emitGameplay(GAMEPLAY_EVENTS.PLAYER_JUMP);
  game.emitGameplay(GAMEPLAY_EVENTS.PLAYER_LAND);
}

/** Creates a stable character reporting fixture. */
function createCharacter(x, facingDirection) {
  return {
    x, facingDirection, isOnGround: true, velocityY: 0,
    jumpChargePercent: 0, isChargingJump: false,
  };
}

/** Creates a stable boss reporting fixture. */
function createBoss() {
  return { isActive: false, phase: 1 };
}

/** Creates a game fixture with state and gameplay observer channels. */
function createGameFixture() {
  const stateListeners = new Set();
  const gameplayListeners = new Set();
  return {
    state: GAME_STATES.HOME, levelId: "main",
    onStateChange: (listener) => register(stateListeners, listener),
    onGameplayEvent: (listener) => register(gameplayListeners, listener),
    emitState(state, levelId) {
      Object.assign(this, { state, levelId });
      stateListeners.forEach((listener) => listener(state));
    },
    emitGameplay(type, detail = {}) {
      const event = Object.freeze({ type, detail: Object.freeze(detail) });
      gameplayListeners.forEach((listener) => listener(event));
    },
  };
}

/** Registers a fixture observer and returns its unsubscribe command. */
function register(listeners, listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
