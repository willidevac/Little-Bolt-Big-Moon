import assert from "node:assert/strict";
import { GAME_CONFIG } from "../js/config/game-config.js";
import { createTutorialLevel } from "../js/levels/tutorial-level.js";
import { GAME_STATES } from "../classes/core/game-state-machine.class.js";
import {
  GameplayEventHub,
  GAMEPLAY_EVENTS,
} from "../classes/core/gameplay-event-hub.class.js";
import { WorldEventReporter } from
  "../classes/systems/world-event-reporter.class.js";
import { World } from "../classes/core/world.class.js";
import { TrapPlatform } from "../classes/environment/trap-platform.class.js";
import { SpriteFallingPlatform } from
  "../classes/environment/sprite-falling-platform.class.js";
import { SpringPlatform } from
  "../classes/environment/spring-platform.class.js";
import { initializeTutorialDirector } from
  "../js/factories/tutorial-director.js";
import { initializeTutorialMechanicsTracker } from
  "../js/factories/tutorial-mechanics-tracker.js";

const level = createTutorialLevel();

assertLevelMechanics();
assertWorldActivationEvents();
assertWallReboundEvent();
assertLessonProgression();

console.log("TUTORIAL-006: Wandabprall und drei Plattformmechaniken bestanden.");

/** Verifies the safe ordered reuse of all three production platform classes. */
function assertLevelMechanics() {
  const platforms = level.platforms.filter(({ mechanic }) => mechanic);
  assert.deepEqual(platforms.map(({ mechanic }) => mechanic), [
    "spring", "falling", "trap",
  ]);
  assert.ok(platforms[0] instanceof SpringPlatform);
  assert.ok(platforms[1] instanceof SpriteFallingPlatform);
  assert.ok(platforms[2] instanceof TrapPlatform);
  assert.equal(platforms[0].bounceDirection, "left");
  assert.equal(platforms[0].springTargetId, platforms[1].id);
  assert.ok(platforms[1].warningDelaySeconds >= 1);
  assert.ok(platforms[2].landingGraceSeconds >= 0.85);
}

/** Verifies that real character landings publish mechanic activations. */
function assertWorldActivationEvents() {
  const events = new GameplayEventHub();
  const activations = [];
  events.on((event) => {
    if (event.type === GAMEPLAY_EVENTS.PLATFORM_ACTIVATED) {
      activations.push(event.detail.mechanic);
    }
  });
  const world = new World({}, GAME_CONFIG, createInput(), level, events);
  world.initialize();
  level.platforms.filter(({ mechanic }) => mechanic)
    .forEach((platform) => landOn(world, platform));
  assert.deepEqual(activations, ["spring", "falling", "trap"]);
}

/** Places Byte just above a platform and advances one collision frame. */
function landOn(world, platform) {
  const character = world.character;
  const bounds = character.getCollisionBounds();
  const footOffset = bounds.y + bounds.height - character.y;
  character.x = platform.x + Math.min(40, platform.width / 4);
  character.y = platform.y - footOffset - 1;
  character.velocityX = 0;
  character.velocityY = 100;
  character.setOnGround(false);
  world.update(0.016);
}

/** Verifies one semantic wall event per newly accepted airborne impact. */
function assertWallReboundEvent() {
  const events = new GameplayEventHub();
  const rebounds = [];
  events.on((event) => {
    if (event.type === GAMEPLAY_EVENTS.PLAYER_WALL_REBOUND) rebounds.push(event);
  });
  const reporter = new WorldEventReporter(events);
  reporter.capture(createCharacter(0, 1), createBoss());
  reporter.report(createCharacter(1, -1), createBoss());
  reporter.capture(createCharacter(1, -1), createBoss());
  reporter.report(createCharacter(1, -1), createBoss());
  assert.equal(rebounds.length, 1);
  assert.deepEqual(rebounds[0].detail, { direction: -1, facingDirection: -1 });
}

/** Verifies ordered gates, deduplication, and rejection of unknown mechanics. */
function assertLessonProgression() {
  const game = createGameFixture();
  const director = initializeTutorialDirector(game);
  const tracker = initializeTutorialMechanicsTracker(game, director);
  game.emitState(GAME_STATES.PLAYING, "tutorial");
  game.emitGameplay(GAMEPLAY_EVENTS.PLAYER_WALL_REBOUND);
  ["spring", "spring", "unknown", "falling", "trap"].forEach((mechanic) => {
    game.emitGameplay(GAMEPLAY_EVENTS.PLATFORM_ACTIVATED, { mechanic });
  });
  assert.equal(director.getSnapshot().stepId, "movement");
  ["movement", "shortJump", "chargedJump"]
    .forEach((step) => director.completeStep(step));
  assert.equal(director.getSnapshot().stepId, "weaponPickup");
  tracker.destroy();
  director.destroy();
}

/** Creates the neutral input contract required by the production world. */
function createInput() {
  return Object.freeze({
    consumePress: () => false, left: false, right: false, down: false,
    jump: false, attack: false, weaponSwitch: false,
  });
}

/** Creates one minimal airborne reporter state. */
function createCharacter(wallImpactCount, direction) {
  return {
    x: 200, isOnGround: false, velocityX: direction * 900, velocityY: -400,
    facingDirection: direction, wallImpactCount,
    jumpChargePercent: 0, isChargingJump: false,
  };
}

/** Creates a stable boss reporting fixture. */
function createBoss() {
  return { isActive: false, phase: 1 };
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
