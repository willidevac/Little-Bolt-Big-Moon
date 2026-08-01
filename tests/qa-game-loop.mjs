import assert from "node:assert/strict";
import { GameLoop } from "../classes/core/game-loop.class.js";

function assertStart(target, frameScheduler) {
  assert.equal(target.start(), true);
  assert.equal(target.start(), false);
  assert.equal(target.isRunning, true);
  assert.equal(frameScheduler.size, 1);
}

function assertFrameTiming(target, frameScheduler, recordedDeltas) {
  frameScheduler.runNext(1_000);
  frameScheduler.runNext(1_160);
  assert.deepEqual(recordedDeltas, [0, 0.1]);
  target.resetClock();
  frameScheduler.runNext(2_000);
  assert.deepEqual(recordedDeltas, [0, 0.1, 0]);
}

function assertStop(target, frameScheduler) {
  assert.equal(target.stop(), true);
  assert.equal(target.stop(), false);
  assert.equal(target.isRunning, false);
  assert.equal(frameScheduler.size, 0);
}

function assertValidation(frameScheduler) {
  assert.throws(() => new GameLoop(0, () => {}, frameScheduler), TypeError);
  assert.throws(() => new GameLoop(100, null, frameScheduler), TypeError);
  assert.throws(() => new GameLoop(100, () => {}, {}), TypeError);
}

class FrameScheduler {
  constructor() {
    this.frames = new Map();
    this.nextId = 1;
  }

  get size() { return this.frames.size; }

  requestAnimationFrame(callback) {
    const id = this.nextId;
    this.nextId += 1;
    this.frames.set(id, callback);
    return id;
  }

  cancelAnimationFrame(id) {
    this.frames.delete(id);
  }

  runNext(timestamp) {
    const entry = this.frames.entries().next().value;
    if (!entry) throw new Error("Kein Animationsframe geplant.");
    const [id, callback] = entry;
    this.frames.delete(id);
    callback(timestamp);
  }
}

const scheduler = new FrameScheduler();
const deltas = [];
const loop = new GameLoop(100, (deltaTime) => deltas.push(deltaTime), scheduler);

assertStart(loop, scheduler);
assertFrameTiming(loop, scheduler, deltas);
assertStop(loop, scheduler);
assertValidation(scheduler);

console.log("CLEAN-004: Animationsplanung und Framezeit sind getrennt geprüft.");
