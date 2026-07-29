import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { GAME_CONFIG } from "../js/config/game-config.js";
import { createLevelOne } from "../js/levels/level-01.js";
import { MovingPlatform } from "../classes/environment/moving-platform.class.js";
import { FallingPlatform } from "../classes/environment/falling-platform.class.js";
import { WaveManager } from "../classes/systems/wave-manager.class.js";
import { StatusBar } from "../classes/ui/status-bar.class.js";
import {
  GAMEPLAY_EVENTS,
} from "../classes/core/gameplay-event-hub.class.js";

const BIOME_PREFIXES = Object.freeze([
  "scrapyard",
  "factory",
  "launch",
  "space",
  "moon",
]);
const level = createLevelOne(GAME_CONFIG.enemies);
const bosses = level.enemies.filter((enemy) => enemy.isBoss);
const elites = level.enemies.filter((enemy) => enemy.isElite);
const normalZones = level.combatZones.filter((zone) => {
  return !zone.id.includes("boss");
});

await assertWeaponHud();
await assertBackgroundAssets();
assertEnvironmentMotion();
assertEncounterDistribution();
assertEncounterLifecycle();
assertElitePresentation();
assertBossBalance();
assertAmmoDistribution();

console.log(
  "TRACKING: HUD, Welt, Begegnungen, Elitegegner und Bossbalance bestanden.",
);

async function assertWeaponHud() {
  const html = await fs.readFile("index.html", "utf8");
  assert.match(html, /aria-label="Ausgewählte Waffe"/);
  assert.match(html, /<dt[^>]*>Waffe wechseln<\/dt>[\s\S]*?<kbd>Q<\/kbd>/);
  assertWeaponChangeRendering();
}

function assertWeaponChangeRendering() {
  const weapon = { textContent: "" };
  const hud = {
    elements: { weapon },
    setText: StatusBar.prototype.setText,
    pickupFeedback: { show() {} },
  };
  StatusBar.prototype.handleGameplayEvent.call(hud, {
    type: GAMEPLAY_EVENTS.WEAPON_CHANGED,
    detail: { id: "boltThrower", name: "Bolzenwerfer" },
  });
  assert.equal(weapon.textContent, "Bolzenwerfer");
}

async function assertBackgroundAssets() {
  const sources = level.sections.map((section) => {
    return section.backgroundLayers[0].source;
  });
  assert.equal(new Set(sources).size, 15);
  await Promise.all(sources.map((source) => fs.access(source)));
}

function assertEnvironmentMotion() {
  const moving = countPlatforms(MovingPlatform);
  const falling = countPlatforms(FallingPlatform);
  assert.ok(moving >= 280);
  assert.ok(falling >= 240);
}

function countPlatforms(PlatformType) {
  return level.platforms.filter((platform) => {
    return platform instanceof PlatformType;
  }).length;
}

function assertEncounterDistribution() {
  assert.equal(level.enemies.length, 27);
  assert.equal(level.combatZones.length, 15);
  assert.equal(normalZones.length, 10);
  BIOME_PREFIXES.forEach(assertBiomeEncounterCount);
  assertEveryEnemyIsReferencedOnce();
  assert.ok(level.combatZones.every(isNonBlockingTrigger));
}

function assertBiomeEncounterCount(prefix) {
  const zones = level.combatZones.filter((zone) => {
    return zone.id.startsWith(prefix);
  });
  assert.equal(zones.length, 3, `${prefix} braucht drei Begegnungen.`);
}

function assertEveryEnemyIsReferencedOnce() {
  const references = level.combatZones.flatMap((zone) => zone.enemyIds);
  assert.equal(references.length, level.enemies.length);
  assert.equal(new Set(references).size, references.length);
}

function isNonBlockingTrigger(zone) {
  return typeof zone.draw !== "function" &&
    typeof zone.getCollisionBounds !== "function";
}

function assertEncounterLifecycle() {
  const activeEnemies = [];
  const world = createEncounterWorld(activeEnemies);
  const manager = new WaveManager(level.combatZones, level.enemies);
  manager.initialize(world);
  level.combatZones.forEach((zone) => {
    triggerAndCompleteZone(manager, world, zone, activeEnemies);
  });
  assert.equal(manager.takeCompletedWaveIds().length, 15);
}

function createEncounterWorld(activeEnemies) {
  return {
    character: { x: 0, y: 0, width: 64, height: 96 },
    gameplayEvents: { emit() {} },
    addEntity(_group, enemy) { activeEnemies.push(enemy); },
    getEntities() { return Object.freeze([...activeEnemies]); },
  };
}

function triggerAndCompleteZone(manager, world, zone, activeEnemies) {
  world.character.x = zone.x;
  world.character.y = zone.y;
  manager.update(world);
  zone.enemyIds.forEach((id) => {
    assert.ok(activeEnemies.some((enemy) => enemy.id === id));
  });
  activeEnemies.length = 0;
  manager.update(world);
}

function assertElitePresentation() {
  assert.equal(elites.length, 5);
  BIOME_PREFIXES.forEach((prefix) => {
    assert.equal(elites.filter((elite) => elite.id.startsWith(prefix)).length, 1);
  });
  const context = createDrawContext();
  elites[0].draw(context);
  assert.equal(context.shadowColor, "#ff9b32");
  assert.equal(context.shadowBlur, 14);
}

function createDrawContext() {
  const empty = () => {};
  return {
    save: empty, restore: empty, translate: empty, scale: empty,
    fillRect: empty, strokeRect: empty,
    shadowColor: "", shadowBlur: 0,
  };
}

function assertBossBalance() {
  assert.equal(bosses.length, 5);
  bosses.forEach((boss) => {
    const hits = getMixedHitCount(boss.maximumHealth);
    assert.ok(hits <= 20, `${boss.bossName} braucht zu viele Treffer.`);
  });
}

function getMixedHitCount(health) {
  const weapons = GAME_CONFIG.weapons.definitions;
  const boltHits = Math.min(
    GAME_CONFIG.hud.maximumAmmo,
    Math.ceil(health / weapons.boltThrower.damage),
  );
  const remaining = Math.max(0, health - boltHits * weapons.boltThrower.damage);
  return boltHits + Math.ceil(remaining / weapons.repairWrench.damage);
}

function assertAmmoDistribution() {
  const ammo = level.collectables.filter((item) => item.type === "ammo");
  BIOME_PREFIXES.forEach((prefix) => {
    assert.ok(ammo.some((item) => item.id.startsWith(prefix)));
  });
  const bossAmmo = ammo.filter((item) => item.id.includes("boss-ammo"));
  assert.equal(bossAmmo.length, bosses.length);
  assert.ok(bossAmmo.every(isFullMagazine));
}

function isFullMagazine(item) {
  return item.amount === GAME_CONFIG.hud.maximumAmmo;
}
