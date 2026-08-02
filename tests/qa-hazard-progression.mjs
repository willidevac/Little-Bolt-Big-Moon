import assert from "node:assert/strict";
import { GAME_CONFIG } from "../js/config/game-config.js";
import { HAZARD_CONFIGS, HAZARD_TYPES } from
  "../js/config/hazard-config.js";
import { createLevelOne } from "../js/levels/level-01.js";
import { World, WORLD_ENTITY_GROUPS } from "../classes/core/world.class.js";
import { Platform } from "../classes/environment/platform.class.js";

const level = createLevelOne(GAME_CONFIG.enemies);
assertDistribution();
assertAnchorsAndLandingSpace();
assertSafeIntroduction();
assertLearnableCycles();
assertSafeWorldPhase();

console.log("FB-007: 24 faire Fallen in drei erlernbaren Varianten bestanden.");

function assertDistribution() {
  assert.equal(level.hazards.length, 24);
  assert.deepEqual(new Set(level.hazards.map(({ type }) => type)), new Set([
    HAZARD_TYPES.SHOCK_PAD,
    HAZARD_TYPES.RETRACTABLE_SPIKES,
    HAZARD_TYPES.PULSE_GATE,
  ]));
  level.sections.forEach((section) => {
    const hazards = level.hazards.filter((hazard) => isInside(hazard, section));
    assert.ok(hazards.length >= 1 && hazards.length <= 2, section.id);
  });
  const firstPulse = level.hazards.find(({ type }) => type === HAZARD_TYPES.PULSE_GATE);
  assert.ok(firstPulse.y < 120_000);
}

function assertAnchorsAndLandingSpace() {
  const occupiedObjects = [...level.collectables, ...level.storyProps];
  level.hazards.forEach((hazard) => {
    const anchor = hazard.anchorPlatform;
    const safeLeft = hazard.x - anchor.x;
    const safeRight = anchor.x + anchor.width - hazard.x - hazard.width;
    assert.equal(anchor.constructor, Platform, hazard.id);
    assert.equal(hazard.y + hazard.height, anchor.y);
    assert.ok(Math.max(safeLeft, safeRight) >= 128, hazard.id);
    assert.ok(occupiedObjects.every((object) => !overlaps(hazard, object)), hazard.id);
  });
}

function assertSafeIntroduction() {
  const firstHazard = level.hazards.find(({ id }) => {
    return id === "scrapyard-electric-01";
  });
  assert.ok(firstHazard.x - level.playerStart.x >= 400);
}

function assertLearnableCycles() {
  const timedTypes = [
    HAZARD_TYPES.RETRACTABLE_SPIKES,
    HAZARD_TYPES.PULSE_GATE,
  ];
  timedTypes.forEach((type) => {
    const config = HAZARD_CONFIGS[type];
    assert.ok(config.clip.frameDurationSeconds >= 0.45);
    assert.equal(config.clip.frameCount - config.dangerousFrames.length, 2);
    assert.equal(config.dangerousFrames.length, 2);
  });
  assert.equal(HAZARD_CONFIGS.shockPad.dangerousFrames.length, 4);
}

function assertSafeWorldPhase() {
  const world = new World({}, GAME_CONFIG, createInput(), level);
  world.initialize();
  const spikes = world.getEntities(WORLD_ENTITY_GROUPS.HAZARDS)
    .find(({ id }) => id === "pressworks-spikes-01");
  placeCharacterOn(world.character, spikes);
  spikes.setFrameIndex(0);
  world.update(0);
  assert.deepEqual(world.takeDamageEvents(), []);
  spikes.update(0.9);
  placeCharacterOn(world.character, spikes);
  world.update(0);
  assert.equal(world.takeDamageEvents()[0].amount, 15);
}

function isInside(hazard, section) {
  return hazard.y >= section.topY && hazard.y < section.bottomY;
}

function overlaps(first, second) {
  return first.x < second.x + second.width &&
    first.x + first.width > second.x &&
    first.y < second.y + second.height &&
    first.y + first.height > second.y;
}

function placeCharacterOn(character, hazard) {
  character.x = hazard.x;
  character.y = hazard.y;
  character.velocityX = 0;
  character.velocityY = 0;
}

function createInput() {
  return Object.freeze({
    consumePress: () => false,
    left: false, right: false, jump: false,
    attack: false, weaponSwitch: false,
  });
}
