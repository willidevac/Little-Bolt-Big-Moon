import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { GAME_CONFIG } from "../js/config/game-config.js";
import { createLevelOne } from "../js/levels/level-01.js";

const level = createLevelOne(GAME_CONFIG.enemies);
const arena = level.platforms.filter(({ id }) => id.startsWith("moon-boss-arena-"));
const floor = arena.find(({ id }) => id === "moon-boss-arena-floor");
const tacticalPlatforms = arena.filter((platform) => platform !== floor);

assert.deepEqual([floor.x, floor.y, floor.width], [0, 792, level.width]);
assert.equal(tacticalPlatforms.length, 3);
assert.ok(arena.every(({ constructor }) => constructor.name === "Platform"));
assert.equal(level.platforms.some(({ y }) => y < 520), false);
assert.deepEqual(tacticalPlatforms.map(({ y }) => y), [680, 680, 520]);
assertBossTelegraphTiming();
await assertBossSourceContract();

console.log("BOSS-003: Sichere Arena und sprungfaire Bossangriffe bestanden.");

function assertBossTelegraphTiming() {
  const boss = level.enemies.find(({ isFinalBoss }) => isFinalBoss);
  const target = createTarget();
  const world = { character: target, config: GAME_CONFIG };
  boss.setOnGround(true, floor);
  boss.update(0.01, world);
  boss.update(0.39, world);
  assert.deepEqual(boss.takeAttackEvents(), []);
  boss.update(0.42, world);
  assert.equal(boss.takeAttackEvents().length, 2);
  assertBossRecovery(boss, world);
  assertLockedMoonBolt(boss, target, world);
}

function assertBossRecovery(boss, world) {
  const x = boss.x;
  boss.update(0.7, world);
  assert.equal(boss.x, x);
  boss.update(0.71, world);
}

function assertLockedMoonBolt(boss, target, world) {
  target.x = 1000;
  boss.update(0.79, world);
  assert.deepEqual(boss.takeAttackEvents(), []);
  boss.update(0.02, world);
  const bolts = boss.takeAttackEvents();
  assert.equal(bolts.length, 1);
  assert.equal(bolts[0].kind, "moonBolt");
  assert.ok(bolts[0].direction.x < 0);
}

function createTarget() {
  return { x: 416, y: 728, width: 64, height: 64 };
}

async function assertBossSourceContract() {
  const source = await fs.readFile(
    "classes/entities/enemies/moon-warden.class.js", "utf8",
  );
  assert.match(source, /#drawShockwaveWarning/);
  assert.match(source, /#drawMoonBoltWarning/);
  assert.match(source, /recoverySeconds/);
}
