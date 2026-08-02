import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { GAMEPLAY_EVENTS } from "../classes/core/gameplay-event-hub.class.js";
import { HudFeedbackController } from
  "../classes/ui/hud-feedback-controller.class.js";
import { setLanguage } from "../js/i18n/localization.js";
import { readAppMarkup } from "./helpers/read-app-markup.mjs";

const ARRIVALS = Object.freeze([
  ["scrapyard-biome-boss", "Fabrik erreicht", "Factory reached"],
  ["factory-biome-boss", "Startturm erreicht", "Launch tower reached"],
  ["launch-tower-biome-boss", "Raumstation erreicht", "Space station reached"],
  ["space-station-biome-boss", "Mond erreicht", "Moon reached"],
]);

const elements = createElements();
const controller = new HudFeedbackController(elements, 40);

assertArrivals("de", 1);
assertArrivals("en", 2);
await assertAccessibleMarkup();

controller.destroy();
setLanguage("de");
console.log("WORLD-011: Vier zweisprachige Gebietsankünfte sind barrierefrei.");

function assertArrivals(language, labelIndex) {
  setLanguage(language);
  ARRIVALS.forEach(([id, germanLabel, englishLabel]) => {
    controller.handle({
      type: GAMEPLAY_EVENTS.WAVE_COMPLETE,
      detail: { id, unlockPlatformId: `${id}-exit` },
    });
    assert.equal(elements.announcement.dataset.kind, "biome");
    assert.match(
      elements.announcement.textContent,
      new RegExp(labelIndex === 1 ? germanLabel : englishLabel),
    );
  });
}

async function assertAccessibleMarkup() {
  const [markup, styles] = await Promise.all([
    readAppMarkup(),
    fs.readFile("styles/hud.css", "utf8"),
  ]);
  assert.match(
    markup,
    /role="status"[\s\S]*?aria-live="polite"[\s\S]*?data-hud-announcement/,
  );
  assert.match(styles, /\.hud-announcement\[data-kind="biome"\]/);
  assert.match(styles, /prefers-reduced-motion:[\s\S]*hud-announcement/);
}

function createElements() {
  return {
    announcement: createElement(),
    fallFeedback: createElement(),
    jumpCharge: createElement(),
    jumpChargeBar: createElement(),
    jumpChargeValue: createElement(),
  };
}

function createElement() {
  return {
    classList: { add() {}, remove() {} },
    dataset: {}, hidden: true, offsetWidth: 100, textContent: "",
    setAttribute() {},
  };
}
