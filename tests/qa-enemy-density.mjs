import assert from "node:assert/strict";
import { GAME_CONFIG } from "../js/config/game-config.js";
import { createLevelOne } from "../js/levels/level-01.js";
import { WaveManager } from "../classes/systems/wave-manager.class.js";

const EXPECTED_WAVE_SIZES = Object.freeze([1, 2, 2, 2, 3, 3, 4, 4]);
const level = createLevelOne(GAME_CONFIG.enemies);
const stages = level.platforms.filter(({ kind }) => {
  return kind === "combat-staging-platform";
}).sort(byStageNumber);
const zones = level.combatZones.filter(({ id }) => {
  return id.startsWith("combat-stage-");
}).sort(byStageNumber);
const enemyById = new Map(level.enemies.map((enemy) => [enemy.id, enemy]));
const weapon = level.collectables.find(({ weaponId }) => {
  return weaponId === "boltThrower";
});

assert.equal(stages.length, 8);
assert.equal(zones.length, 8);
assert.deepEqual(zones.map(({ enemyIds }) => enemyIds.length),
  EXPECTED_WAVE_SIZES);
assert.equal(zones.flatMap(({ enemyIds }) => enemyIds).length, 21);
assert.equal(level.enemies.length, 22);
assert.ok(stages.every(({ y }) => y < weapon.y));
assert.equal(zones.filter(({ unlockPlatformId }) => unlockPlatformId).length, 4);
assert.deepEqual(zones.map(({ unlockPlatformId }, index) => {
  return unlockPlatformId ? index + 1 : null;
}).filter(Boolean), [3, 5, 7, 8]);
assert.equal(zones[0].enemyIds.length, 1);
assert.deepEqual(typesIn(zones[0]), ["scrapCrawler"]);
assert.ok(typesIn(zones[2]).includes("droneGuard"));
assert.ok(typesIn(zones[3]).includes("springMine"));
assertGroundEnemiesArePlatformBound();
assertEnemyReferencesAreUnique();
assertEncounterActivation();

console.log("ENM-003: 21 Gegner in acht ansteigenden Kampfbegegnungen bestanden.");

function assertGroundEnemiesArePlatformBound() {
  stages.forEach((stage, index) => {
    zones[index].enemyIds.map((id) => enemyById.get(id))
      .filter(({ type }) => type !== "droneGuard")
      .forEach((enemy) => {
        assert.equal(enemy.anchorPlatformId, stage.id);
        assert.equal(enemy.y + enemy.height, stage.y);
        assert.ok(enemy.patrolMinX >= stage.x);
        assert.ok(enemy.patrolMaxX <= stage.x + stage.width);
      });
  });
}

function assertEnemyReferencesAreUnique() {
  const ids = zones.flatMap(({ enemyIds }) => enemyIds);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.every((id) => enemyById.has(id)));
}

function assertEncounterActivation() {
  const activeEnemies = [];
  const world = {
    character: { x: 320, y: stages[0].y - 200, width: 64, height: 96 },
    gameplayEvents: { emit() {} },
    addEntity(_group, enemy) { activeEnemies.push(enemy); },
    removeEntity() {},
    getEntities() { return Object.freeze([...activeEnemies]); },
  };
  const manager = new WaveManager(
    level.combatZones, level.enemies, level.platforms,
  );
  manager.initialize(world);
  assert.equal(activeEnemies.length, 0);
  manager.update(world);
  assert.deepEqual(activeEnemies.map(({ id }) => id), zones[0].enemyIds);
  activeEnemies.length = 0;
  manager.update(world);
  assert.deepEqual(manager.takeCompletedWaves().map(({ id }) => id),
    [zones[0].id]);
}

function typesIn(zone) {
  return zone.enemyIds.map((id) => enemyById.get(id).type);
}

function byStageNumber(first, second) {
  return Number.parseInt(first.id.replace("combat-stage-", ""), 10) -
    Number.parseInt(second.id.replace("combat-stage-", ""), 10);
}
