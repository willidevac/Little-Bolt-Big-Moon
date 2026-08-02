import assert from "node:assert/strict";
import { Character } from "../classes/entities/character.class.js";
import { CharacterMovementController } from
  "../classes/systems/character-movement-controller.class.js";
import { GAME_CONFIG } from "../js/config/game-config.js";

const config = Object.freeze({
  horizontalAccelerationPixelsPerSecondSquared: 1800,
  horizontalBrakingPixelsPerSecondSquared: 2400,
  maximumHorizontalSpeedPixelsPerSecond: 300,
});
const character = createCharacter();
const movement = new CharacterMovementController(character);

movement.updateGroundMovement(0.1, createInput(false, true), config);
assert.equal(character.velocityX, 180);
assert.equal(character.facingDirection, 1);
movement.updateGroundMovement(0.1, createInput(false, true), config);
assert.equal(character.velocityX, 300);

movement.updateGroundMovement(0.05, createInput(false, false), config);
assert.equal(character.velocityX, 180);
movement.updateGroundMovement(0.1, createInput(false, false), config);
assert.equal(character.velocityX, 0);

movement.updateFacingDirection(createInput(true, false));
assert.equal(character.facingDirection, -1);
movement.updateFacingDirection(createInput(false, false));
assert.equal(character.facingDirection, -1);

assertWorldBoundary(movement, character, -20, 0);
assertWorldBoundary(movement, character, 980, 936);
assertCharacterIntegration();

console.log("CLEAN-011: Bytes Bodenbewegung ist getrennt und geprüft.");

function createCharacter() {
  return { x: 100, width: 64, velocityX: 0, facingDirection: 1 };
}

function createInput(left, right) {
  return { left, right };
}

function assertWorldBoundary(movementController, target, startX, expectedX) {
  target.x = startX;
  target.velocityX = 200;
  movementController.keepInsideWorld(1000);
  assert.equal(target.x, expectedX);
  assert.equal(target.velocityX, 0);
}

function assertCharacterIntegration() {
  const target = new Character();
  target.setOnGround(true);
  target.update(0.1, {
    config: GAME_CONFIG,
    input: createPlayableInput(),
  });
  assert.equal(target.velocityX, 180);
  assert.equal(target.x, 18);
}

function createPlayableInput() {
  return {
    left: false, right: true, jump: false,
    attack: false, weaponSwitch: false,
    consumePress: () => false,
  };
}
