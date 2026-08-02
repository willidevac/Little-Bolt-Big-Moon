import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { GAME_CONFIG } from "../js/config/game-config.js";
import { createLevelOne } from "../js/levels/level-01.js";

const level = createLevelOne(GAME_CONFIG.enemies);
const arena = level.platforms.filter(({ id }) => id.startsWith("moon-boss-arena-"));
const floor = arena.find(({ id }) => id === "moon-boss-arena-floor");
const tacticalPlatforms = arena.filter((platform) => platform !== floor);
const BOSS_GROUND_OFFSETS = Object.freeze([
  36, 31, 32, 32, 30, 30, 36, 39, 37, 38, 31, 35, 37,
  42, 41, 38, 34, 36, 33, 39, 43, 52, 52, 49, 49, 47,
]);

assert.deepEqual([floor.x, floor.y, floor.width], [0, 792, level.width]);
assert.equal(tacticalPlatforms.length, 3);
assert.ok(arena.every(({ constructor }) => constructor.name === "Platform"));
assert.equal(level.platforms.some(({ y }) => y < 520), false);
assert.deepEqual(tacticalPlatforms.map(({ y }) => y), [680, 680, 520]);
assertBossGrounding();
assertBossTelegraphTiming();
await assertBossSourceContract();

console.log("BOSS-003: Sichere Arena und sprungfaire Bossangriffe bestanden.");

function assertBossGrounding() {
  const boss = prepareGroundedBoss();
  BOSS_GROUND_OFFSETS.forEach((gap, frame) => {
    assertGroundedFrame(boss, gap, frame);
  });
}

function prepareGroundedBoss() {
  const boss = level.enemies.find(({ isFinalBoss }) => isFinalBoss);
  const bounds = boss.getCollisionBounds();
  const collisionBottomOffset = bounds.y + bounds.height - boss.y;
  boss.y = floor.y - collisionBottomOffset;
  boss.setOnGround(true, floor);
  boss.facingDirection = 1;
  boss.imageState = "ready";
  boss.image = { naturalWidth: 1344, naturalHeight: 768 };
  return boss;
}

function assertGroundedFrame(boss, gap, frame) {
  boss.setFrameIndex(frame);
  const drawY = captureBossDrawY(boss);
  assert.equal(drawY + boss.height - gap, floor.y, `Bossframe ${frame}`);
}

function captureBossDrawY(boss) {
  const state = { offsetY: 0, stack: [], drawY: null };
  const context = {
    save: () => state.stack.push(state.offsetY),
    restore: () => { state.offsetY = state.stack.pop(); },
    translate: (_x, y) => { state.offsetY += y; },
    scale() {},
    drawImage: (...values) => { state.drawY = values[6] + state.offsetY; },
  };
  boss.draw(context);
  return state.drawY;
}

function assertBossTelegraphTiming() {
  const boss = level.enemies.find(({ isFinalBoss }) => isFinalBoss);
  const target = createTarget();
  const world = { character: target, config: GAME_CONFIG };
  boss.setOnGround(true, floor);
  assertInitialPursuit(boss, world);
  assertShockwaveRelease(boss, world);
  assertBossPursuit(boss, target, world);
  assertLockedMoonBolt(boss, target, world);
}

function assertInitialPursuit(boss, world) {
  const startX = boss.x;
  boss.update(0.01, world);
  runUpdates(boss, world, 9, 0.1);
  assert.ok(boss.x < startX, "Der Boss muss Byte vor dem ersten Angriff jagen.");
  assert.deepEqual(boss.takeAttackEvents(), []);
  boss.update(0.1, world);
}

function assertShockwaveRelease(boss, world) {
  boss.update(0.79, world);
  assert.deepEqual(boss.takeAttackEvents(), []);
  boss.update(0.02, world);
  assert.equal(boss.takeAttackEvents().length, 2);
}

function assertBossPursuit(boss, target, world) {
  target.x = 1000;
  const leftX = boss.x;
  boss.update(0.3, world);
  assert.ok(boss.x > leftX, "Der Boss muss Byte nach rechts verfolgen.");
  target.x = 0;
  const rightX = boss.x;
  boss.update(0.3, world);
  assert.ok(boss.x < rightX, "Der Boss muss Byte nach links verfolgen.");
  boss.update(0.8, world);
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

function runUpdates(boss, world, count, deltaTimeSeconds) {
  for (let index = 0; index < count; index += 1) {
    boss.update(deltaTimeSeconds, world);
  }
}

async function assertBossSourceContract() {
  const source = await fs.readFile(
    "classes/entities/enemies/moon-warden.class.js", "utf8",
  );
  assert.match(source, /#drawShockwaveWarning/);
  assert.match(source, /#drawMoonBoltWarning/);
  assert.match(source, /recoverySeconds/);
  assert.match(source, /#pursueDuringRecovery/);
}
