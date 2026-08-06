import assert from "node:assert/strict";
import { GAME_CONFIG } from "../js/config/game-config.js";
import { createTutorialLevel } from "../js/levels/tutorial-level.js";
import { GAME_STATES } from "../classes/core/game-state-machine.class.js";
import { GameplayEventHub, GAMEPLAY_EVENTS } from
  "../classes/core/gameplay-event-hub.class.js";
import { World, WORLD_ENTITY_GROUPS } from "../classes/core/world.class.js";
import { ScrapCrawler } from
  "../classes/entities/enemies/scrap-crawler.class.js";
import { DroneGuard } from
  "../classes/entities/enemies/drone-guard.class.js";
import { initializeTutorialDirector } from
  "../js/factories/tutorial-director.js";
import { initializeTutorialCombatTracker } from
  "../js/factories/tutorial-combat-tracker.js";

const level = createTutorialLevel();

assertCombatDefinitions();
assertProductionWave();
assertCombatLesson();

console.log("TUTORIAL-008: Milde Gegnerwelle und Kampflektion bestanden.");

/** Verifies existing enemy classes, mild profiles, and exact zone references. */
function assertCombatDefinitions() {
  const [practice, crawler, drone] = level.enemies;
  assert.equal(practice.id, "tutorial-practice-target");
  assert.ok(crawler instanceof ScrapCrawler);
  assert.ok(drone instanceof DroneGuard);
  assert.deepEqual(level.combatZones[0].enemyIds, [crawler.id, drone.id]);
  assert.equal(level.combatZones[0].triggerEnemyId, practice.id);
  assert.equal(level.platforms.at(-1).width, 960);
  assert.equal(crawler.maximumHealth, 36);
  assert.equal(drone.maximumHealth, 36);
  assert.ok(crawler.speedPixelsPerSecond < GAME_CONFIG.enemies.scrapCrawler
    .speedPixelsPerSecond);
  assert.ok(drone.speedPixelsPerSecond < GAME_CONFIG.enemies.droneGuard
    .speedPixelsPerSecond);
  assertBoltLineIntersects(crawler);
  assertBoltLineIntersects(drone);
}

/** Verifies both enemies intersect the horizontal bolt line from the checkpoint. */
function assertBoltLineIntersects(enemy) {
  const projectileY = 35 + GAME_CONFIG.weapons.definitions.boltThrower.attackOffsetY;
  const bounds = enemy.getCollisionBounds();
  assert.ok(projectileY >= bounds.y && projectileY <= bounds.y + bounds.height);
}

/** Verifies defeat-triggered spawning, cleanup, and wave completion. */
function assertProductionWave() {
  const events = new GameplayEventHub();
  const completions = [];
  events.on((event) => {
    if (event.type === GAMEPLAY_EVENTS.WAVE_COMPLETE) {
      completions.push(event.detail.id);
    }
  });
  const world = new World({}, GAME_CONFIG, createInput(), level, events);
  world.initialize();
  assert.deepEqual(activeEnemyIds(world), ["tutorial-practice-target"]);
  Object.assign(world.character, { x: 1080, y: 35 });
  world.update(0.016);
  assert.deepEqual(activeEnemyIds(world), ["tutorial-practice-target"]);
  defeatPracticeTarget(world);
  world.update(0.016);
  assert.equal(
    world.waveManager.getZoneSnapshot("tutorial-combat-zone").state,
    "active",
  );
  world.update(0.6);
  assert.deepEqual(activeEnemyIds(world), [
    "tutorial-combat-crawler", "tutorial-combat-drone",
  ]);
  defeatCombatEnemies(world);
  world.update(0.6);
  assert.deepEqual(completions, ["tutorial-combat-zone"]);
}

/** Defeats the passive target that unlocks the automatic wave. */
function defeatPracticeTarget(world) {
  const target = world.getEntities(WORLD_ENTITY_GROUPS.ENEMIES)[0];
  world.eventReporter.damageEnemy(target, {
    amount: 999, direction: 1, source: "boltThrower",
  });
}

/** Returns active enemy identities in their stable insertion order. */
function activeEnemyIds(world) {
  return world.getEntities(WORLD_ENTITY_GROUPS.ENEMIES).map(({ id }) => id);
}

/** Defeats both active combat enemies through the production hit reporter. */
function defeatCombatEnemies(world) {
  world.getEntities(WORLD_ENTITY_GROUPS.ENEMIES)
    .filter(({ id }) => id.startsWith("tutorial-combat-"))
    .forEach((enemy) => world.eventReporter.damageEnemy(enemy, {
      amount: 999, direction: 1, source: "boltThrower",
    }));
}

/** Verifies that only the configured completed wave ends combat. */
function assertCombatLesson() {
  const game = createGameFixture();
  const director = initializeTutorialDirector(game);
  const tracker = initializeTutorialCombatTracker(game, director);
  game.emitState(GAME_STATES.PLAYING, "tutorial");
  game.emitGameplay(GAMEPLAY_EVENTS.WAVE_COMPLETE, { id: "other-zone" });
  game.emitGameplay(GAMEPLAY_EVENTS.WAVE_COMPLETE, {
    id: "tutorial-combat-zone",
  });
  assert.equal(director.getSnapshot().stepId, "movement");
  advanceToCombat(director);
  assert.equal(director.getSnapshot().status, "completed");
  tracker.destroy();
  director.destroy();
}

/** Completes every lesson before the combat wave. */
function advanceToCombat(director) {
  ["movement", "resources", "shortJump", "chargedJump", "wallRebound",
    "platformMechanics", "weaponPickup", "practiceTarget"]
    .forEach((step) => director.completeStep(step));
}

/** Creates neutral production input for deterministic world simulation. */
function createInput() {
  return Object.freeze({
    consumePress: () => false, left: false, right: false, down: false,
    jump: false, attack: false, weaponSwitch: false,
  });
}

/** Creates a game fixture with state and gameplay observer channels. */
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
