import assert from "node:assert/strict";
import { GAME_CONFIG } from "../js/config/game-config.js";
import { createLevelOne } from "../js/levels/level-01.js";

const BIOMES = Object.freeze(["scrapyard", "factory", "launch", "space", "moon"]);
const level = createLevelOne(GAME_CONFIG.enemies);
const patrolZones = level.combatZones.filter(({ id }) => id.includes("patrol"));
const patrolIds = new Set(patrolZones.flatMap(({ enemyIds }) => enemyIds));
const patrolEnemies = level.enemies.filter(({ id }) => patrolIds.has(id));

assert.equal(level.enemies.length, 57);
assert.equal(level.combatZones.length, 30);
assert.equal(patrolZones.length, 15);
assert.equal(patrolEnemies.length, 30);
assert.ok(patrolZones.every(({ enemyIds }) => enemyIds.length === 2));
assert.ok(patrolEnemies.every((enemy) => !enemy.isBoss && !enemy.isElite));
assertPatrolZonesContainEnemies();
assertGroundEnemiesHaveFixedSupport();
BIOMES.forEach(assertBiomeSpacing);

console.log("ENM-003: 57 fair verteilte Gegner in 30 Begegnungen bestanden.");

function assertPatrolZonesContainEnemies() {
  patrolZones.forEach((zone) => zone.enemyIds.forEach((id) => {
    const enemy = patrolEnemies.find((candidate) => candidate.id === id);
    assert.ok(enemy.y >= zone.y && enemy.y < zone.y + zone.height);
  }));
}

function assertGroundEnemiesHaveFixedSupport() {
  patrolEnemies.filter(({ type }) => type === "scrapCrawler").forEach((enemy) => {
    const support = level.platforms.find((platform) => {
      return platform.constructor.name === "Platform" &&
        platform.y === enemy.y + enemy.height && overlaps(enemy, platform);
    });
    assert.ok(support, `${enemy.id} braucht eine feste Plattform.`);
  });
}

function assertBiomeSpacing(prefix) {
  const zones = level.combatZones.filter(({ id }) => id.startsWith(prefix));
  const heights = zones.map(({ y }) => y).sort((a, b) => b - a);
  const gaps = heights.slice(1).map((height, index) => heights[index] - height);
  assert.equal(zones.length, 6);
  assert.ok(gaps.every((gap) => gap >= 3000 && gap <= 8000));
}

function overlaps(first, second) {
  return first.x < second.x + second.width &&
    first.x + first.width > second.x;
}
