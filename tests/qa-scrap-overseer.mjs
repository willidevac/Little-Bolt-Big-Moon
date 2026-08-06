import assert from "node:assert/strict";
import { GAME_CONFIG } from "../js/config/game-config.js";
import { ScrapOverseer } from
  "../classes/entities/enemies/scrap-overseer.class.js";
import { BossProjectile } from
  "../classes/entities/weapons/boss-projectile.class.js";

assertBossContract();
assertTwoPhaseVolleys();
assertVisibleTelegraph();

console.log("BOSS-006: Schrott-Aufseher mit Warnung und zwei Phasen bestanden.");

/** Verifies the independent tutorial boss identity and HUD snapshot contract. */
function assertBossContract() {
  const boss = createBoss();
  assert.equal(boss.type, "scrapOverseer");
  assert.equal(boss.bossName, "Schrott-Aufseher");
  assert.equal(boss.isBoss, true);
  assert.equal(boss.isFinalBoss, true);
  assert.equal(boss.maximumHealth, 108);
  boss.update(0.1, createWorld());
  assert.equal(boss.getBossSnapshot().isActive, true);
}

/** Verifies one safe phase-one shot and a three-shot phase-two spread. */
function assertTwoPhaseVolleys() {
  const boss = createBoss();
  const world = createWorld();
  const firstVolley = collectNextVolley(boss, world);
  assert.equal(firstVolley.length, 1);
  assertBoltEvents(firstVolley);
  assert.equal(new BossProjectile(
    firstVolley[0], GAME_CONFIG.projectiles.boss,
  ).kind, "overseerBolt");
  boss.receivePlayerHit({ amount: 54, source: "boltThrower" });
  assert.equal(boss.phase, 2);
  const secondVolley = collectNextVolley(boss, world);
  assert.equal(secondVolley.length, 3);
  assertBoltEvents(secondVolley);
  assert.deepEqual(boss.takeAttackEvents(), []);
}

/** Verifies the shot target is locked and both warning shapes are rendered. */
function assertVisibleTelegraph() {
  const boss = createBoss();
  const world = createWorld();
  runUntil(() => boss.getAttackTelegraph(), () => boss.update(0.1, world));
  const target = boss.getAttackTelegraph().target;
  world.character.x -= 300;
  assert.deepEqual(boss.getAttackTelegraph().target, target);
  const context = createContext();
  boss.draw(context);
  assert.deepEqual({ lines: context.lines, arcs: context.arcs }, {
    lines: 1, arcs: 1,
  });
  boss.receivePlayerHit({ amount: boss.health, source: "boltThrower" });
  assert.equal(boss.getAttackTelegraph(), null);
}

/** Collects the next complete volley within a safe deterministic time limit. */
function collectNextVolley(boss, world) {
  let events = [];
  runUntil(() => events.length > 0, () => {
    boss.update(0.1, world);
    events = [...events, ...boss.takeAttackEvents()];
  });
  return events;
}

/** Verifies the neutral tutorial projectile event contract. */
function assertBoltEvents(events) {
  events.forEach((event) => {
    assert.equal(event.kind, "overseerBolt");
    assert.equal(event.source, "tutorial-scrap-overseer");
    assert.equal(event.damage, 8);
    assert.ok(Math.hypot(event.direction.x, event.direction.y) > 0.99);
    assert.ok(Object.isFrozen(event));
  });
}

/** Runs one action until its condition succeeds or the test limit is reached. */
function runUntil(condition, action) {
  for (let step = 0; step < 100 && !condition(); step += 1) action();
  assert.equal(Boolean(condition()), true);
}

/** Creates the tutorial boss with the production configuration. */
function createBoss() {
  return new ScrapOverseer({
    id: "tutorial-scrap-overseer",
    x: 500, y: 20,
    patrolMinX: 220, patrolMaxX: 1120,
    startDirection: 1,
  }, GAME_CONFIG.enemies.scrapOverseer);
}

/** Creates the minimal world contract required for flight simulation. */
function createWorld() {
  return {
    character: { x: 850, y: 60, width: 56, height: 64 },
    config: { physics: GAME_CONFIG.physics },
  };
}

/** Creates a canvas spy for both telegraph shapes and placeholder drawing. */
function createContext() {
  return {
    lines: 0, arcs: 0,
    save() {}, restore() {}, setLineDash() {}, beginPath() {}, moveTo() {},
    lineTo() { this.lines += 1; },
    arc() { this.arcs += 1; },
    stroke() {}, translate() {}, scale() {}, fillRect() {}, strokeRect() {},
  };
}
