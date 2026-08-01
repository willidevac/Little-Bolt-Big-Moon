import assert from "node:assert/strict";
import { ReviewModeController } from
  "../classes/ui/review-mode-controller.class.js";
import { REVIEW_MODE_CONFIG } from "../js/config/review-mode-config.js";

class FakeElement {
  constructor() {
    this.dataset = {};
    this.hidden = true;
    this.value = "0";
    this.elements = new Map();
  }

  querySelector(selector) { return this.elements.get(selector) ?? null; }
  addEventListener() {}
  close() {}
  showModal() {}
  focus() {}
  select() {}
}

globalThis.HTMLElement = FakeElement;
const root = createRoot();
const game = createGame();
const controller = new ReviewModeController(game, root, REVIEW_MODE_CONFIG, null);
controller.initialize();
controller.start();

assert.equal(controller.flight.character, game.world.character);
const firstCharacter = game.world.character;
game.restartWorld();
assert.notEqual(game.world.character, firstCharacter);
assert.equal(controller.flight.character, game.world.character);
game.world.character.y = 65_000;
game.notifyHud();
assert.equal(root.querySelector("[data-review-biome]").value, "2");
game.world.character.y = 500;
game.notifyHud();
assert.equal(root.querySelector("[data-review-biome]").value, "5");

console.log("REV-001: Review-Flug und Landschaftsauswahl überleben Neustarts.");

function createRoot() {
  const element = new FakeElement();
  [
    "[data-review-version]", "[data-review-dialog]", "[data-review-form]",
    "[data-review-start]", "[data-review-code]", "[data-review-error]",
    "[data-review-banner]", "[data-review-exit]", "[data-review-cancel]",
    "[data-review-biome]",
  ].forEach((selector) => element.elements.set(selector, new FakeElement()));
  return element;
}

function createGame() {
  const listeners = {};
  const game = {
    canvas: new FakeElement(), keyboard: createKeyboard(),
    runStats: { updateHeight() {} },
    config: { world: { width: 1280, height: 150000 } },
    world: createWorld(),
    ...createGameActions(listeners),
  };
  return game;
}

function createGameActions(listeners) {
  return {
    onStateChange(listener) { listeners.state = listener; },
    onHudChange(listener) { listeners.hud = listener; },
    reset() { this.world = createWorld(); listeners.state?.("playing"); },
    restartWorld() { this.reset(); },
    notifyHud() { listeners.hud?.({}); },
    goHome() {},
  };
}

function createWorld() {
  return {
    character: createCharacter(),
    level: { enemies: [], sections: createSections() },
    camera: { reset() {} },
    addEntity() {},
  };
}

function createCharacter() {
  return {
    x: 160, y: 149_600, width: 64, height: 64,
    velocityX: 0, velocityY: 0, isAffectedByGravity: true,
    setOnGround() {},
    setInvulnerability(value) { this.invulnerabilitySecondsRemaining = value; },
  };
}

function createKeyboard() {
  return {
    left: false, right: false, jump: false, down: false, fast: false,
    consumePress() { return false; },
  };
}

function createSections() {
  const ids = ["scrapyard", "factory", "launch-tower", "space-station", "moon"];
  return ids.map((backgroundId, index) => ({
    backgroundId,
    topY: 120_000 - index * 30_000,
    bottomY: 150_000 - index * 30_000,
  }));
}
