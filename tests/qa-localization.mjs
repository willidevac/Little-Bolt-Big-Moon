import assert from "node:assert/strict";
import { readAppMarkup } from "./helpers/read-app-markup.mjs";
import { LOCALIZATION_CONFIG } from "../js/config/localization-config.js";
import { TRANSLATION_CATALOG } from "../js/i18n/translation-catalog.js";
import {
  getLanguage,
  setLanguage,
  translate,
} from "../js/i18n/localization.js";
import { GameStorage } from "../classes/systems/game-storage.class.js";

class MemoryStorage {
  constructor(data = null) { this.data = data; }
  getItem() { return this.data; }
  setItem(key, value) { this.data = value; }
}

class FakeElement {
  constructor(dataset = {}) {
    this.dataset = dataset;
    this.textContent = "";
    this.attributes = new Map();
    this.listeners = new Map();
  }

  addEventListener(type, listener) { this.listeners.set(type, listener); }
  removeEventListener(type) { this.listeners.delete(type); }
  setAttribute(name, value) { this.attributes.set(name, value); }
}

class FakeSelect extends FakeElement {
  constructor() {
    super();
    this.value = "de";
  }
}

globalThis.HTMLElement = FakeElement;
globalThis.HTMLSelectElement = FakeSelect;
const { LocalizationController } = await import(
  "../classes/ui/localization-controller.class.js"
);

assert.deepEqual(LOCALIZATION_CONFIG.languages, ["de", "en"]);
assertCatalogParity();
await assertMarkupKeys();
assertTranslationService();
assertStoredLanguage();
assertController();
setLanguage("de");

console.log("L10N-001: Deutsch, Englisch, Persistenz und Barrierefreiheit geprüft.");

function assertCatalogParity() {
  const germanKeys = Object.keys(TRANSLATION_CATALOG.de).sort();
  const englishKeys = Object.keys(TRANSLATION_CATALOG.en).sort();
  assert.deepEqual(englishKeys, germanKeys);
  assert.ok(germanKeys.length >= 100);
}

async function assertMarkupKeys() {
  const html = await readAppMarkup();
  const usedKeys = [
    ...getAttributes(html, "data-i18n"),
    ...getAttributes(html, "data-i18n-aria-label"),
  ];
  usedKeys.forEach((key) => assert.ok(TRANSLATION_CATALOG.de[key], key));
  assert.match(html, /<select[^>]+data-language-control/);
  assert.match(html, /<option value="de">Deutsch<\/option>/);
  assert.match(html, /<option value="en">English<\/option>/);
}

function getAttributes(source, attribute) {
  const pattern = new RegExp(`${attribute}="([^"]+)"`, "g");
  return [...source.matchAll(pattern)].map((match) => match[1]);
}

function assertTranslationService() {
  assert.equal(setLanguage("en"), true);
  assert.equal(getLanguage(), "en");
  assert.equal(translate("home.start"), "Start game");
  assert.equal(
    translate("value.of", { value: 25, maximum: 100 }),
    "25 of 100",
  );
  assert.equal(setLanguage("xx"), false);
  assert.equal(getLanguage(), "en");
}

function assertStoredLanguage() {
  const memory = new MemoryStorage();
  const storage = new GameStorage(memory, { key: "game", version: 1 });
  assert.equal(storage.getSnapshot().language, "de");
  assert.equal(storage.setLanguage("en").language, "en");
  assert.equal(JSON.parse(memory.data).language, "en");
  assert.equal(storage.setLanguage("unknown").language, "de");
}

function assertController() {
  const nodes = createFakeNodes();
  const storage = createFakeStorage();
  const controller = new LocalizationController(storage, nodes.root).initialize();
  assert.equal(nodes.documentElement.lang, "de");
  nodes.control.value = "en";
  controller.handleChange();
  assert.equal(nodes.documentElement.lang, "en");
  assert.equal(nodes.text.textContent, "Start game");
  assert.equal(nodes.label.attributes.get("aria-label"), "Game status");
  controller.destroy();
}

function createFakeNodes() {
  const control = new FakeSelect();
  const text = new FakeElement({ i18n: "home.start" });
  const label = new FakeElement({ i18nAriaLabel: "hud.label" });
  const documentElement = {};
  const root = new FakeElement();
  root.ownerDocument = { documentElement };
  root.querySelector = () => control;
  root.querySelectorAll = (selector) => selector === "[data-i18n]"
    ? [text]
    : [label];
  return { control, text, label, documentElement, root };
}

function createFakeStorage() {
  let language = "de";
  return {
    getSnapshot: () => ({ language }),
    setLanguage: (selected) => {
      language = selected;
      return { language };
    },
  };
}
