import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { GAME_CONFIG } from "../js/config/game-config.js";
import { createLevelOne } from "../js/levels/level-01.js";
import {
  GameplayEventHub,
  GAMEPLAY_EVENTS,
} from "../classes/core/gameplay-event-hub.class.js";
import { RunStats } from "../classes/systems/run-stats.class.js";
import { WeaponSystem } from "../classes/systems/weapon-system.class.js";
import { readAppMarkup } from "./helpers/read-app-markup.mjs";

const INTRO_PLATFORM_ID =
  "scrapyard-machine-graveyard-schrott-zickzack-3-1";
const SUPPORT_PLATFORM_ID =
  "scrapyard-machine-graveyard-schrott-zickzack-3-5";

const level = createLevelOne(GAME_CONFIG.enemies);
assertLevelOrder(level);
await assertInterfaceStartsLocked();
assertCombatInputUnlocksOnce(level);

console.log("FB-006: Sprung-Einstieg vor Kampfeinführung bestanden.");

function assertLevelOrder(levelData) {
  const pickup = levelData.collectables.find(({ type }) => type === "weapon");
  const supportGear = findById(levelData.collectables, "scrapyard-gear-02");
  const crawler = findById(levelData.enemies, "scrapyard-crawler-01");
  const firstZone = levelData.combatZones[0];
  assert.equal(pickup.anchorPlatformId, INTRO_PLATFORM_ID);
  assert.equal(supportGear.anchorPlatformId, SUPPORT_PLATFORM_ID);
  assert.ok(levelData.playerStart.y - pickup.y > 1_000);
  assert.ok(crawler.y < pickup.y);
  assert.ok(firstZone.enemyIds.includes(crawler.id));
  assert.ok(firstZone.y + firstZone.height < pickup.y);
}

async function assertInterfaceStartsLocked() {
  const [markup, hudCss, touchCss] = await Promise.all([
    readAppMarkup(),
    fs.readFile("styles/hud.css", "utf8"),
    fs.readFile("styles/touch-controls.css", "utf8"),
  ]);
  assert.match(markup, /data-game-hud[\s\S]*?data-combat-locked="true"/);
  assert.equal((markup.match(/data-hud-combat/g) ?? []).length, 2);
  assert.equal((markup.match(/data-combat-control/g) ?? []).length, 2);
  assert.match(hudCss, /data-combat-locked="true"/);
  assert.match(touchCss, /\.touch-control\[hidden\]/);
}

function assertCombatInputUnlocksOnce(levelData) {
  const runtime = createCombatRuntime(levelData);
  assertCombatStartsLocked(runtime);
  unlockCombat(runtime);
  assert.equal(runtime.weapons.getCurrentWeapon().isCombatUnlocked, true);
  assert.equal(runtime.weapons.update(0, runtime.character).weaponId, "boltThrower");
  assert.equal(runtime.character.attackStarts, 1);
  runtime.weapons.reset();
  assert.equal(runtime.weapons.getCurrentWeapon().isCombatUnlocked, false);
}

function createCombatRuntime(levelData) {
  const pressed = new Set(["attack", "weaponSwitch"]);
  const input = createInput(pressed);
  const events = new GameplayEventHub();
  const stats = new RunStats(GAME_CONFIG.hud, levelData.playerStart.y);
  const weapons = new WeaponSystem(GAME_CONFIG.weapons, input, stats, events);
  const character = createCharacter();
  return { pressed, events, weapons, character };
}

function createInput(pressed) {
  return {
    consumePress(action) {
      const wasPressed = pressed.has(action);
      pressed.delete(action);
      return wasPressed;
    },
  };
}

function assertCombatStartsLocked(runtime) {
  assert.equal(runtime.weapons.update(0, runtime.character), null);
  assert.deepEqual([...runtime.pressed], []);
  assert.equal(runtime.character.attackStarts, 0);
}

function unlockCombat(runtime) {
  runtime.events.emit(GAMEPLAY_EVENTS.PICKUP, {
    type: "weapon", weaponId: "boltThrower", amount: 1,
  });
  runtime.pressed.add("attack");
}

function findById(collection, id) {
  return collection.find((item) => item.id === id);
}

function createCharacter() {
  return {
    x: 0, y: 0, width: 64, height: 64,
    facingDirection: 1,
    canAttack: true,
    attackStarts: 0,
    startAttack() { this.attackStarts += 1; },
  };
}
