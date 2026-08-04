import assert from "node:assert/strict";
import { GAME_CONFIG } from "../js/config/game-config.js";
import { createLevelOne } from "../js/levels/level-01.js";
import { BossFightManager } from "../classes/systems/boss-fight-manager.class.js";
import { StatusBar } from "../classes/ui/status-bar.class.js";

const level = createLevelOne(GAME_CONFIG.enemies);
const bosses = level.enemies.filter(({ isBoss }) => isBoss);
const bossZones = level.combatZones.filter(({ id }) => {
  return id === "moon-warden-final-zone";
});

assert.equal(bosses.length, 1);
assert.equal(bossZones.length, 1);
const boss = bosses[0];
assert.equal(boss.isFinalBoss, true);
assert.equal(boss.maximumHealth, 400);
assert.deepEqual(bossZones[0].enemyIds, [boss.id]);
assert.equal(bossZones[0].unlockPlatformId, null);

const supply = level.collectables.find(({ isPreBossSupply }) => {
  return isPreBossSupply;
});
assert.ok(supply);
assert.equal(supply.type, "energy");
assert.equal(supply.amount, 35);
assert.equal(supply.y + supply.height, supply.anchorPlatform.y);
assert.ok(supply.y > 900 && supply.y < 2200);

const manager = new BossFightManager(bosses);
const activeEnemies = [boss];
const world = {
  character: { x: 560, y: 500, width: 64, height: 64 },
  getEntities: () => Object.freeze([...activeEnemies]),
};
boss.activateBoss();
manager.update(world);
const snapshot = manager.getSnapshot();
assert.equal(snapshot.name, "Mondwächter");
assert.equal(snapshot.isVisible, true);
assert.equal(snapshot.health, 400);

const attributes = new Map();
const styles = new Map();
const hud = {
  elements: {
    boss: { hidden: true }, bossName: {}, bossHealth: {}, bossPhase: {},
    bossBar: {
      style: { setProperty: (name, value) => styles.set(name, value) },
      setAttribute: (name, value) => attributes.set(name, value),
    },
  },
  setText: StatusBar.prototype.setText,
};
StatusBar.prototype.renderBoss.call(hud, snapshot);
assert.equal(hud.elements.boss.hidden, false);
assert.equal(hud.elements.bossName.textContent, "Mondwächter");
assert.equal(styles.get("--boss-health-percent"), "100%");

boss.receivePlayerHit({ amount: boss.maximumHealth });
activeEnemies.length = 0;
manager.update(world);
assert.equal(manager.takeVictory(), true);
assert.equal(manager.takeVictory(), false);

console.log("BOSS-001: Einzelarena, Vorboss-Versorgung, HUD und Endsieg bestanden.");
