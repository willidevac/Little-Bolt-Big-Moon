import assert from "node:assert/strict";
import { GAME_CONFIG } from "../js/config/game-config.js";
import {
  TUTORIAL_BOSS_ID, TUTORIAL_BOSS_ZONE_ID, TUTORIAL_COMBAT_ZONE_ID,
} from "../js/config/tutorial-config.js";
import { createTutorialLevel } from "../js/levels/tutorial-level.js";
import { initializeTutorialBossTracker } from
  "../js/factories/tutorial-boss-tracker.js";
import { initializeTutorialCombatTracker } from
  "../js/factories/tutorial-combat-tracker.js";
import { initializeTutorialDirector } from
  "../js/factories/tutorial-director.js";
import { GAME_STATES } from "../classes/core/game-state-machine.class.js";
import { GameplayEventHub, GAMEPLAY_EVENTS } from
  "../classes/core/gameplay-event-hub.class.js";
import { World, WORLD_ENTITY_GROUPS } from "../classes/core/world.class.js";
import { ScrapOverseer } from
  "../classes/entities/enemies/scrap-overseer.class.js";

assertBossDefinition();
assertProductionBossSequence();
assertBossCompletionGate();
assertBossCheckpointRestore();

console.log("TUTORIAL-015: Bosswelle, Abschluss-Sperre und Wiederherstellung bestanden.");

/** Verifies the unique tutorial boss and its dependency on the combat wave. */
function assertBossDefinition() {
  const level = createTutorialLevel();
  const bosses = level.enemies.filter(({ isBoss }) => isBoss);
  const bossZone = level.combatZones.at(-1);
  assert.equal(bosses.length, 1);
  assert.ok(bosses[0] instanceof ScrapOverseer);
  assert.equal(bosses[0].id, TUTORIAL_BOSS_ID);
  assert.equal(bosses[0].maximumHealth, 108);
  assert.equal(bossZone.id, TUTORIAL_BOSS_ZONE_ID);
  assert.equal(bossZone.triggerZoneId, TUTORIAL_COMBAT_ZONE_ID);
  assert.deepEqual(bossZone.enemyIds, [TUTORIAL_BOSS_ID]);
}

/** Verifies that finishing the regular wave automatically starts the boss. */
function assertProductionBossSequence() {
  const world = createWorld();
  assert.deepEqual(activeEnemyIds(world), ["tutorial-practice-target"]);
  defeatEnemies(world, () => true);
  world.update(0.016);
  world.update(0.6);
  assert.equal(zoneState(world, TUTORIAL_COMBAT_ZONE_ID), "active");
  assert.equal(activeEnemyIds(world).length, 3);
  defeatEnemies(world, ({ id }) => id.startsWith("tutorial-combat-"));
  world.update(0.6);
  world.update(0.016);
  assertActiveBoss(world);
}

/** Verifies that only the exact real boss defeat can complete the tutorial. */
function assertBossCompletionGate() {
  const game = createGameFixture();
  const director = initializeTutorialDirector(game);
  const combatTracker = initializeTutorialCombatTracker(game, director);
  const bossTracker = initializeTutorialBossTracker(game, director);
  game.emitState(GAME_STATES.PLAYING, "tutorial");
  advanceBeforeCombat(director);
  game.emitGameplay(GAMEPLAY_EVENTS.WAVE_COMPLETE, {
    id: TUTORIAL_COMBAT_ZONE_ID,
  });
  assert.equal(director.getSnapshot().stepId, "boss");
  assertRejectedBossEvidence(game, director);
  game.emitGameplay(GAMEPLAY_EVENTS.ENEMY_DEFEATED,
    { id: TUTORIAL_BOSS_ID, isBoss: true });
  assert.equal(director.getSnapshot().status, "completed");
  combatTracker.destroy();
  bossTracker.destroy();
  director.destroy();
}

/** Verifies that a boss checkpoint recreates only the final encounter. */
function assertBossCheckpointRestore() {
  const world = createWorld();
  assert.equal(world.waveManager.restoreZone(TUTORIAL_BOSS_ZONE_ID, world), true);
  world.update(0.016);
  assert.equal(zoneState(world, TUTORIAL_COMBAT_ZONE_ID), "completed");
  assert.equal(zoneState(world, TUTORIAL_BOSS_ZONE_ID), "active");
  assert.deepEqual(activeEnemyIds(world), [TUTORIAL_BOSS_ID]);
}

/** Checks the active entity and shared boss presentation. */
function assertActiveBoss(world) {
  assert.equal(zoneState(world, TUTORIAL_COMBAT_ZONE_ID), "completed");
  assert.equal(zoneState(world, TUTORIAL_BOSS_ZONE_ID), "active");
  assert.deepEqual(activeEnemyIds(world), [TUTORIAL_BOSS_ID]);
  const boss = world.getEntities(WORLD_ENTITY_GROUPS.ENEMIES)[0];
  const snapshot = world.bossFight.getSnapshot();
  assert.equal(boss.isActive, true);
  assert.equal(snapshot.name, "Schrott-Aufseher");
  assert.equal(snapshot.isVisible, true);
}

/** Rejects lookalike, wrongly typed, and unrelated defeat events. */
function assertRejectedBossEvidence(game, director) {
  game.emitGameplay(GAMEPLAY_EVENTS.ENEMY_DEFEATED,
    { id: "other-boss", isBoss: true });
  game.emitGameplay(GAMEPLAY_EVENTS.ENEMY_DEFEATED,
    { id: TUTORIAL_BOSS_ID, isBoss: false });
  game.emitGameplay(GAMEPLAY_EVENTS.WAVE_COMPLETE,
    { id: TUTORIAL_BOSS_ZONE_ID });
  assert.equal(director.getSnapshot().stepId, "boss");
  assert.equal(director.getSnapshot().status, "active");
}

/** Creates and initializes one fresh production tutorial world. */
function createWorld() {
  const world = new World(
    {}, GAME_CONFIG, createInput(), createTutorialLevel(), new GameplayEventHub(),
  );
  world.initialize();
  Object.assign(world.character, { x: 500, y: 35 });
  return world;
}

/** Defeats matching active enemies through the production hit reporter. */
function defeatEnemies(world, predicate) {
  world.getEntities(WORLD_ENTITY_GROUPS.ENEMIES).filter(predicate)
    .forEach((enemy) => world.eventReporter.damageEnemy(enemy, {
      amount: 999, direction: 1, source: "boltThrower",
    }));
}

/** Returns active enemy identities in insertion order. */
function activeEnemyIds(world) {
  return world.getEntities(WORLD_ENTITY_GROUPS.ENEMIES).map(({ id }) => id);
}

/** Returns a combat zone's public lifecycle state. */
function zoneState(world, zoneId) {
  return world.waveManager.getZoneSnapshot(zoneId).state;
}

/** Completes every lesson before the regular combat wave. */
function advanceBeforeCombat(director) {
  ["movement", "resources", "shortJump", "chargedJump", "wallRebound",
    "platformMechanics", "weaponPickup", "practiceTarget"]
    .forEach((stepId) => director.completeStep(stepId));
}

/** Creates neutral production input for deterministic simulation. */
function createInput() {
  return Object.freeze({
    consumePress: () => false, left: false, right: false, down: false,
    jump: false, attack: false, weaponSwitch: false,
  });
}

/** Creates observable state and gameplay channels for both trackers. */
function createGameFixture() {
  const stateListeners = new Set();
  const gameplayListeners = new Set();
  return {
    state: GAME_STATES.HOME, levelId: "main",
    onStateChange: (listener) => register(stateListeners, listener),
    onGameplayEvent: (listener) => register(gameplayListeners, listener),
    emitState(state, levelId) {
      Object.assign(this, { state, levelId });
      stateListeners.forEach((listener) => listener(state));
    },
    emitGameplay(type, detail = {}) {
      const event = Object.freeze({ type, detail: Object.freeze(detail) });
      gameplayListeners.forEach((listener) => listener(event));
    },
  };
}

/** Registers a fixture observer and returns its unsubscribe command. */
function register(listeners, listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
