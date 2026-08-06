import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { readAppMarkup } from "./helpers/read-app-markup.mjs";
import { TRANSLATION_CATALOG } from
  "../js/i18n/translation-catalog.js";

const html = await readAppMarkup();
const css = await fs.readFile("styles/tutorial.css", "utf8");
const source = await fs.readFile(
  "classes/ui/tutorial-prompt-controller.class.js", "utf8",
);
const stepIds = [
  "movement", "resources", "shortJump", "chargedJump", "wallRebound",
  "platformMechanics",
  "weaponPickup", "practiceTarget",
  "combat", "boss",
];

assert.match(html, /<aside[\s\S]*?aria-live="polite"[\s\S]*?data-tutorial-prompt/);
assert.match(html, /data-tutorial-title/);
assert.match(html, /data-tutorial-copy/);
assert.match(html, /data-tutorial-progress/);
assert.match(css, /pointer-events:\s*none/);
assert.match(css, /@container game-shell \(max-width:\s*1066px\)/);
assert.match(source, /director\.onChange/);
assert.match(source, /onLanguageChange/);
assertTranslations(stepIds);

console.log("TUTORIAL-005: Die zugängliche Lektionsanzeige ist lokalisiert.");

/** Verifies both texts for every currently reachable lesson. */
function assertTranslations(ids) {
  [TRANSLATION_CATALOG.de, TRANSLATION_CATALOG.en].forEach((catalog) => {
    ids.forEach((stepId) => {
      assert.ok(catalog[`tutorial.step.${stepId}.title`]);
      assert.ok(catalog[`tutorial.step.${stepId}.copy`]);
    });
    assert.ok(catalog["tutorial.progress"]);
  });
}
