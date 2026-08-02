import assert from "node:assert/strict";
import { GameDialogController } from
  "../classes/ui/game-dialog-controller.class.js";

const DIALOG_SELECTOR = "[data-game-dialog]";
const DIALOG_FOCUS_SELECTOR = "[data-dialog-focus]";
const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), input:not([disabled])';

class FakeElement {
  constructor(documentTarget) {
    this.ownerDocument = documentTarget;
    this.dataset = {};
    this.hidden = true;
    this.inert = false;
    this.matchesSelectors = new Set();
    this.singleElements = new Map();
    this.elementLists = new Map();
  }

  querySelector(selector) { return this.singleElements.get(selector) ?? null; }
  querySelectorAll(selector) { return this.elementLists.get(selector) ?? []; }
  matches(selector) { return this.matchesSelectors.has(selector); }
  focus() { this.ownerDocument.activeElement = this; }
}

globalThis.Element = FakeElement;
globalThis.HTMLElement = FakeElement;

const fixture = createFixture();
assertOpen(fixture);
assertFocusTrap(fixture);
assertEscapeClose(fixture);
assertBackdropAndValidation(fixture);

console.log("CLEAN-008: Dialogfokus und Tastatursteuerung sind getrennt geprüft.");

function createFixture() {
  const documentTarget = { activeElement: null };
  const root = new FakeElement(documentTarget);
  const dialog = createDialog(documentTarget, "controls");
  root.elementLists.set(DIALOG_SELECTOR, [dialog.element]);
  const backgrounds = [new FakeElement(documentTarget), new FakeElement(documentTarget)];
  const opener = new FakeElement(documentTarget);
  opener.focus();
  const controller = new GameDialogController(root, backgrounds);
  return { controller, dialog, backgrounds, opener, documentTarget, root };
}

function createDialog(documentTarget, name) {
  const element = new FakeElement(documentTarget);
  const heading = new FakeElement(documentTarget);
  const first = new FakeElement(documentTarget);
  const last = new FakeElement(documentTarget);
  element.dataset.gameDialog = name;
  element.matchesSelectors.add(DIALOG_SELECTOR);
  element.singleElements.set(DIALOG_FOCUS_SELECTOR, heading);
  element.elementLists.set(FOCUSABLE_SELECTOR, [first, last]);
  return { element, heading, first, last };
}

function assertOpen({ controller, dialog, backgrounds, documentTarget }) {
  controller.open("controls");
  assert.equal(dialog.element.hidden, false);
  assert.equal(documentTarget.activeElement, dialog.heading);
  assert.ok(backgrounds.every(({ inert }) => inert));
}

function assertFocusTrap({ controller, dialog, documentTarget }) {
  dialog.last.focus();
  const forward = createKeyEvent("Tab", false);
  controller.handleKeydown(forward);
  assert.equal(documentTarget.activeElement, dialog.first);
  dialog.first.focus();
  const backward = createKeyEvent("Tab", true);
  controller.handleKeydown(backward);
  assert.equal(documentTarget.activeElement, dialog.last);
}

function assertEscapeClose({ controller, dialog, backgrounds, opener, documentTarget }) {
  const event = createKeyEvent("Escape");
  controller.handleKeydown(event);
  assert.equal(dialog.element.hidden, true);
  assert.ok(backgrounds.every(({ inert }) => !inert));
  assert.equal(documentTarget.activeElement, opener);
  assert.equal(event.wasPrevented, true);
  assert.equal(event.wasStopped, true);
}

function assertBackdropAndValidation({ controller, dialog, root }) {
  assert.equal(controller.isBackdrop(dialog.element), true);
  assert.equal(controller.isBackdrop(root), false);
  assert.throws(() => controller.open("missing"), Error);
  assert.throws(() => new GameDialogController({}, []), TypeError);
}

function createKeyEvent(code, shiftKey = false) {
  return {
    code, shiftKey, wasPrevented: false, wasStopped: false,
    preventDefault() { this.wasPrevented = true; },
    stopPropagation() { this.wasStopped = true; },
  };
}
