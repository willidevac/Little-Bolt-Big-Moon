import assert from "node:assert/strict";
import { EnemyCombatState } from
  "../classes/systems/enemy-combat-state.class.js";

const ANIMATIONS = Object.freeze({
  attack: Object.freeze({ frameCount: 2, frameDurationSeconds: 0.1 }),
  hurt: Object.freeze({ frameCount: 2, frameDurationSeconds: 0.1 }),
  dead: Object.freeze({ frameCount: 3, frameDurationSeconds: 0.1 }),
});
const CONFIG = Object.freeze({
  maximumHealth: 10,
  contactDamage: 2,
  attackCooldownSeconds: 0.5,
});

assertInitialState();
assertAttackLifecycle();
assertDamageLifecycle();
assertValidation();

console.log("CLEAN-002: Gegnerkampf ist getrennt und vollstaendig geprueft.");

function createState() {
  return new EnemyCombatState(CONFIG, ANIMATIONS, "attack");
}

function assertInitialState() {
  const state = createState();
  assert.equal(state.health, 10);
  assert.equal(state.maximumHealth, 10);
  assert.equal(state.canAttack, true);
  assert.equal(state.isDead, false);
  assert.equal(state.isReadyForRemoval, false);
}

function assertAttackLifecycle() {
  const state = createState();
  assert.equal(state.startAttack("attack", ANIMATIONS.attack), true);
  assert.equal(state.startAttack("attack", ANIMATIONS.attack), false);
  assert.equal(state.update(0.1), "attack");
  assert.equal(state.attackSecondsRemaining, 0.1);
  state.update(0.5);
  assert.equal(state.canAttack, true);
}

function assertDamageLifecycle() {
  const state = createState();
  assert.equal(state.receiveHit({ amount: 3 }), "hurt");
  assert.equal(state.health, 7);
  assert.equal(state.update(0.1), "hurt");
  assert.deepEqual(state.createContactHit("drone", -1), {
    amount: 2, direction: -1, source: "drone",
  });
  assertDeathLifecycle(state);
}

function assertDeathLifecycle(state) {
  assert.equal(state.receiveHit({ amount: 7 }), "dead");
  assert.equal(state.isDead, true);
  assert.equal(state.receiveHit({ amount: 1 }), null);
  assert.equal(state.update(0.31), "dead");
  assert.equal(state.isReadyForRemoval, true);
}

function assertValidation() {
  assert.throws(() => new EnemyCombatState({}, ANIMATIONS, "attack"), TypeError);
  assert.throws(() => new EnemyCombatState(CONFIG, {}, "attack"), RangeError);
  assert.throws(() => createState().receiveHit({ amount: 0 }), TypeError);
  assert.throws(() => createState().setAttackCooldown(-1), TypeError);
  assert.throws(() => createState().createContactHit("", 1), TypeError);
}
