import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { readAppMarkup } from "./helpers/read-app-markup.mjs";
import { TRANSLATION_CATALOG } from
  "../js/i18n/translation-catalog.js";

const html = await readAppMarkup();
const controller = await fs.readFile(
  "classes/ui/screen-controller.class.js", "utf8",
);
const tutorialPosition = html.indexOf('data-ui-action="tutorial"');
const mainPosition = html.indexOf('data-ui-action="start"');

assert.ok(tutorialPosition >= 0 && tutorialPosition < mainPosition);
assert.match(html, /menu-button--primary[\s\S]*?data-ui-action="tutorial"/);
assert.equal(TRANSLATION_CATALOG.de["home.tutorial"], "Tutorial – empfohlen");
assert.equal(TRANSLATION_CATALOG.en["home.tutorial"], "Tutorial – recommended");
assert.match(controller, /tutorial:\s*\(\)\s*=>\s*this\.startRun/);
assert.match(controller, /tutorialButton\.disabled/);

console.log("TUTORIAL-001: Der lokalisierte Tutorial-Menüweg ist vorbereitet.");
