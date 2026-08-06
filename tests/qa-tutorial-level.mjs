import assert from "node:assert/strict";
import { createTutorialLevel } from "../js/levels/tutorial-level.js";
import { createGameLevelSelection } from
  "../js/levels/game-level-selection.js";
import { GAME_LEVEL_IDS } from "../js/config/level-config.js";
import { GAME_CONFIG } from "../js/config/game-config.js";
import { evaluateJumpWindow } from
  "../js/utils/jump-reachability.js";

const level = createTutorialLevel();
const route = [...level.platforms].sort((first, second) => {
  return first.routeOrder - second.routeOrder;
});

assert.equal(level.id, "tutorial-scrapyard");
assert.deepEqual([level.width, level.height], [1280, 1600]);
assert.deepEqual([level.sections[0].topY, level.sections[0].bottomY], [0, 1600]);
assert.match(level.sections[0].backgroundLayers[0].source, /scrapyard-/);
assert.deepEqual(level.structures.map(({ side }) => side), ["left", "right"]);
assert.ok(level.structures.every(({ y, height }) => y === 0 && height === 1600));
assert.deepEqual([route[0].x, route[0].width], [0, level.width]);
assert.equal(level.playerStart.y + 55, route[0].y);
assert.equal(new Set(route.map(({ id }) => id)).size, route.length);
assertSafeJumps(route);
assertEmptyContent(level);
assertTutorialRegistration();

console.log("TUTORIAL-002: Die kompakte Tutorial-Basiswelt ist spielbar verbunden.");

/** Verifies every consecutive tutorial platform against production physics. */
function assertSafeJumps(platforms) {
  platforms.slice(1).forEach((upper, index) => {
    const window = evaluateJumpWindow(
      platforms[index], upper, GAME_CONFIG.physics, GAME_CONFIG.character,
    );
    assert.ok(window.frameCount >= 6, `${upper.id}: ${window.frameCount}`);
  });
}

/** Verifies that later tutorial tasks still own interactive content. */
function assertEmptyContent(tutorial) {
  ["collectables", "storyProps", "hazards", "combatZones", "enemies"]
    .forEach((property) => assert.deepEqual(tutorial[property], []));
}

/** Verifies that the public menu selection can create the tutorial. */
function assertTutorialRegistration() {
  const selection = createGameLevelSelection(GAME_CONFIG.enemies);
  assert.equal(selection.hasLevel(GAME_LEVEL_IDS.TUTORIAL), true);
  selection.select(GAME_LEVEL_IDS.TUTORIAL);
  assert.equal(selection.createLevel().id, "tutorial-scrapyard");
}
