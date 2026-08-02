import assert from "node:assert/strict";
import { GAME_CONFIG } from "../js/config/game-config.js";
import { Character } from "../classes/entities/character.class.js";
import { BYTE_GROUND_CONTACT_OFFSET_Y } from
  "../js/config/character-visual-config.js";
import { CollisionManager } from
  "../classes/systems/collision-manager.class.js";
import { createLevelOne } from "../js/levels/level-01.js";

const level = createLevelOne(GAME_CONFIG.enemies);
const floor = level.platforms.find(({ id }) => id.endsWith("floor-000"));
const sampleCharacter = new Character();

assert.ok(floor, "Die sichere Startplattform fehlt.");
assert.equal(floor.x, 0);
assert.equal(floor.width, level.width);
assert.equal(
  getCollisionBottomOffset(sampleCharacter),
  BYTE_GROUND_CONTACT_OFFSET_Y,
);
assertEdgeLanding(floor, 0);
assertEdgeLanding(floor, level.width - 64);

console.log(
  "FB-001: Byte steht sichtbar auf einer unverfehlbaren Startplattform.",
);

function getCollisionBottomOffset(target) {
  const bounds = target.getCollisionBounds();
  return bounds.y + bounds.height - target.y;
}

function assertEdgeLanding(targetFloor, x) {
  const character = new Character();
  Object.assign(character, {
    x,
    y: targetFloor.y - BYTE_GROUND_CONTACT_OFFSET_Y + 5,
    velocityY: 100,
  });
  new CollisionManager(GAME_CONFIG.physics)
    .resolvePlatformLandings([character], [targetFloor], 0.1);
  assert.equal(character.isOnGround, true);
  assert.equal(character.y + BYTE_GROUND_CONTACT_OFFSET_Y, targetFloor.y);
}
