import assert from "node:assert/strict";
import { MoonWardenAttackController } from
  "../classes/systems/moon-warden-attack-controller.class.js";

const CONFIG = Object.freeze({
  attackReleaseSeconds: 0.8,
  shockwaveDamage: 25,
  moonBoltDamage: 18,
});
const TARGET = Object.freeze({ x: 420, y: 260 });
const ORIGIN = Object.freeze({ x: 220, y: 260 });
const BOUNDS = Object.freeze({ x: 100, y: 200, width: 144, height: 168 });

assertMeleePattern();
assertRangedPattern();
assertInterruptionAndValidation();

console.log("CLEAN-007: MoonWarden-Angriffe sind getrennt und geprüft.");

function createController() {
  return new MoonWardenAttackController("moon-warden", CONFIG);
}

function assertMeleePattern() {
  const controller = createController();
  assert.equal(controller.nextPattern, "meleeAttack");
  assert.equal(controller.begin(TARGET).pattern, "meleeAttack");
  assert.equal(controller.update(0.4, 1, BOUNDS, ORIGIN), false);
  assert.equal(controller.getPendingSnapshot().secondsRemaining, 0.4);
  assert.equal(controller.update(0.41, 1, BOUNDS, ORIGIN), true);
  const events = controller.takeEvents();
  assert.deepEqual(events.map(({ direction }) => direction.x), [-1, 1]);
  assert.ok(events.every(({ kind, damage }) => kind === "shockwave" && damage === 25));
}

function assertRangedPattern() {
  const controller = createController();
  controller.begin(TARGET);
  controller.update(0.8, 1, BOUNDS, ORIGIN);
  assert.equal(controller.begin(TARGET).pattern, "rangedAttack");
  assert.equal(controller.update(0.8, 3, BOUNDS, ORIGIN), true);
  const events = controller.takeEvents();
  assert.equal(events.length, 5);
  const bolts = events.filter(({ kind }) => kind === "moonBolt");
  assert.equal(bolts.length, 3);
  assert.ok(bolts.every(({ source, damage }) => source === "moon-warden" && damage === 18));
}

function assertInterruptionAndValidation() {
  const controller = createController();
  controller.begin(TARGET);
  controller.clear();
  assert.equal(controller.hasPendingAttack, false);
  assert.deepEqual(controller.takeEvents(), []);
  assert.throws(() => new MoonWardenAttackController("", CONFIG), TypeError);
  assert.throws(() => createController().begin({}), TypeError);
  const invalidPhase = createController();
  invalidPhase.begin(TARGET);
  assert.throws(() => invalidPhase.update(0.8, 4, BOUNDS, ORIGIN), TypeError);
}
