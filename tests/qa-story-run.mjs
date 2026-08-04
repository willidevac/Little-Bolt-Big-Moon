import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { GAME_CONFIG } from "../js/config/game-config.js";
import { createLevelOne } from "../js/levels/level-01.js";
import {
  World,
  WORLD_ENTITY_GROUPS,
} from "../classes/core/world.class.js";

const EXPECTED_TYPES = Object.freeze([
  "abandonedCompanionCradle",
  "sealedLumaTransport",
  "launchTraceConsole",
  "stationDetentionPod",
  "fortressRouteBeacon",
  "lumaContainmentCapsule",
]);
const RUNTIME_ASSETS = Object.freeze([
  Object.freeze(["img/sprites/props/story-abandoned-cradle-clean-hd.png", 160, 106]),
  Object.freeze(["img/sprites/props/story-luma-transport-case-clean-hd.png", 144, 84]),
  Object.freeze(["img/sprites/props/story-launch-trace-console-clean-hd.png", 144, 109]),
  Object.freeze(["img/sprites/props/story-detention-pod-clean-hd.png", 160, 164]),
  Object.freeze(["img/sprites/props/story-fortress-route-beacon-clean-hd.png", 128, 142]),
  Object.freeze(["img/sprites/props/story-luma-containment-clean-hd.png", 220, 192]),
]);
const input = Object.freeze({
  consumePress: () => false,
  left: false,
  right: false,
  jump: false,
  attack: false,
  weaponSwitch: false,
});
const level = createLevelOne(GAME_CONFIG.enemies);

assertStoryOrder();
assertBiomePlacements();
assertNonBlockingProps();
assertWorldIntegration();
assertStoryPulse();
await assertRuntimeAssets();

console.log("STORY-001: Sechs wortlose Hinweise sicher integriert.");

function assertStoryOrder() {
  assert.deepEqual(level.storyProps.map(({ type }) => type), EXPECTED_TYPES);
  const heights = level.storyProps.map(({ y }) => y);
  assert.deepEqual(heights, [...heights].sort((a, b) => b - a));
}

function assertBiomePlacements() {
  const ranges = [
    [140000, 150000], [110000, 120000], [80000, 90000],
    [30000, 60000], [20000, 30000], [0, 1000],
  ];
  level.storyProps.forEach((prop, index) => {
    const [minimum, maximum] = ranges[index];
    assert.ok(prop.y >= minimum && prop.y < maximum);
    assert.ok(prop.x >= 0 && prop.x + prop.width <= level.width);
  });
}

function assertNonBlockingProps() {
  level.storyProps.forEach((prop) => {
    assert.equal(prop.collisionBox, null);
    assert.equal("damage" in prop, false);
    assert.equal("amount" in prop, false);
  });
}

function assertWorldIntegration() {
  const world = new World({}, GAME_CONFIG, input, level);
  world.initialize();
  const decorations = world.getEntities(WORLD_ENTITY_GROUPS.DECORATIONS);
  assert.equal(decorations.length, EXPECTED_TYPES.length);
  assert.deepEqual(decorations, level.storyProps);
}

function assertStoryPulse() {
  level.storyProps.forEach((prop) => {
    prop.update(0.33);
    assert.equal(prop.frameIndex, 0);
    assert.equal(prop.pulseTime, 0.33);
    assert.match(prop.glowColor, /^#[0-9a-f]{6}$/i);
  });
}

async function assertRuntimeAssets() {
  for (const [file, width, height] of RUNTIME_ASSETS) {
    const png = await fs.readFile(file);
    assert.equal(png.readUInt32BE(16), width);
    assert.equal(png.readUInt32BE(20), height);
    assert.equal(png[25], 6, `${file} braucht einen Alphakanal.`);
  }
}
