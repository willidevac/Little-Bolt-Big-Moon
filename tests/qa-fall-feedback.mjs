import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { readAppMarkup } from "./helpers/read-app-markup.mjs";
import { GAME_CONFIG } from "../js/config/game-config.js";
import { FallTracker } from "../classes/systems/fall-tracker.class.js";
import { GAMEPLAY_EVENTS } from "../classes/core/gameplay-event-hub.class.js";
import { TRANSLATION_CATALOG } from "../js/i18n/translation-catalog.js";

const tracker = new FallTracker(GAME_CONFIG.world);

assertSmallJumpIsIgnored();
assertCompletedFallsAreClassified();
await assertAccessibleHudContract();

console.log("FALL-002: Erkennung, Bewertung und Sturzanzeige bestanden.");

function assertSmallJumpIsIgnored() {
  tracker.reset(createTarget(1000, true));
  tracker.update(createTarget(800, false));
  tracker.update(createTarget(1000, true));
  assert.equal(tracker.takeCompletedFall(), null);
}

function assertCompletedFallsAreClassified() {
  assertFall(1000, 1400, "normal");
  assertFall(1400, 2350, "hard");
  assertFall(2350, 4200, "severe");
  assert.equal(tracker.takeCompletedFall(), null);
}

function assertFall(startY, landingY, severity) {
  tracker.reset(createTarget(startY, true));
  tracker.update(createTarget(startY - 100, false));
  tracker.update(createTarget(landingY, false));
  tracker.update(createTarget(landingY, true));
  assert.deepEqual(tracker.takeCompletedFall(), {
    lossPixels: landingY - startY,
    severity,
  });
}

async function assertAccessibleHudContract() {
  const html = await readAppMarkup();
  const feedback = await fs.readFile(
    "classes/ui/hud-feedback-controller.class.js", "utf8",
  );
  assert.match(html, /data-hud-fall-feedback[\s\S]*?<\/output>/);
  assert.match(html, /hud-fall-feedback[\s\S]+aria-live="polite"/);
  assert.match(feedback, /GAMEPLAY_EVENTS\.PLAYER_FALL/);
  assert.equal(GAMEPLAY_EVENTS.PLAYER_FALL, "playerFall");
  ["normal", "hard", "severe"].forEach(assertTranslationPair);
}

function assertTranslationPair(severity) {
  assert.ok(TRANSLATION_CATALOG.de[`fall.${severity}`]);
  assert.ok(TRANSLATION_CATALOG.en[`fall.${severity}`]);
}

function createTarget(y, isOnGround) {
  return { y, isOnGround };
}
