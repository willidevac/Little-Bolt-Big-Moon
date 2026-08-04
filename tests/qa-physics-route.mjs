import assert from "node:assert/strict";
import { createLevelOne } from "../js/levels/level-01.js";
import { GAME_CONFIG } from "../js/config/game-config.js";
import { WALL_BOUNCE_CHALLENGES } from
  "../js/config/wall-course-config.js";
import { evaluateJumpWindow } from
  "../js/utils/jump-reachability.js";

const MINIMUM_FRAMES = Object.freeze({
  scrapyard: 7, factory: 6, "launch-tower": 5,
  "space-station": 4, moon: 3,
});
const level = createLevelOne();
const route = level.platforms
  .filter(({ routeRole }) => routeRole === "main")
  .sort((first, second) => first.routeOrder - second.routeOrder);

const regularJumps = route.slice(1).map((upper, index) => ({
  lower: route[index], upper,
})).filter(({ upper }) => !upper.requiresWallBounce);

regularJumps.forEach(({ lower, upper }) => {
  const window = evaluateJumpWindow(
    lower, upper, GAME_CONFIG.physics, GAME_CONFIG.character,
  );
  const required = MINIMUM_FRAMES[upper.biomeId];
  assert.ok(window.frameCount >= required,
    `${lower.id} -> ${upper.id}: ${window.frameCount}/${required} frames`);
});

for (const biomeId of Object.keys(MINIMUM_FRAMES)) {
  const jumps = regularJumps.filter(({ upper }) => upper.biomeId === biomeId)
    .map(({ lower, upper }) => evaluateJumpWindow(
      lower, upper, GAME_CONFIG.physics, GAME_CONFIG.character,
    ));
  const fullChargeRatio = jumps.filter(({ fullChargeWorks }) => {
    return fullChargeWorks;
  }).length / jumps.length;
  assert.ok(fullChargeRatio >= 0.15 && fullChargeRatio <= 0.45,
    `${biomeId} full-charge ratio is ${fullChargeRatio}`);
  assert.ok(jumps.some(({ samples }) => samples.some(({ direction }) => {
    return direction === 0;
  })), `${biomeId} has no neutral jump.`);
}

WALL_BOUNCE_CHALLENGES.forEach((challenge) => {
  const approach = route.find(({ preparesWallBounce }) => {
    return preparesWallBounce === challenge.id;
  });
  const entry = level.platforms.find(({ anchorStructureId }) => {
    return anchorStructureId ===
      `${challenge.id}-${challenge.entrySide}-wall`;
  });
  const window = evaluateJumpWindow(
    approach, entry, GAME_CONFIG.physics, GAME_CONFIG.character,
  );
  assert.ok(window.frameCount >= 6,
    `${challenge.id} entry only has ${window.frameCount} frames`);
});

assert.equal(GAME_CONFIG.character.jumpChargeSeconds, 0.55);
assert.equal(GAME_CONFIG.character.maximumJumpSpeedPixelsPerSecond, 1440);
assert.equal(GAME_CONFIG.character.maximumJumpHorizontalSpeedPixelsPerSecond, 600);

console.log(
  `PHYS-ROUTE-001: ${regularJumps.length} route jumps have safe 60 FPS windows.`,
);
