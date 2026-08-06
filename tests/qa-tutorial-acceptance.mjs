import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { GAME_CONFIG } from "../js/config/game-config.js";
import { Camera } from "../classes/core/camera.class.js";
import { GAME_LEVEL_IDS } from "../js/config/level-config.js";
import { TUTORIAL_STEP_ORDER } from "../js/config/tutorial-config.js";
import { TRANSLATION_CATALOG } from
  "../js/i18n/translation-catalog.js";
import { createGameLevelSelection } from
  "../js/levels/game-level-selection.js";
import { createLevelOne } from "../js/levels/level-01.js";
import { createTutorialLevel } from "../js/levels/tutorial-level.js";
import { readAppMarkup } from "./helpers/read-app-markup.mjs";

const tutorial = createTutorialLevel();

await assertPublicInterface();
assertTutorialWorld();
assertTutorialCamera();
assertLocalizedJourney();
assertMainLevelUnchanged();
await assertCompletionContract();

console.log("TUTORIAL-011: Alle automatisierbaren Tutorial-Abnahmekriterien bestanden.");

/** Verifies public menu, touch-capable controls, and completion actions. */
async function assertPublicInterface() {
  const html = await readAppMarkup();
  assert.match(html, /data-ui-action="tutorial"/);
  assert.match(html, /data-input-action="attack"/);
  ["tutorial-main", "tutorial-replay", "home"].forEach((action) => {
    assert.match(html, new RegExp(`data-ui-action="${action}"`));
  });
}

/** Verifies dimensions and every required production content category. */
function assertTutorialWorld() {
  assert.deepEqual([tutorial.width, tutorial.height], [1280, 1600]);
  const weapon = tutorial.collectables.find(({ type }) => type === "weapon");
  assert.equal(weapon.weaponId, "boltThrower");
  assert.deepEqual(tutorial.collectables.slice(0, 2).map(({ type }) => type), [
    "gear", "energy",
  ]);
  assert.deepEqual(tutorial.platforms.filter(({ mechanic }) => mechanic)
    .map(({ mechanic }) => mechanic), ["spring", "falling", "trap"]);
  assert.deepEqual(tutorial.enemies.slice(1).map(({ type }) => type), [
    "scrapCrawler", "droneGuard",
  ]);
  assert.equal(tutorial.combatZones.length, 1);
}

/** Verifies full tracking in the top room without changing main camera limits. */
function assertTutorialCamera() {
  const target = { y: 26, height: 64 };
  const tutorialCamera = new Camera(GAME_CONFIG, tutorial.cameraBounds);
  const mainCamera = new Camera(GAME_CONFIG);
  tutorialCamera.reset(target);
  mainCamera.reset(target);
  assert.equal(mainCamera.y, 0);
  assert.equal(tutorialCamera.y, -242);
  assert.equal(target.y + target.height / 2 - tutorialCamera.y,
    tutorial.cameraBounds.deadZoneTopPixels);
}

/** Verifies every lesson and final action in German and English. */
function assertLocalizedJourney() {
  [TRANSLATION_CATALOG.de, TRANSLATION_CATALOG.en].forEach((catalog) => {
    TUTORIAL_STEP_ORDER.slice(0, -1).forEach((stepId) => {
      assert.ok(catalog[`tutorial.step.${stepId}.title`]);
      assert.ok(catalog[`tutorial.step.${stepId}.copy`]);
    });
    ["eyebrow", "title", "copy", "menu", "main", "replay", "home"]
      .forEach((key) => assert.ok(catalog[`tutorial.complete.${key}`]));
  });
}

/** Verifies central selection returns the untouched production main level. */
function assertMainLevelUnchanged() {
  const selection = createGameLevelSelection(GAME_CONFIG.enemies);
  selection.select(GAME_LEVEL_IDS.MAIN);
  const selected = selection.createLevel();
  const direct = createLevelOne(GAME_CONFIG.enemies);
  assert.deepEqual(createLevelSignature(selected), createLevelSignature(direct));
}

/** Creates a stable content signature without comparing mutable entities. */
function createLevelSignature(level) {
  return {
    id: level.id, width: level.width, height: level.height,
    platforms: level.platforms.map(({ id }) => id),
    collectables: level.collectables.map(({ id }) => id),
    enemies: level.enemies.map(({ id }) => id),
  };
}

/** Verifies prompt hiding, score isolation, and stored completion wiring. */
async function assertCompletionContract() {
  const prompt = await fs.readFile(
    "classes/ui/tutorial-prompt-controller.class.js", "utf8",
  );
  const storage = await fs.readFile(
    "classes/ui/storage-controller.class.js", "utf8",
  );
  const completion = await fs.readFile(
    "classes/ui/tutorial-completion-controller.class.js", "utf8",
  );
  assert.match(prompt, /status === TUTORIAL_STATUSES\.ACTIVE/);
  assert.match(storage, /levelId === GAME_LEVEL_IDS\.TUTORIAL/);
  assert.match(completion, /setTutorialCompleted\(\)/);
  assert.match(completion, /this\.game\.win\(\)/);
}
