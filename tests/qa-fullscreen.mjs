import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { readAppMarkup } from "./helpers/read-app-markup.mjs";
import { FullscreenController } from
  "../classes/ui/fullscreen-controller.class.js";
import { setLanguage } from "../js/i18n/localization.js";

let documentTarget;
let button;
let root;
let controller;

async function assertFullscreenCycle() {
  controller.initialize();
  assert.equal(button.hidden, false);
  assert.equal(button.textContent, "Vollbild starten");
  assert.equal(await controller.toggle(), true);
  assert.equal(documentTarget.fullscreenElement, root);
  assert.equal(button.attributes.get("aria-pressed"), "true");
  assert.equal(await controller.toggle(), true);
  assert.equal(documentTarget.fullscreenElement, null);
}

function assertLanguageAndFallback() {
  setLanguage("en");
  controller.render();
  assert.equal(button.textContent, "Enter fullscreen");
  const fallbackButton = new FakeButton();
  new FullscreenController(documentTarget, {}, fallbackButton).initialize();
  assert.equal(fallbackButton.hidden, true);
  setLanguage("de");
}

async function assertResponsiveContract() {
  const html = await readAppMarkup();
  const screens = await fs.readFile("styles/screens.css", "utf8");
  const responsive = await fs.readFile("styles/responsive.css", "utf8");
  assert.match(html, /data-fullscreen-toggle/);
  assert.match(html, /data-fullscreen-toggle[\s\S]*?aria-pressed="false"|aria-pressed="false"[\s\S]*?data-fullscreen-toggle/);
  assert.match(screens, /\.utility-buttons[\s\S]+display:\s*flex/);
  assert.match(responsive, /max-width:\s*1066px[\s\S]+\.utility-button/);
  const touch = await fs.readFile("styles/touch-controls.css", "utf8");
  assert.match(touch, /hover:\s*none[\s\S]*pointer:\s*coarse/);
  assert.match(touch, /\.fullscreen-button\s*{[\s\S]*display:\s*none/);
}

function createFullscreenRoot(documentTarget) {
  return {
    async requestFullscreen() {
      documentTarget.fullscreenElement = this;
      documentTarget.dispatchEvent(new Event("fullscreenchange"));
    },
  };
}

class FakeFullscreenDocument extends EventTarget {
  constructor() {
    super();
    this.fullscreenElement = null;
  }

  async exitFullscreen() {
    this.fullscreenElement = null;
    this.dispatchEvent(new Event("fullscreenchange"));
  }
}

class FakeButton extends EventTarget {
  constructor() {
    super();
    this.hidden = false;
    this.textContent = "";
    this.attributes = new Map();
  }

  setAttribute(name, value) {
    this.attributes.set(name, value);
  }
}

documentTarget = new FakeFullscreenDocument();
button = new FakeButton();
root = createFullscreenRoot(documentTarget);
controller = new FullscreenController(documentTarget, root, button);
await assertFullscreenCycle();
assertLanguageAndFallback();
await assertResponsiveContract();
controller.destroy();

console.log("UI-005: Vollbildzyklus, Fallback und Responsivität bestanden.");
