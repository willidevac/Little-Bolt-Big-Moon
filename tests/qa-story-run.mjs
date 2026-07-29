import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { GAME_CONFIG } from "../js/config/game-config.js";
import { createLevelOne } from "../js/levels/level-01.js";
import {
  World,
  WORLD_ENTITY_GROUPS,
} from "../classes/core/world.class.js";

const EXPECTED_TYPES = Object.freeze([
  "emptyLumaCradle",
  "factoryDuoPoster",
  "lumaCargoCrate",
  "lumaBadgeHalf",
  "blueSignalBeacon",
  "poweredOffLuma",
]);
const RUNTIME_ASSETS = Object.freeze([
  Object.freeze(["img/sprites/props/empty-luma-cradle.png", 96, 64]),
  Object.freeze(["img/sprites/props/factory-duo-poster.png", 64, 96]),
  Object.freeze(["img/sprites/props/luma-cargo-crate.png", 64, 64]),
  Object.freeze(["img/sprites/props/blue-signal-beacon.png", 256, 96]),
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
assertSignalAnimation();
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
    [40000, 50000], [30000, 40000], [0, 1000],
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

function assertSignalAnimation() {
  const signal = level.storyProps.find(({ type }) => {
    return type === "blueSignalBeacon";
  });
  const staticProp = level.storyProps[0];
  signal.update(0.33);
  staticProp.update(0.33);
  assert.equal(signal.frameIndex, 1);
  assert.equal(staticProp.frameIndex, 0);
}

async function assertRuntimeAssets() {
  for (const [file, width, height] of RUNTIME_ASSETS) {
    const png = await fs.readFile(file);
    assert.equal(png.readUInt32BE(16), width);
    assert.equal(png.readUInt32BE(20), height);
    assert.equal(png[25], 6, `${file} braucht einen Alphakanal.`);
  }
}
