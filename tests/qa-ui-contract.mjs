import assert from "node:assert/strict";
import fs from "node:fs/promises";

const html = await fs.readFile("index.html", "utf8");
const screenSource = await fs.readFile(
  "classes/ui/screen-controller.class.js",
  "utf8",
);
const storageSource = await fs.readFile(
  "classes/ui/storage-controller.class.js",
  "utf8",
);
const actions = getAttributeValues(html, "data-ui-action");
const expectedActions = [
  "close-dialog",
  "controls",
  "home",
  "imprint",
  "mute",
  "pause",
  "restart",
  "resume",
  "settings",
  "start",
];

assert.deepEqual([...new Set(actions)].sort(), expectedActions);
assertButtonsAreAccessible(html);
assertUniqueIds(html);
assertIdReferences(html, "aria-labelledby");
assertIdReferences(html, "for");
assertDialogContracts(html);
assertActionBindings(actions);
assertLinkContracts(html);

console.log("QA-002: Buttons, Dialoge und Links sind vollständig verbunden.");

function getAttributeValues(source, attribute) {
  const pattern = new RegExp(`${attribute}="([^"]+)"`, "g");
  return [...source.matchAll(pattern)].map((match) => match[1]);
}

function assertButtonsAreAccessible(source) {
  const buttons = [...source.matchAll(/<button\b([\s\S]*?)<\/button>/g)];
  buttons.forEach(([, markup]) => {
    assert.match(markup, /\btype="button"/, "Button ohne type=button");
    const hasLabel = /\baria-label="[^"]+"/.test(markup);
    assert.ok(hasLabel || stripMarkup(markup), "Button ohne Namen");
  });
}

function stripMarkup(markup) {
  return markup.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function assertUniqueIds(source) {
  const ids = getAttributeValues(source, "id");
  assert.equal(new Set(ids).size, ids.length, "Doppelte HTML-ID");
}

function assertIdReferences(source, attribute) {
  const ids = new Set(getAttributeValues(source, "id"));
  getAttributeValues(source, attribute).forEach((reference) => {
    reference.split(/\s+/).forEach((id) => {
      assert.ok(ids.has(id), `${attribute} verweist auf fehlende ID ${id}`);
    });
  });
}

function assertDialogContracts(source) {
  const dialogs = [...source.matchAll(/<section\b([\s\S]*?)<\/section>/g)]
    .map((match) => match[0])
    .filter((section) => section.includes("data-game-dialog"));
  assert.equal(dialogs.length, 3, "Unerwartete Dialoganzahl");
  dialogs.forEach((dialog) => assertDialogContract(dialog));
}

function assertDialogContract(dialog) {
  assert.match(dialog, /\baria-modal="true"/);
  assert.match(dialog, /\bdata-dialog-focus\b/);
  assert.match(dialog, /data-ui-action="close-dialog"/);
}

function assertActionBindings(actionNames) {
  const screenActions = actionNames.filter((action) => action !== "mute");
  screenActions.forEach((action) => {
    assert.ok(hasActionKey(screenSource, action), `Aktion fehlt: ${action}`);
  });
  assert.match(storageSource, /boundMuteClick/);
  assert.match(storageSource, /addEventListener\("click", this\.boundMuteClick\)/);
}

function hasActionKey(source, action) {
  const key = action.includes("-") ? `"${action}"` : action;
  return new RegExp(`${key}\\s*:`).test(source);
}

function assertLinkContracts(source) {
  const links = [...source.matchAll(/<a\b([\s\S]*?)<\/a>/g)]
    .map((match) => match[0]);
  assert.equal(links.length, 2, "Unerwartete Linkanzahl");
  assert.match(links[0], /href="mailto:info@developerakademie\.com"/);
  assert.match(links[1], /href="https:\/\/developerakademie\.com\/impressum\/"/);
  assert.match(links[1], /target="_blank"/);
  assert.match(links[1], /rel="noopener noreferrer"/);
}
