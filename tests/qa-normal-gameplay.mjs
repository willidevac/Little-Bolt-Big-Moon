import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { GAME_CONFIG } from "../js/config/game-config.js";
import { PLATFORM_WIDTHS } from "../js/config/platform-route-rules.js";
import { createLevelOne } from "../js/levels/level-01.js";
import { WORLD_ENTITY_GROUPS } from "../classes/core/world-entity-groups.js";
import { PlatformRouteBuilder } from
  "../classes/systems/platform-route-builder.class.js";
import { WaveManager } from "../classes/systems/wave-manager.class.js";

const levelData = JSON.parse(
  await readFile(new URL("../data/levels/level-01.json", import.meta.url), "utf8"),
);
const completeRoute = new PlatformRouteBuilder(levelData.width)
  .build(levelData.sections);
const route = completeRoute
  .filter(({ roomRole }) => roomRole !== "shortcut")
  .sort((first, second) => second.y - first.y);
const level = createLevelOne(GAME_CONFIG.enemies);
const routeJumps = route.slice(1).map((upper, index) => {
  return Object.freeze({ lower: route[index], upper });
});

assertEveryJumpIsReachable();
assertDifficultyCurve();
assertBossSupplies();
assertBossGatesBlockSkipping();
assertBossGateLifecycle();

console.log(
  "GAME-001: Normalroute, Schwierigkeitskurve und Bossgrenzen bestanden.",
);

function assertEveryJumpIsReachable() {
  const unreachable = routeJumps.filter(({ lower, upper }) => {
    return getChargeRatios(lower, upper).length === 0;
  });
  assert.deepEqual(unreachable, []);
  assert.equal(routeJumps.length, 955);
}

function assertDifficultyCurve() {
  const factory = getBiomeWindows("factory");
  const launchTower = getBiomeWindows("launch-tower");
  const moon = getBiomeWindows("moon");
  assert.ok(getAverage(factory) > getAverage(launchTower));
  assert.equal(factory.filter(isTightWindow).length, 0);
  assert.ok(moon.filter(isTightWindow).length >= 4);
}

function getBiomeWindows(tileset) {
  return routeJumps.filter(({ lower }) => lower.tileset === tileset)
    .map(({ lower, upper }) => getChargeWindow(lower, upper));
}

function getChargeWindow(lower, upper) {
  const ratios = getChargeRatios(lower, upper);
  if (ratios.length === 0) return -1;
  return ratios.at(-1) - ratios[0];
}

function getChargeRatios(lower, upper) {
  return Array.from({ length: 1001 }, (_, index) => index / 1000)
    .filter((ratio) => canLand(lower, upper, ratio));
}

function canLand(lower, upper, ratio) {
  const flight = getFlight(lower, upper, ratio);
  if (!flight) return false;
  return [-1, 0, 1].some((direction) => {
    const distance = direction * flight.horizontalSpeed * flight.seconds;
    return landingIntervalsOverlap(lower, upper, distance);
  });
}

function getFlight(lower, upper, ratio) {
  const character = GAME_CONFIG.character;
  const gravity = GAME_CONFIG.physics.gravityPixelsPerSecondSquared;
  const verticalRange = character.maximumJumpSpeedPixelsPerSecond -
    character.minimumJumpSpeedPixelsPerSecond;
  const verticalSpeed = character.minimumJumpSpeedPixelsPerSecond +
    verticalRange * ratio;
  return createFlight(verticalSpeed, lower.y - upper.y, gravity, ratio);
}

function createFlight(verticalSpeed, height, gravity, ratio) {
  const discriminant = verticalSpeed ** 2 - 2 * gravity * height;
  if (discriminant < 0) return null;
  const character = GAME_CONFIG.character;
  const horizontalRange = character.maximumJumpHorizontalSpeedPixelsPerSecond -
    character.minimumJumpHorizontalSpeedPixelsPerSecond;
  return Object.freeze({
    seconds: (verticalSpeed + Math.sqrt(discriminant)) / gravity,
    horizontalSpeed: character.minimumJumpHorizontalSpeedPixelsPerSecond +
      horizontalRange * ratio,
  });
}

function landingIntervalsOverlap(lower, upper, distance) {
  const lowerLeft = lower.x - 12 + distance;
  const lowerRight = lower.x + PLATFORM_WIDTHS[lower.type] - 52 + distance;
  const upperLeft = upper.x - 52;
  const upperRight = upper.x + PLATFORM_WIDTHS[upper.type] - 12;
  return lowerLeft <= upperRight && lowerRight >= upperLeft;
}

function getAverage(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function isTightWindow(window) {
  return window >= 0 && window < 0.08;
}

function assertBossSupplies() {
  const bosses = level.enemies.filter(({ isBoss }) => isBoss);
  const weapons = GAME_CONFIG.weapons.definitions;
  const hitCounts = bosses.map((boss) => {
    return getBossHitCount(boss.maximumHealth, weapons);
  });
  assert.deepEqual(hitCounts, [7, 9, 9, 12, 20]);
  assert.equal(getBossAmmo().length, bosses.length);
}

function getBossHitCount(health, weapons) {
  const boltDamage = GAME_CONFIG.hud.maximumAmmo * weapons.boltThrower.damage;
  const usedBoltDamage = Math.min(health, boltDamage);
  const boltHits = Math.ceil(usedBoltDamage / weapons.boltThrower.damage);
  const remaining = Math.max(0, health - usedBoltDamage);
  return boltHits + Math.ceil(remaining / weapons.repairWrench.damage);
}

function getBossAmmo() {
  return level.collectables.filter((item) => {
    return item.type === "ammo" && item.id.includes("boss-ammo");
  });
}

function assertBossGatesBlockSkipping() {
  const zones = getLockedBossZones();
  assert.equal(zones.length, 4);
  zones.forEach((zone) => {
    const gateIndex = route.findIndex(({ id }) => id === zone.unlockPlatformId);
    const lower = route[gateIndex - 1];
    const gate = route[gateIndex];
    assert.ok(getChargeRatios(lower, gate).length > 0);
    assert.deepEqual(getGateBypasses(lower, gate), []);
  });
}

function getGateBypasses(lower, gate) {
  const gravity = GAME_CONFIG.physics.gravityPixelsPerSecondSquared;
  const speed = GAME_CONFIG.character.maximumJumpSpeedPixelsPerSecond;
  const maximumRise = speed ** 2 / (2 * gravity);
  return completeRoute.filter((platform) => {
    const rise = lower.y - platform.y;
    const canReach = getChargeRatios(lower, platform).length > 0;
    return platform.id !== gate.id && rise > 0 && rise <= maximumRise && canReach;
  });
}

function assertBossGateLifecycle() {
  const zones = getLockedBossZones();
  const enemies = getZoneEnemies(zones);
  const state = createWorldState(level.platforms);
  const world = createWorldMock(state);
  const manager = new WaveManager(zones, enemies, level.platforms);
  manager.initialize(world);
  assertGatesAreMissing(zones, state.platforms);
  zones.forEach((zone) => defeatZone(manager, world, zone, state));
  assert.equal(manager.takeCompletedWaveIds().length, zones.length);
}

function getLockedBossZones() {
  return level.combatZones.filter(({ unlockPlatformId }) => unlockPlatformId);
}

function getZoneEnemies(zones) {
  const ids = new Set(zones.flatMap(({ enemyIds }) => enemyIds));
  return level.enemies.filter(({ id }) => ids.has(id));
}

function createWorldState(platforms) {
  return { enemies: [], platforms: [...platforms] };
}

function createWorldMock(state) {
  return {
    character: { x: 0, y: 0, width: 64, height: 64 },
    gameplayEvents: { emit() {} },
    addEntity: (group, entity) => addEntity(state, group, entity),
    removeEntity: (group, entity) => removeEntity(state, group, entity),
    getEntities: (group) => Object.freeze([...state[group]]),
  };
}

function addEntity(state, group, entity) {
  if (!state[group].includes(entity)) state[group].push(entity);
}

function removeEntity(state, group, entity) {
  const index = state[group].indexOf(entity);
  if (index >= 0) state[group].splice(index, 1);
}

function assertGatesAreMissing(zones, platforms) {
  zones.forEach((zone) => {
    assert.equal(platforms.some(({ id }) => id === zone.unlockPlatformId), false);
  });
}

function defeatZone(manager, world, zone, state) {
  Object.assign(world.character, { x: zone.x, y: zone.y });
  manager.update(world);
  zone.enemyIds.forEach((id) => removeEnemy(state.enemies, id));
  manager.update(world);
  assert.ok(state.platforms.some(({ id }) => id === zone.unlockPlatformId));
}

function removeEnemy(enemies, id) {
  const enemy = enemies.find((candidate) => candidate.id === id);
  if (enemy) enemies.splice(enemies.indexOf(enemy), 1);
}
