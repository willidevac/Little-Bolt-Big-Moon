import assert from "node:assert/strict";
import { setLanguage } from "../js/i18n/localization.js";

class FakeElement {
  constructor() {
    this.attributes = new Map();
    this.dataset = {};
    this.elements = new Map();
    this.hidden = false;
    this.listeners = new Map();
    this.textContent = "";
  }

  querySelector(selector) { return this.elements.get(selector) ?? null; }
  addEventListener(type, listener) { this.listeners.set(type, listener); }
  removeEventListener(type) { this.listeners.delete(type); }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
}

globalThis.HTMLElement = FakeElement;
const { TutorialPromptController } = await import(
  "../classes/ui/tutorial-prompt-controller.class.js"
);
const director = createDirector();
const elements = createPromptElements();
const controller = new TutorialPromptController(director, elements.root);

assert.equal(controller.initialize(), controller);
assertExpanded(elements);
assert.equal(controller.handleToggle(), true);
assertCollapsed(elements);
setLanguage("en");
assert.equal(elements.toggle.getAttribute("aria-label"), "Expand instruction");
director.emit(activeSnapshot("resources", 1));
assertCollapsed(elements);
assert.equal(controller.handleToggle(), true);
assertExpanded(elements);
director.emit(activeSnapshot("shortJump", 2));
assertExpanded(elements);
director.emit(inactiveSnapshot());
assert.equal(controller.handleToggle(), false);
controller.destroy();
setLanguage("de");

console.log("TUTORIAL-016: Der Hinweis ist zugänglich einklappbar und schrittstabil.");

/** Verifies the open body and accessible collapse command. */
function assertExpanded({ root, details, toggle }) {
  assert.equal(details.hidden, false);
  assert.equal(root.dataset.collapsed, "false");
  assert.equal(toggle.textContent, "−");
  assert.equal(toggle.getAttribute("aria-expanded"), "true");
}

/** Verifies the compact body and accessible expand command. */
function assertCollapsed({ root, details, toggle }) {
  assert.equal(details.hidden, true);
  assert.equal(root.dataset.collapsed, "true");
  assert.equal(toggle.textContent, "i");
  assert.equal(toggle.getAttribute("aria-expanded"), "false");
}

/** Creates every required static prompt element. */
function createPromptElements() {
  const root = new FakeElement();
  const title = register(root, "[data-tutorial-title]");
  const copy = register(root, "[data-tutorial-copy]");
  const progress = register(root, "[data-tutorial-progress]");
  const details = register(root, "[data-tutorial-details]");
  const toggle = register(root, "[data-tutorial-toggle]");
  return { root, title, copy, progress, details, toggle };
}

/** Registers one child by the selector used in production. */
function register(root, selector) {
  const element = new FakeElement();
  root.elements.set(selector, element);
  return element;
}

/** Creates a minimal observable tutorial source. */
function createDirector() {
  let snapshot = activeSnapshot("movement", 0);
  let listener = null;
  return {
    getSnapshot: () => snapshot,
    onChange(callback) { listener = callback; return () => { listener = null; }; },
    emit(next) { snapshot = next; listener?.(next); },
  };
}

/** Creates an active progress snapshot. */
function activeSnapshot(stepId, stepIndex) {
  return Object.freeze({
    status: "active", stepId, stepIndex, totalSteps: 10,
  });
}

/** Creates the hidden inactive state. */
function inactiveSnapshot() {
  return Object.freeze({
    status: "inactive", stepId: null, stepIndex: -1, totalSteps: 10,
  });
}
