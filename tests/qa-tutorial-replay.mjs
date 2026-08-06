import assert from "node:assert/strict";

const scheduledFrames = new Set();
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

class FakeHTMLElement {}
globalThis.HTMLElement = FakeHTMLElement;

class MemoryStorage {
  getItem() { return this.value ?? null; }
  setItem(_key, value) { this.value = value; }
}

const { createGame } = await import("../js/app/create-game.js");
const { GAME_CONFIG } = await import("../js/config/game-config.js");
const { GAME_LEVEL_IDS } = await import("../js/config/level-config.js");
const { TUTORIAL_STEP_ORDER } = await import(
  "../js/config/tutorial-config.js"
);
const { initializeTutorialDirector } = await import(
  "../js/factories/tutorial-director.js"
);
const { GameStorage } = await import(
  "../classes/systems/game-storage.class.js"
);
const { TutorialCompletionController } = await import(
  "../classes/ui/tutorial-completion-controller.class.js"
);

/** Runs and completes the real tutorial lifecycle three times. */
function assertRepeatedTutorialRuns() {
  const game = createGame(createCanvas(), GAME_CONFIG, new EventTarget());
  const director = initializeTutorialDirector(game);
  const storage = new GameStorage(new MemoryStorage(), {
    key: "tutorial-replay",
    version: 1,
  });
  const completion = new TutorialCompletionController(
    game,
    director,
    storage,
    new FakeRoot(new FakeButton(), new FakeButton()),
  ).initialize();
  game.initialize();
  let previousWorld = game.world;
  for (let run = 0; run < 3; run += 1) {
    if (run > 0) assert.equal(game.goHome(), true);
    assert.equal(game.startLevel(GAME_LEVEL_IDS.TUTORIAL), true);
    assert.notEqual(game.world, previousWorld);
    previousWorld = game.world;
    assert.equal(game.state, "playing");
    TUTORIAL_STEP_ORDER.slice(0, -1).forEach((stepId) => {
      assert.equal(director.completeStep(stepId), true);
    });
    assert.equal(game.state, "won");
    assert.equal(director.getSnapshot().status, "completed");
  }
  assert.equal(storage.getSnapshot().tutorialCompleted, true);
  completion.destroy();
  director.destroy();
  game.destroy();
}

function createCanvas() {
  return {
    width: 1280,
    height: 720,
    dataset: {},
    getContext: () => ({ imageSmoothingEnabled: true, clearRect() {} }),
  };
}

class FakeClassList {
  toggle() {}
}

class FakeButton extends FakeHTMLElement {
  constructor() {
    super();
    this.classList = new FakeClassList();
    this.dataset = {};
    this.textContent = "";
  }
}

class FakeRoot extends FakeHTMLElement {
  constructor(tutorialButton, startButton) {
    super();
    this.tutorialButton = tutorialButton;
    this.startButton = startButton;
  }

  querySelector(selector) {
    return selector.includes('"tutorial"')
      ? this.tutorialButton
      : this.startButton;
  }
}

assertRepeatedTutorialRuns();

console.log("TUTORIAL-011: Drei frische Tutorial-DurchlÃ¤ufe bestanden.");
