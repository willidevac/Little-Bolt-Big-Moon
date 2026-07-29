import assert from "node:assert/strict";
import fs from "node:fs";
import { GAME_STATES } from "../classes/core/game-state-machine.class.js";
import { StorySequenceController } from
  "../classes/ui/story-sequence-controller.class.js";

const html = fs.readFileSync("index.html", "utf8");
const css = fs.readFileSync("styles/story-sequences.css", "utf8");
const source = fs.readFileSync(
  "classes/ui/story-sequence-controller.class.js",
  "utf8",
);
let game;
let nodes;
let root;
let controller;

function assertMarkup() {
  assert.match(html, /data-story-sequence/);
  assert.match(html, /data-story-sequence-skip/);
  assert.match(html, /aria-modal="true"/);
  assert.match(html, /story-sprite--energy/);
  assert.match(html, /story-sprite--badge-left/);
  assert.match(html, /story-sprite--badge-right/);
  assert.match(source, /"Escape", "Enter", "Space"/);
}

function assertStyles() {
  assert.match(css, /@keyframes luma-revives/);
  assert.match(css, /@keyframes energy-reaches-luma/);
  assert.match(css, /@keyframes badge-left-connects/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /max-width: 700px/);
}

function assertAudioIndependence() {
  const audioDependency =
    /from\s+["'][^"']*audio|new\s+Audio|audioManager|soundManager|musicManager/i;
  assert.doesNotMatch(source, audioDependency);
}

function assertIntro() {
  assert.equal(controller.playIntro(), true);
  assert.equal(controller.playIntro(), false);
  assert.equal(nodes.view.hidden, false);
  assert.equal(nodes.view.dataset.sequence, "intro");
  root.dispatchEvent(createKeyEvent("Tab"));
  assert.ok(nodes.skip.focusCount >= 2);
  nodes.skip.dispatchEvent(new Event("click"));
  assert.equal(nodes.view.hidden, true);
  assert.equal(game.resetCount, 1);
}

function assertOutro() {
  game.emit(GAME_STATES.WON);
  assert.equal(nodes.view.dataset.sequence, "outro");
  root.dispatchEvent(createKeyEvent("Escape"));
  assert.equal(nodes.view.hidden, true);
  assert.equal(game.resetCount, 1);
}

function assertRestartEscape() {
  game.emit(GAME_STATES.WON);
  game.emit(GAME_STATES.PLAYING);
  assert.equal(nodes.view.hidden, true);
  assert.equal(nodes.status.textContent, "");
}

function createKeyEvent(code) {
  const event = new Event("keydown", { cancelable: true });
  Object.defineProperty(event, "code", { value: code });
  return event;
}

function createNodes() {
  return {
    view: new FakeNode(),
    skip: new FakeNode(),
    status: new FakeNode(),
  };
}

class FakeGame {
  constructor() {
    this.listeners = new Set();
    this.resetCount = 0;
  }

  onStateChange(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  reset() {
    this.resetCount += 1;
    this.emit(GAME_STATES.PLAYING);
  }

  emit(state) {
    this.listeners.forEach((listener) => listener(state));
  }
}

class FakeNode extends EventTarget {
  constructor() {
    super();
    this.hidden = true;
    this.dataset = {};
    this.attributes = new Map();
    this.textContent = "";
    this.focusCount = 0;
  }

  setAttribute(name, value) {
    this.attributes.set(name, value);
  }

  removeAttribute(name) {
    this.attributes.delete(name);
    if (name === "data-sequence") delete this.dataset.sequence;
  }

  focus() {
    this.focusCount += 1;
  }
}

class FakeRoot extends FakeNode {
  constructor(nodes) {
    super();
    this.nodes = nodes;
    this.classList = createClassList();
    this.ownerDocument = createDocument();
  }

  querySelector(selector) {
    const elements = {
      "[data-story-sequence]": this.nodes.view,
      "[data-story-sequence-skip]": this.nodes.skip,
      "[data-story-sequence-status]": this.nodes.status,
    };
    return elements[selector] ?? null;
  }
}

function createClassList() {
  const values = new Set();
  return {
    add: (value) => values.add(value),
    remove: (value) => values.delete(value),
    contains: (value) => values.has(value),
  };
}

function createDocument() {
  return {
    defaultView: {
      matchMedia: () => ({ matches: false }),
    },
  };
}

game = new FakeGame();
nodes = createNodes();
root = new FakeRoot(nodes);
controller = new StorySequenceController(game, root).initialize();
assertMarkup();
assertStyles();
assertAudioIndependence();
assertIntro();
assertOutro();
assertRestartEscape();
controller.destroy();
console.log("STORY-002: Intro, Wiedervereinigung und Überspringen geprüft.");
