import assert from "node:assert/strict";
import { GAME_STATES } from "../classes/core/game-state-machine.class.js";
import { GameStorage } from "../classes/systems/game-storage.class.js";
import { GAME_LEVEL_IDS } from "../js/config/level-config.js";

class FakeHTMLElement {}
globalThis.HTMLElement = FakeHTMLElement;

const { TutorialCompletionController } = await import(
  "../classes/ui/tutorial-completion-controller.class.js"
);
const { StorageController } = await import(
  "../classes/ui/storage-controller.class.js"
);

/** Verifies persistent completion, menu emphasis, and repeated fresh runs. */
function assertCompletionFlow() {
  const memory = new MemoryStorage();
  const storage = new GameStorage(memory, { key: "tutorial", version: 1 });
  const director = createDirector();
  const game = createGame();
  const tutorialButton = new FakeButton();
  const startButton = new FakeButton();
  const root = new FakeRoot(tutorialButton, startButton);
  const controller = new TutorialCompletionController(
    game, director, storage, root,
  ).initialize();
  assert.equal(tutorialButton.classList.has("menu-button--primary"), true);
  director.emit({ status: "completed", stepId: "completed" });
  assert.equal(game.winAttempts, 1);
  assert.equal(storage.getSnapshot().tutorialCompleted, true);
  assert.equal(JSON.parse(memory.value).tutorialCompleted, true);
  assert.equal(startButton.classList.has("menu-button--primary"), true);
  assert.equal(tutorialButton.dataset.tutorialCompleted, "true");
  director.emit({ status: "completed", stepId: "completed" });
  assert.equal(game.winAttempts, 1);
  director.emit({ status: "inactive", stepId: null });
  game.emitState(GAME_STATES.PLAYING);
  director.emit({ status: "completed", stepId: "completed" });
  assert.equal(game.winAttempts, 2);
  controller.destroy();
}

/** Verifies a temporarily blocked completion is retried, not lost. */
function assertDeferredCompletionRetry() {
  const memory = new MemoryStorage();
  const storage = new GameStorage(memory, { key: "tutorial-retry", version: 1 });
  const director = createDirector();
  const game = createGame([false, true]);
  const controller = new TutorialCompletionController(
    game, director, storage, new FakeRoot(new FakeButton(), new FakeButton()),
  ).initialize();
  director.emit({ status: "completed", stepId: "completed" });
  assert.equal(game.winAttempts, 1);
  assert.equal(storage.getSnapshot().tutorialCompleted, false);
  game.emitState(GAME_STATES.PAUSED);
  assert.equal(game.winAttempts, 1);
  game.emitState(GAME_STATES.PLAYING);
  assert.equal(game.winAttempts, 2);
  assert.equal(storage.getSnapshot().tutorialCompleted, true);
  controller.destroy();
}

/** Verifies tutorial end states never call the record mutation command. */
function assertTutorialRecordIsolation() {
  const calls = { records: 0, renders: 0 };
  const context = {
    game: {
      levelId: GAME_LEVEL_IDS.TUTORIAL,
      canvas: { dataset: {} },
      getHudSnapshot: () => ({ score: 999999, heightMeters: 999 }),
    },
    storage: {
      getSnapshot: () => ({ tutorialCompleted: true }),
      recordRun: () => { calls.records += 1; },
    },
    render: () => { calls.renders += 1; },
  };
  StorageController.prototype.handleStateChange.call(context, GAME_STATES.WON);
  assert.deepEqual(calls, { records: 0, renders: 1 });
}

/** Creates an observable tutorial progress fixture. */
function createDirector() {
  const listeners = new Set();
  let snapshot = { status: "inactive", stepId: null };
  return {
    onChange(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot: () => snapshot,
    emit(next) {
      snapshot = Object.freeze({ ...next });
      listeners.forEach((listener) => listener(snapshot));
    },
  };
}

/** Creates an observable game state and configurable win results. */
function createGame(winResults = [true]) {
  const listeners = new Set();
  const results = [...winResults];
  return {
    state: GAME_STATES.PLAYING,
    winAttempts: 0,
    onStateChange(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    win() {
      this.winAttempts += 1;
      return results.shift() ?? true;
    },
    emitState(state) {
      this.state = state;
      listeners.forEach((listener) => listener(state));
    },
  };
}

/** Minimal persistent storage implementation. */
class MemoryStorage {
  getItem() { return this.value ?? null; }
  setItem(_key, value) { this.value = value; }
}

/** Minimal class-list implementation for menu emphasis checks. */
class FakeClassList {
  constructor() { this.values = new Set(); }
  toggle(name, force) {
    if (force) this.values.add(name);
    else this.values.delete(name);
  }
  has(name) { return this.values.has(name); }
}

/** Minimal accessible button element. */
class FakeButton extends FakeHTMLElement {
  constructor() {
    super();
    this.dataset = {};
    this.classList = new FakeClassList();
    this.textContent = "";
  }
}

/** Minimal root exposing both home menu buttons. */
class FakeRoot extends FakeHTMLElement {
  constructor(tutorialButton, startButton) {
    super();
    this.buttons = { tutorialButton, startButton };
  }
  querySelector(selector) {
    return selector.includes('"tutorial"')
      ? this.buttons.tutorialButton
      : this.buttons.startButton;
  }
}

assertCompletionFlow();
assertDeferredCompletionRetry();
assertTutorialRecordIsolation();

console.log("TUTORIAL-010: Abschluss, Empfehlung und Rekordtrennung bestanden.");
