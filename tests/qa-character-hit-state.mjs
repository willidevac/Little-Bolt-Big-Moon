import assert from "node:assert/strict";
import { Character } from "../classes/entities/character.class.js";
import { CharacterHitState } from
  "../classes/systems/character-hit-state.class.js";

const COMBAT_CONFIG = Object.freeze({
  hurtStateSeconds: 0.25,
  invulnerabilitySeconds: 1,
  knockbackHorizontalPixelsPerSecond: 420,
  knockbackVerticalPixelsPerSecond: 460,
});

assertManualHurtFlow();
assertTimedHitFlow();
assertInvulnerabilityAndDeath();
assertCharacterFacade();
assertValidation();

console.log("CLEAN-005: Bytes Trefferzustand ist getrennt und geprüft.");

function assertManualHurtFlow() {
  const state = new CharacterHitState();
  assert.equal(state.isHurt, false);
  assert.equal(state.isDead, false);
  assert.equal(state.enterHurt(), true);
  assert.equal(state.enterHurt(), false);
  assert.equal(state.leaveHurt(), true);
  assert.equal(state.leaveHurt(), false);
}

function assertTimedHitFlow() {
  const state = new CharacterHitState();
  assert.equal(state.receiveHit(0.2, 0.5), true);
  assert.equal(state.receiveHit(0.2, 0.5), false);
  assert.equal(state.isHurt, true);
  state.update(0.2);
  assert.equal(state.isHurt, false);
  assert.equal(state.isInvulnerable, true);
  state.update(0.31);
  assert.equal(state.isInvulnerable, false);
}

function assertInvulnerabilityAndDeath() {
  const state = new CharacterHitState();
  state.setInvulnerability(Infinity);
  state.update(10);
  assert.equal(state.invulnerabilitySecondsRemaining, Infinity);
  assert.equal(state.die(), true);
  assert.equal(state.die(), false);
  assert.equal(state.isDead, true);
  assert.equal(state.isInvulnerable, false);
}

function assertCharacterFacade() {
  const character = new Character();
  character.setOnGround(true);
  assert.equal(character.receiveHit(-1, COMBAT_CONFIG), true);
  assert.equal(character.isHurt, true);
  assert.equal(character.isInvulnerable, true);
  assert.equal(character.velocityX, -420);
  assert.equal(character.velocityY, -460);
  assert.equal(character.receiveHit(1, COMBAT_CONFIG), false);
  assert.equal(character.die(), true);
  assert.equal(character.isDead, true);
}

function assertValidation() {
  const state = new CharacterHitState();
  assert.throws(() => state.receiveHit(0, 1), TypeError);
  assert.throws(() => state.receiveHit(1, 0), TypeError);
  assert.throws(() => state.setInvulnerability(-1), TypeError);
  assert.throws(() => state.setInvulnerability(Number.NaN), TypeError);
}
