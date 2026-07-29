import assert from "node:assert/strict";
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
    return selector === "button" ? descendants.filter(isButton) : [];
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
const document = {
  createElement: (tagName) => new FakeElement(tagName, document),
};
const root = new FakeElement("main", document);
const keyboard = new Keyboard(new EventTarget());
let stateListener = null;
const game = {
  keyboard,
  state: "playing",
  onStateChange(listener) {
    stateListener = listener;
    return () => { stateListener = null; };
  },
};
const controls = new TouchControls(game, root).initialize();
const [left, right, jump] = controls.buttons;

assert.equal(controls.buttons.length, 5);
assert.equal(controls.element.hidden, false);
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
controls.destroy();

assertKeyboardPath(keyboard);
console.log("QA-002: Tastatur und mehrere Touchfinger funktionieren.");

function isButton(element) {
  return element.tagName === "BUTTON";
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
  input.unbind();
}

function dispatchKey(target, type, code) {
  const event = new Event(type, { cancelable: true });
  Object.defineProperty(event, "code", { value: code });
  target.dispatchEvent(event);
}
