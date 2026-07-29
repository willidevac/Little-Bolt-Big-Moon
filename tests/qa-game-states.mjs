import assert from "node:assert/strict";

const scheduledFrames = new Set();
const consoleMessages = [];
const originalConsole = captureConsole();
globalThis.Image = class FakeImage {
  constructor() {
    this.naturalWidth = 1024;
    this.naturalHeight = 1536;
  }

  set src(value) {
    this.source = value;
    this.onload?.();
  }
};
globalThis.requestAnimationFrame = (callback) => {
  scheduledFrames.add(callback);
  return scheduledFrames.size;
};
globalThis.cancelAnimationFrame = () => {};

const { Game } = await import("../classes/core/game.class.js");
const { GAME_CONFIG } = await import("../js/config/game-config.js");
const game = new Game(createCanvas(), GAME_CONFIG, new EventTarget());
const states = [];
game.onStateChange((state) => states.push(state));

game.initialize();
assert.equal(game.state, "home");
game.reset();
assert.equal(game.state, "playing");
assert.equal(game.pause(), true);
assert.equal(game.state, "paused");
assert.equal(game.resume(), true);
assert.equal(game.win(), true);
assert.equal(game.state, "won");
game.reset();
assert.equal(game.lose(), true);
assert.equal(game.state, "lost");
game.reset();
assert.equal(game.goHome(), true);
assert.equal(game.state, "home");
assert.deepEqual(states, [
  "playing",
  "paused",
  "playing",
  "won",
  "playing",
  "lost",
  "playing",
  "home",
]);
assert.deepEqual(consoleMessages, []);
game.stop();
restoreConsole(originalConsole);
originalConsole.log("QA-001: Start, Restart, Sieg und Niederlage geprüft.");

function createCanvas() {
  return {
    width: 1280,
    height: 720,
    dataset: {},
    getContext: () => createContext(),
  };
}

function createContext() {
  return {
    imageSmoothingEnabled: true,
    clearRect() {},
  };
}

function captureConsole() {
  const original = {
    log: console.log.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
  };
  ["log", "warn", "error"].forEach((method) => {
    console[method] = (...parts) => consoleMessages.push({ method, parts });
  });
  return original;
}

function restoreConsole(original) {
  console.log = original.log;
  console.warn = original.warn;
  console.error = original.error;
}
