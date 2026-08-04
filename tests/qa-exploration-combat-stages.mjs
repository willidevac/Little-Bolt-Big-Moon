import assert from "node:assert/strict";
import { createLevelOne } from "../js/levels/level-01.js";
import { GAME_CONFIG } from "../js/config/game-config.js";

const level = createLevelOne();
const route = level.platforms.filter(({ routeRole }) => routeRole === "main")
  .sort((first, second) => first.routeOrder - second.routeOrder);
const searches = level.platforms.filter(({ kind }) => {
  return kind === "search-route-platform";
});
const stages = level.platforms.filter(({ kind }) => {
  return kind === "combat-staging-platform";
});
const weapon = level.collectables.find(({ weaponId }) => {
  return weaponId === "boltThrower";
});

assert.equal(searches.length, 10);
assert.equal(new Set(searches.map(({ searchAreaId }) => searchAreaId)).size, 5);
assert.equal(stages.length, 8);
assert.ok(searches.some(({ y }) => y > weapon.y));
assert.ok(searches.some(({ y }) => y < weapon.y));
assert.ok(stages.every((platform) => platform.y < weapon.y));
assert.ok(stages.every((platform) => platform.width >= 500));
assert.ok(stages.every((platform) => platform.mechanic === null));
assert.equal(new Set(stages.map(({ anchorRoutePlatformId }) => {
  return anchorRoutePlatformId;
})).size, stages.length);
const searchRewards = level.collectables.filter((item) => {
  return item.anchorPlatform.routeRole === "search-branch";
});
assert.equal(searchRewards.length, 5);
assert.ok(searchRewards.every(({ anchorPlatform }) => anchorPlatform.isDeadEnd));
assert.equal(level.collectables.some((item) => {
  return item.anchorPlatform.routeRole === "combat-stage";
}), false);
assert.equal(level.enemies.filter(({ isBoss }) => isBoss).length, 1);
assert.equal(level.combatZones.filter(({ id }) => {
  return id.startsWith("combat-stage-");
}).length, stages.length);

assertSearchRoutes();
assertCombatStagesClear();

console.log("MAP-TEST-003: Fünf Suchbereiche und acht spätere Kampfplätze bestanden.");

function assertSearchRoutes() {
  for (const areaId of new Set(searches.map(({ searchAreaId }) => searchAreaId))) {
    const branch = searches.filter((platform) => {
      return platform.searchAreaId === areaId;
    }).sort((first, second) => first.branchOrder - second.branchOrder);
    const base = route.find(({ id }) => id === branch[0].searchBasePlatformId);
    assert.ok(canReach(base, branch[0]));
    assert.ok(canReach(branch[0], branch[1]));
    assert.equal(branch[0].isDeadEnd, false);
    assert.equal(branch[1].isDeadEnd, true);
    branch.forEach((platform) => {
      const parallel = route.find(({ id }) => {
        return id === platform.parallelMainPlatformId;
      });
      assert.ok(horizontalGap(platform, parallel) >= 64);
    });
  }
}

function assertCombatStagesClear() {
  stages.forEach((stage) => {
    const anchor = route.find(({ id }) => id === stage.anchorRoutePlatformId);
    assert.equal(stage.y, anchor.y);
    assert.ok(horizontalGap(stage, anchor) >= 64);
    assert.equal(stage.unlockedAfterWeaponId, "boltThrower");
  });
}

function canReach(lower, upper) {
  const rise = lower.y - upper.y;
  const speed = GAME_CONFIG.character.maximumJumpSpeedPixelsPerSecond;
  const gravity = GAME_CONFIG.physics.gravityPixelsPerSecondSquared;
  const discriminant = speed ** 2 - 2 * gravity * rise;
  if (rise <= 0 || discriminant < 0) return false;
  const seconds = (speed + Math.sqrt(discriminant)) / gravity;
  return horizontalGap(lower, upper) <= seconds *
    GAME_CONFIG.character.maximumJumpHorizontalSpeedPixelsPerSecond;
}

function horizontalGap(first, second) {
  return Math.max(0,
    second.x - (first.x + first.width),
    first.x - (second.x + second.width),
  );
}
