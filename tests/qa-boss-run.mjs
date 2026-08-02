import assert from "node:assert/strict";
import { GAME_CONFIG } from "../js/config/game-config.js";
import { createLevelOne } from "../js/levels/level-01.js";
import { WaveManager } from "../classes/systems/wave-manager.class.js";
import { BossFightManager } from "../classes/systems/boss-fight-manager.class.js";
import { StatusBar } from "../classes/ui/status-bar.class.js";

const level = createLevelOne(GAME_CONFIG.enemies);
const bosses = level.enemies.filter((enemy) => enemy.isBoss);
const bossZones = level.combatZones.filter((zone) => {
  return zone.id.endsWith("biome-boss") || zone.id === "moon-final-boss";
});

assert.equal(bosses.length, 5);
assert.equal(bossZones.length, 5);
assert.equal(bosses.filter((boss) => boss.isFinalBoss).length, 1);
assert.ok(bossZones.every((zone) => zone.x === 0 && zone.width === level.width));
assert.deepEqual(
  bosses.map((boss) => boss.maximumHealth),
  [110, 150, 160, 200, 400],
);

const expectedSupplies = [
  "scrapyard-boss-energy",
  "pressworks-boss-energy",
  "launch-tower-boss-energy",
  "space-station-boss-energy",
  "moon-boss-energy",
];
expectedSupplies.forEach((id) => {
  const energy = level.collectables.find((item) => item.id === id);
  const support = level.platforms.find((platform) => {
    return platform.y === energy.y + energy.height &&
      energy.x < platform.x + platform.width &&
      energy.x + energy.width > platform.x;
  });
  assert.equal(energy.type, "energy");
  assert.equal(energy.amount, 25);
  assert.ok(support, `${id} braucht eine erreichbare Plattform.`);
});

const activeEnemies = [];
const world = {
  character: { x: 100, y: 119900, width: 64, height: 96 },
  gameplayEvents: { emit() {} },
  addEntity(group, enemy) {
    if (!activeEnemies.includes(enemy)) activeEnemies.push(enemy);
  },
  getEntities() {
    return Object.freeze([...activeEnemies]);
  },
};
const firstTwoBosses = bosses.slice(0, 2);
const firstTwoZones = bossZones.slice(0, 2);
const waveManager = new WaveManager(firstTwoZones, firstTwoBosses);
waveManager.initialize(world);
waveManager.update(world);
assert.equal(activeEnemies.includes(firstTwoBosses[0]), true);

world.character.y = 89900;
waveManager.update(world);
assert.equal(activeEnemies.includes(firstTwoBosses[1]), true);

const bossFight = new BossFightManager(bosses);
firstTwoBosses[0].activateBoss();
world.character.y = 119900;
bossFight.update(world);
const firstBossSnapshot = bossFight.getSnapshot();
assert.equal(firstBossSnapshot.name, "Schrottbrecher");
assert.equal(firstBossSnapshot.isVisible, true);
const bossBarAttributes = new Map();
const bossBarStyles = new Map();
const hud = {
  elements: {
    boss: { hidden: true },
    bossName: { textContent: "" },
    bossHealth: { textContent: "" },
    bossPhase: { textContent: "" },
    bossBar: {
      style: { setProperty: (name, value) => bossBarStyles.set(name, value) },
      setAttribute: (name, value) => bossBarAttributes.set(name, value),
    },
  },
  setText: StatusBar.prototype.setText,
};
StatusBar.prototype.renderBoss.call(hud, firstBossSnapshot);
assert.equal(hud.elements.boss.hidden, false);
assert.equal(hud.elements.bossName.textContent, "Schrottbrecher");
assert.equal(hud.elements.bossHealth.textContent, "110 / 110");
assert.equal(bossBarAttributes.get("aria-label"), "Lebensenergie von Schrottbrecher");
assert.equal(bossBarStyles.get("--boss-health-percent"), "100%");
world.character.y = 149000;
bossFight.update(world);
assert.equal(bossFight.getSnapshot().isVisible, false);
assert.equal(bossFight.getSnapshot().isActive, false);
firstTwoBosses[0].receivePlayerHit({ amount: firstTwoBosses[0].maximumHealth });
activeEnemies.splice(activeEnemies.indexOf(firstTwoBosses[0]), 1);
bossFight.update(world);
assert.equal(bossFight.takeVictory(), false);

const finalBoss = bosses.find((boss) => boss.isFinalBoss);
finalBoss.activateBoss();
finalBoss.receivePlayerHit({ amount: finalBoss.maximumHealth });
bossFight.update(world);
assert.equal(bossFight.takeVictory(), true);
assert.equal(bossFight.takeVictory(), false);

console.log("QA-005: Fünf Bossbereiche, Vorräte, HUD und Endsieg bestanden.");
