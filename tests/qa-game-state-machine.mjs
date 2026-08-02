import assert from "node:assert/strict";
import {
  GameStateMachine,
  GAME_STATES,
} from "../classes/core/game-state-machine.class.js";

const machine = new GameStateMachine();
const observedStates = [];
const unsubscribe = machine.onChange((state) => observedStates.push(state));

assert.equal(machine.getState(), GAME_STATES.HOME);
assert.equal(machine.transitionTo(GAME_STATES.PLAYING), true);
assert.equal(machine.transitionTo(GAME_STATES.PLAYING), false);
assert.equal(machine.transitionTo(GAME_STATES.PAUSED), true);
assert.deepEqual(observedStates, [GAME_STATES.PLAYING, GAME_STATES.PAUSED]);

unsubscribe();
assert.equal(machine.transitionTo(GAME_STATES.PLAYING), true);
assert.deepEqual(observedStates, [GAME_STATES.PLAYING, GAME_STATES.PAUSED]);
assert.throws(() => machine.onChange(null), TypeError);
assert.throws(() => machine.transitionTo("unknown"), RangeError);

console.log("CLEAN-010: Zustandswechsel melden sich selbstständig.");
