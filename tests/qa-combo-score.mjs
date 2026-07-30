import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { GAME_CONFIG } from "../js/config/game-config.js";
import { RunScore } from "../classes/systems/run-score.class.js";
import { RunStats } from "../classes/systems/run-stats.class.js";
import { TRANSLATION_CATALOG } from "../js/i18n/translation-catalog.js";

const config = GAME_CONFIG.hud.scoring;

assertScoringSequence();
assertTimeoutAndFall();
assertDamageAndReset();
assertMaximumAndReproduction();
assertInvalidActivity();
await assertHudContract();

console.log("COMBO-001: Aktionen, Multiplikator, Abbrüche und HUD bestanden.");

function assertScoringSequence() {
  const score = new RunScore(0, config);
  assert.equal(score.addPickups([createPickup("ammo-1")]), true);
  assert.equal(score.value, 100);
  assert.equal(score.addPickups([createPickup("ammo-2")]), true);
  assert.equal(score.value, 300);
  score.addEnemies([{ id: "crawler-1", type: "scrapCrawler" }]);
  assert.equal(score.value, 2550);
  assert.deepEqual(score.getComboSnapshot(), createCombo(3, 3, true));
  assert.equal(score.addPickups([createPickup("ammo-1")]), false);
  assert.equal(score.value, 2550);
}

function assertTimeoutAndFall() {
  const score = new RunScore(0, config);
  score.addPickups([createPickup("energy-1", "energy")]);
  assert.equal(score.updateTime(config.combo.windowSeconds, 0), true);
  assert.deepEqual(score.getComboSnapshot(), createCombo(0, 1, false));
  score.addPickups([createPickup("energy-2", "energy")]);
  assert.equal(score.updateTime(0, config.combo.fallResetPixels), true);
  assert.deepEqual(score.getComboSnapshot(), createCombo(0, 1, false));
}

function assertDamageAndReset() {
  const stats = new RunStats(GAME_CONFIG.hud, 149_776);
  stats.applyPickups([createPickup("gear-1", "gear", 1)]);
  assert.deepEqual(stats.getSnapshot().combo, createCombo(1, 1, true));
  stats.takeDamage(10);
  assert.deepEqual(stats.getSnapshot().combo, createCombo(0, 1, false));
  stats.applyPickups([createPickup("gear-2", "gear", 1)]);
  stats.reset();
  assert.deepEqual(stats.getSnapshot().combo, createCombo(0, 1, false));
}

function assertMaximumAndReproduction() {
  const first = createRepeatedScore();
  const second = createRepeatedScore();
  assert.equal(first.value, 2000);
  assert.equal(first.value, second.value);
  assert.deepEqual(first.getComboSnapshot(), createCombo(6, 5, true));
  assert.deepEqual(first.getComboSnapshot(), second.getComboSnapshot());
}

function createRepeatedScore() {
  const score = new RunScore(0, config);
  for (let index = 1; index <= 6; index += 1) {
    score.addPickups([createPickup(`pickup-${index}`)]);
  }
  return score;
}

function assertInvalidActivity() {
  const score = new RunScore(0, config);
  assert.equal(score.addPickups([{ type: "ammo", amount: 1 }]), false);
  assert.throws(() => {
    score.addPickups([createPickup("broken", "ammo", 0)]);
  }, TypeError);
  assert.throws(() => score.updateTime(-1, 0), TypeError);
}

async function assertHudContract() {
  const html = await fs.readFile("index.html", "utf8");
  const styles = await fs.readFile("styles/hud.css", "utf8");
  const status = await fs.readFile("classes/ui/status-bar.class.js", "utf8");
  assert.match(html, /data-hud-combo[\s\S]+aria-live="polite"/);
  assert.match(styles, /\.hud-combo/);
  assert.match(styles, /max-width: 700px/);
  assert.match(status, /renderCombo\(data\.combo\)/);
  assert.ok(TRANSLATION_CATALOG.de["hud.comboStatus"]);
  assert.ok(TRANSLATION_CATALOG.en["hud.comboStatus"]);
}

function createPickup(id, type = "ammo", amount = 1) {
  return Object.freeze({ id, type, amount });
}

function createCombo(count, multiplier, isActive) {
  return { count, multiplier, isActive };
}
