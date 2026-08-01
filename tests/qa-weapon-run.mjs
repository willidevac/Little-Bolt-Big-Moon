import assert from "node:assert/strict";
import { GAME_CONFIG } from "../js/config/game-config.js";
import { createLevelOne } from "../js/levels/level-01.js";
import {
  GameplayEventHub,
  GAMEPLAY_EVENTS,
} from "../classes/core/gameplay-event-hub.class.js";
import { World, WORLD_ENTITY_GROUPS } from "../classes/core/world.class.js";
import { RunStats } from "../classes/systems/run-stats.class.js";
import { WeaponSystem } from "../classes/systems/weapon-system.class.js";
import { HudAnnouncement } from "../classes/ui/hud-announcement.class.js";

const input = Object.freeze({
  consumePress: () => false,
  left: false,
  right: false,
  jump: false,
  attack: false,
  weaponSwitch: false,
});
const events = new GameplayEventHub();
const level = createLevelOne(GAME_CONFIG.enemies);
const stats = new RunStats(GAME_CONFIG.hud, level.playerStart.y);
const weapons = new WeaponSystem(
  GAME_CONFIG.weapons,
  input,
  stats,
  events,
);
const changedWeapons = [];
events.on((event) => {
  if (event.type === GAMEPLAY_EVENTS.WEAPON_CHANGED) {
    changedWeapons.push(event.detail.id);
  }
});
const world = new World({}, GAME_CONFIG, input, level, events);
world.initialize();

assert.equal(weapons.getCurrentWeapon().id, "repairWrench");
assert.equal(weapons.switchWeapon().id, "repairWrench");

const pickup = world.getEntities(WORLD_ENTITY_GROUPS.COLLECTABLES)
  .find((item) => item.type === "weapon");
assert.ok(pickup);
assert.equal(pickup.frameIndex, 9);
assert.equal(pickup.getPickup().weaponId, "boltThrower");

world.character.x = pickup.x;
world.character.y = pickup.y;
world.update(0);

const collected = world.takeCollectedPickups();
assert.equal(collected.length, 1);
assert.equal(collected[0].id, pickup.id);
assert.equal(collected[0].weaponId, "boltThrower");
assert.equal(weapons.getCurrentWeapon().id, "boltThrower");
assert.equal(changedWeapons.at(-1), "boltThrower");
assert.equal(stats.ammo, 6);
assert.equal(stats.applyPickups(collected), true);
assert.equal(
  world.getEntities(WORLD_ENTITY_GROUPS.COLLECTABLES).includes(pickup),
  false,
);

world.update(0);
assert.deepEqual(world.takeCollectedPickups(), []);
assert.equal(stats.ammo, 6);
assert.equal(weapons.switchWeapon().id, "repairWrench");
assert.equal(weapons.switchWeapon().id, "boltThrower");

stats.reset(level.playerStart.y);
weapons.reset();
assert.equal(weapons.getCurrentWeapon().id, "repairWrench");
assert.equal(stats.ammo, 0);

const visibleClasses = new Set();
const feedbackElement = {
  classList: {
    add: (name) => visibleClasses.add(name),
    remove: (name) => visibleClasses.delete(name),
  },
  offsetWidth: 120,
  dataset: {},
  textContent: "",
};
const feedback = new HudAnnouncement(feedbackElement);
assert.equal(feedback.showPickup({ type: "weapon", amount: 6 }), true);
assert.equal(feedback.showPickup({ type: "gear", amount: 1 }), false);
assert.equal(feedbackElement.textContent, "Neue Waffe freigeschaltet!");
assert.equal(visibleClasses.has("is-visible"), true);
feedback.destroy();

console.log("QA-005: Waffenfund, Wechsel, HUD-Daten und Reset bestanden.");
