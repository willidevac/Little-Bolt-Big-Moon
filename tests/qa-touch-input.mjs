import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { readAppMarkup } from "./helpers/read-app-markup.mjs";
import { Keyboard } from "../classes/input/keyboard.class.js";

class FakeClassList {
  constructor() {
    this.values = new Set();
  }

  toggle(name, force) {
    if (force) this.values.add(name);
    else this.values.delete(name);
  }
}

class FakeElement {
  constructor(tagName, document) {
    this.tagName = tagName.toUpperCase();
    this.ownerDocument = document;
    this.children = [];
    this.dataset = {};
    this.attributes = new Map();
    this.listeners = new Map();
    this.classList = new FakeClassList();
    this.hidden = false;
    this.disabled = false;
    this.parent = null;
  }

  append(...children) {
    children.forEach((child) => {
      child.parent = this;
      this.children.push(child);
    });
  }

  querySelectorAll(selector) {
    const descendants = this.children.flatMap((child) => {
      return [child, ...child.querySelectorAll(selector)];
    });
    if (selector === TOUCH_SELECTOR) return descendants.filter(hasTouchData);
    if (selector === BUTTON_SELECTOR) return descendants.filter(isInputButton);
    return selector === "button" ? descendants.filter(isButton) : [];
  }

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] ?? null;
  }

  addEventListener(type, listener) {
    this.listeners.set(type, listener);
  }

  removeEventListener(type) {
    this.listeners.delete(type);
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }

  contains(element) {
    return element === this || this.children.some((child) => child.contains(element));
  }

  closest(selector) {
    if (selector === "button[data-input-action]" && isButton(this)) return this;
    return this.parent?.closest(selector) ?? null;
  }

  setPointerCapture() {}
}

globalThis.Element = FakeElement;
globalThis.HTMLElement = FakeElement;

const { TouchControls } = await import(
  "../classes/input/touch-controls.class.js"
);
const TOUCH_SELECTOR = "[data-touch-controls]";
const BUTTON_SELECTOR = "button[data-input-action]";
const document = {
  createElement: (tagName) => new FakeElement(tagName, document),
};
const root = new FakeElement("main", document);
const touchElement = createTouchElement(document);
root.append(touchElement);
const keyboard = new Keyboard(new EventTarget());
let stateListener = null;
let gameplayListener = null;
const game = {
  keyboard,
  state: "playing",
  weaponSystem: {
    getCurrentWeapon: () => ({ id: "repairWrench", isCombatUnlocked: false }),
  },
  onStateChange(listener) {
    stateListener = listener;
    return () => { stateListener = null; };
  },
  onGameplayEvent(listener) {
    gameplayListener = listener;
    return () => { gameplayListener = null; };
  },
};
const controls = new TouchControls(game, root).initialize();
const [left, right, jump, attack, weaponSwitch] = controls.buttons;

assert.equal(controls.buttons.length, 5);
assert.equal(controls.element.hidden, false);
assert.equal(attack.hidden, true);
assert.equal(weaponSwitch.disabled, true);
controls.handlePointerDown(createPointer(attack, 7));
assert.equal(keyboard.attack, false);
controls.handlePointerDown(createPointer(left, 1));
controls.handlePointerDown(createPointer(jump, 2));
assert.equal(keyboard.left, true);
assert.equal(keyboard.jump, true);
assert.equal(left.getAttribute("aria-pressed"), "true");
controls.handlePointerEnd(createPointer(left, 1));
assert.equal(keyboard.left, false);
assert.equal(keyboard.jump, true);
controls.handlePointerDown(createPointer(right, 3, "mouse", 2));
assert.equal(keyboard.right, false);
stateListener("paused");
assert.equal(keyboard.jump, false);
assert.equal(controls.element.hidden, true);
assert.equal(jump.getAttribute("aria-pressed"), "false");
assert.equal(blocksDefault(controls, jump), true);
assert.equal(blocksDefault(controls, root), false);
gameplayListener({
  type: "weaponChanged",
  detail: { id: "boltThrower", isCombatUnlocked: true },
});
assert.equal(attack.hidden, false);
assert.equal(weaponSwitch.disabled, false);
controls.handlePointerDown(createPointer(attack, 7));
assert.equal(keyboard.attack, true);
gameplayListener({
  type: "weaponChanged",
  detail: { id: "repairWrench", isCombatUnlocked: false },
});
assert.equal(keyboard.attack, false);
controls.destroy();

assertKeyboardPath(keyboard);
await assertStaticTouchMarkup();
console.log("QA-002: Tastatur und mehrere Touchfinger funktionieren.");

function isButton(element) {
  return element.tagName === "BUTTON";
}

function isInputButton(element) {
  return isButton(element) && Boolean(element.dataset.inputAction);
}

function hasTouchData(element) {
  return Object.hasOwn(element.dataset, "touchControls");
}

function createTouchElement(ownerDocument) {
  const controls = new FakeElement("nav", ownerDocument);
  controls.dataset.touchControls = "";
  ["left", "right", "jump", "attack", "weaponSwitch"].forEach((action) => {
    const button = new FakeElement("button", ownerDocument);
    button.dataset.inputAction = action;
    if (["attack", "weaponSwitch"].includes(action)) {
      button.dataset.combatControl = "";
    }
    controls.append(button);
  });
  return controls;
}

async function assertStaticTouchMarkup() {
  const html = await readAppMarkup();
  const source = await fs.readFile("classes/input/touch-controls.class.js", "utf8");
  const actions = [...html.matchAll(/data-input-action="([^"]+)"/g)];
  assert.equal(actions.length, 7);
  assert.ok(actions.some((match) => match[1] === "down"));
  assert.ok(actions.some((match) => match[1] === "fast"));
  assert.match(html, /<nav[\s\S]*?data-touch-controls[\s\S]*?<\/nav>/);
  assert.doesNotMatch(source, /createElement/);
  await assertSafariTouchCss();
}

async function assertSafariTouchCss() {
  const baseCss = await fs.readFile("styles/base.css", "utf8");
  const touchCss = await fs.readFile("styles/touch-controls.css", "utf8");
  assert.match(baseCss, /\.game-shell \*[\s\S]*?-webkit-user-select:\s*none/);
  assert.match(baseCss, /-webkit-touch-callout:\s*none/);
  assert.match(baseCss, /-webkit-tap-highlight-color:\s*transparent/);
  assert.match(baseCss, /\.legal-section \*[\s\S]*?user-select:\s*text/);
  assert.match(touchCss, /touch-action:\s*none/);
  assert.match(touchCss, /position:\s*fixed/);
  assert.match(touchCss, /safe-area-inset-bottom/);
  assert.match(touchCss, /hover:\s*none/);
  assert.match(touchCss, /pointer:\s*coarse/);
}

function createPointer(target, pointerId, pointerType = "touch", button = 0) {
  return {
    target,
    pointerId,
    pointerType,
    button,
    cancelable: true,
    preventDefault() {},
  };
}

function blocksDefault(instance, target) {
  let prevented = false;
  instance.blockControlDefault({
    target,
    preventDefault: () => { prevented = true; },
  });
  return prevented;
}

function assertKeyboardPath(input) {
  const target = input.eventTarget;
  input.bind();
  dispatchKey(target, "keydown", "Escape");
  assert.equal(input.consumePress("pause"), true);
  assert.equal(input.consumePress("pause"), false);
  dispatchKey(target, "keyup", "Escape");
  dispatchKey(target, "keydown", "KeyA");
  assert.equal(input.left, true);
  dispatchKey(target, "keyup", "KeyA");
  assert.equal(input.left, false);
  assertArrowPath(input, target);
  input.unbind();
}

function assertArrowPath(input, target) {
  dispatchKey(target, "keydown", "ArrowLeft");
  assert.equal(input.left, true);
  assert.equal(input.reviewLeft, true);
  dispatchKey(target, "keyup", "ArrowLeft");
  assert.equal(input.left, false);
  assert.equal(input.reviewLeft, false);
}

function dispatchKey(target, type, code) {
  const event = new Event(type, { cancelable: true });
  Object.defineProperty(event, "code", { value: code });
  target.dispatchEvent(event);
}
