import assert from "node:assert/strict";
import { GAME_CONFIG } from "../js/config/game-config.js";
import { createTutorialLevel } from "../js/levels/tutorial-level.js";
import { GAME_STATES } from "../classes/core/game-state-machine.class.js";
import { GAMEPLAY_EVENTS, GameplayEventHub } from
  "../classes/core/gameplay-event-hub.class.js";
import { World, WORLD_ENTITY_GROUPS } from "../classes/core/world.class.js";
import { ScrapCrawler } from
  "../classes/entities/enemies/scrap-crawler.class.js";
import { RunStats } from "../classes/systems/run-stats.class.js";
import { WeaponSystem } from "../classes/systems/weapon-system.class.js";
import { initializeTutorialDirector } from
  "../js/factories/tutorial-director.js";
import { initializeTutorialCombatBasicsTracker } from
  "../js/factories/tutorial-combat-basics-tracker.js";

const level = createTutorialLevel();

assertWeaponPickup();
assertPassivePracticeTarget();
assertProductionHitFlow();
assertLessonProgression();

console.log("TUTORIAL-007: Waffenaufnahme und Übungsziel bestanden.");

/** Verifies a grounded production pickup before the practice target. */
function assertWeaponPickup() {
  const pickup = level.collectables[0];
  const target = level.enemies[0];
  assert.equal(pickup.weaponId, "boltThrower");
  assert.equal(pickup.anchorPlatformId, "tutorial-goal");
  assert.equal(pickup.y + pickup.height, pickup.anchorPlatform.y);
  assert.ok(pickup.x + pickup.width < target.x);
}

/** Verifies the real crawler target is visible, hittable, and harmless. */
function assertPassivePracticeTarget() {
  const target = level.enemies[0];
  assert.ok(target instanceof ScrapCrawler);
  assert.equal(target.id, "tutorial-practice-target");
  assert.equal(target.isPassive, true);
  assert.equal(target.attack({ x: target.x, width: 56 }), null);
  assert.equal(target.maximumHealth, GAME_CONFIG.weapons.definitions.boltThrower.damage);
}

/** Verifies pickup, bolt flight, collision, damage, and semantic hit reporting. */
function assertProductionHitFlow() {
  const input = createInput();
  const events = new GameplayEventHub();
  const stats = new RunStats(GAME_CONFIG.hud, level.playerStart.y);
  const weapons = new WeaponSystem(GAME_CONFIG.weapons, input, stats, events);
  const world = new World({}, GAME_CONFIG, input, level, events);
  const targetHits = collectTargetHits(events);
  world.initialize();
  collectWeapon(world);
  assert.equal(weapons.getCurrentWeapon().id, "boltThrower");
  fireAtTarget(world, weapons);
  for (let frame = 0; frame < 30 && targetHits.length === 0; frame += 1) {
    world.update(0.016);
  }
  assert.equal(targetHits.length, 1);
  assert.equal(targetHits[0].source, "boltThrower");
}

/** Collects real hit details for the configured target. */
function collectTargetHits(events) {
  const hits = [];
  events.on((event) => {
    const isHit = [GAMEPLAY_EVENTS.ENEMY_HIT, GAMEPLAY_EVENTS.ENEMY_DEFEATED]
      .includes(event.type);
    if (isHit && event.detail.id === "tutorial-practice-target") {
      hits.push(event.detail);
    }
  });
  return hits;
}

/** Moves Byte onto the regular pickup and resolves its collision. */
function collectWeapon(world) {
  const pickup = world.getEntities(WORLD_ENTITY_GROUPS.COLLECTABLES)[0];
  Object.assign(world.character, { x: pickup.x, y: pickup.y });
  world.update(0);
}

/** Fires one regular bolt from a safe position toward the target. */
function fireAtTarget(world, weapons) {
  const target = world.getEntities(WORLD_ENTITY_GROUPS.ENEMIES)[0];
  const character = world.character;
  Object.assign(character, {
    x: target.x - character.width - 100,
    y: target.y,
    facingDirection: 1,
  });
  const attack = weapons.attack(character);
  assert.equal(attack.projectileKind, "bolt");
  world.handlePlayerAttack(attack);
}

/** Verifies strict pickup and projectile-hit gating in lesson order. */
function assertLessonProgression() {
  const game = createGameFixture();
  const director = initializeTutorialDirector(game);
  const tracker = initializeTutorialCombatBasicsTracker(game, director);
  game.emitState(GAME_STATES.PLAYING, "tutorial");
  advanceToWeaponStep(director);
  game.emitGameplay(GAMEPLAY_EVENTS.PICKUP, createPickup("repairWrench"));
  assert.equal(director.getSnapshot().stepId, "weaponPickup");
  game.emitGameplay(GAMEPLAY_EVENTS.PICKUP, createPickup("boltThrower"));
  assert.equal(director.getSnapshot().stepId, "practiceTarget");
  assertRejectedHits(game, director);
  game.emitGameplay(GAMEPLAY_EVENTS.ENEMY_DEFEATED, createTargetHit());
  assert.equal(director.getSnapshot().stepId, "combat");
  tracker.destroy();
  director.destroy();
}

/** Completes all lessons owned by earlier tutorial tasks. */
function advanceToWeaponStep(director) {
  ["movement", "shortJump", "chargedJump", "wallRebound", "platformMechanics"]
    .forEach((step) => director.completeStep(step));
}

/** Verifies that unrelated, melee, and wrong-target hits are ignored. */
function assertRejectedHits(game, director) {
  game.emitGameplay(GAMEPLAY_EVENTS.ENEMY_HIT, createTargetHit("repairWrench"));
  game.emitGameplay(GAMEPLAY_EVENTS.ENEMY_HIT, {
    ...createTargetHit(), id: "other-target",
  });
  game.emitGameplay(GAMEPLAY_EVENTS.ENEMY_HIT, createTargetHit());
  assert.equal(director.getSnapshot().stepId, "practiceTarget");
}

/** Creates one weapon pickup event detail. */
function createPickup(weaponId) {
  return { type: "weapon", weaponId, amount: 1 };
}

/** Creates one projectile hit event detail. */
function createTargetHit(source = "boltThrower") {
  return { id: "tutorial-practice-target", source };
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
