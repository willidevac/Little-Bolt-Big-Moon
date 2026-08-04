import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { GAME_CONFIG } from "../js/config/game-config.js";
import { createLevelOne } from "../js/levels/level-01.js";
import { BOSS_ARENA } from "../js/config/progression-route-config.js";

const level = createLevelOne(GAME_CONFIG.enemies);
const arena = level.structures.find(({ role }) => role === "boss-arena-shell");
const floors = level.platforms.filter(({ kind }) => {
  return kind === "boss-arena-floor";
});
const gate = floors.find(({ id }) => id === "moon-warden-arena-floor");
const leftFloor = floors.find(({ id }) => id.endsWith("floor-left"));
const floor = floors.find(({ id }) => id.endsWith("floor-right"));
const boss = level.enemies.find(({ isFinalBoss }) => isFinalBoss);
const bossZone = level.combatZones.find(({ id }) => {
  return id === "moon-warden-final-zone";
});
const lift = level.platforms.find(({ kind }) => kind === "boss-entrance-lift");
const BOSS_GROUND_OFFSETS = Object.freeze([
  36, 31, 32, 32, 30, 30, 36, 39, 37, 38, 31, 35, 37,
  42, 41, 38, 34, 36, 33, 39, 43, 52, 52, 49, 49, 47,
]);

assert.ok(arena);
assert.deepEqual([arena.x, arena.y, arena.width], [0, 16, level.width]);
assert.deepEqual([arena.spriteConfig.frameWidth,
  arena.spriteConfig.frameHeight], [1536, 1024]);
assert.equal(floors.length, 3);
assert.equal(leftFloor.x + leftFloor.width, gate.x);
assert.equal(gate.x + gate.width, floor.x);
assert.equal(gate.width, BOSS_ARENA.entranceWidth);
assert.equal(gate.isCollidable, false);
assert.equal(bossZone.height, BOSS_ARENA.triggerBottomY);
assert.deepEqual([lift.x, lift.y, lift.width, lift.height], [
  520, BOSS_ARENA.approachY, 240, 50,
]);
assert.ok(lift.spriteConfig.source.endsWith(
  "moon-warden-entry-lift-clean-hd.png",
));
assert.equal(boss.x >= floor.x && boss.x + boss.width <= floor.x + floor.width,
  true);
assertGateLifecycle();
assertBossGrounding();
assertBossTelegraphTiming();
await assertArenaAssets();
await assertBossSourceContract();

console.log("BOSS-003: Offener Eingang, schließendes Siegel und Bosskampf bestanden.");

function assertGateLifecycle() {
  const enemies = [];
  const world = { getEntities: () => Object.freeze([...enemies]) };
  gate.update(0.1, world);
  assert.equal(gate.isCollidable, false);
  enemies.push(boss);
  gate.update(0.1, world);
  assert.equal(gate.isCollidable, true);
  assert.ok(gate.sealProgress > 0);
}

function assertBossGrounding() {
  const boss = prepareGroundedBoss();
  BOSS_GROUND_OFFSETS.forEach((gap, frame) => {
    assertGroundedFrame(boss, gap, frame);
  });
}

function prepareGroundedBoss() {
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
  return { x: 640, y: 500, width: 64, height: 64 };
}

function runUpdates(boss, world, count, deltaTimeSeconds) {
  for (let index = 0; index < count; index += 1) {
    boss.update(deltaTimeSeconds, world);
  }
}

async function assertArenaAssets() {
  const definitions = [
    ["img/environment/moon-warden-arena-clean-hd.png", 1536, 1024],
    ["img/environment/moon-warden-entry-lift-clean-hd.png", 512, 107],
  ];
  for (const [file, width, height] of definitions) {
    const png = await fs.readFile(file);
    assert.equal(png.toString("hex", 0, 8), "89504e470d0a1a0a");
    assert.equal(png.readUInt32BE(16), width);
    assert.equal(png.readUInt32BE(20), height);
    assert.equal(png[25], 6);
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
