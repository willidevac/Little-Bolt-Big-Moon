import assert from "node:assert/strict";
import { WORLD_ENTITY_GROUPS } from "../classes/core/world-entity-groups.js";
import { WorldSceneBuilder } from
  "../classes/core/world-scene-builder.class.js";

const level = createLevel();
const world = createWorld();
const character = new WorldSceneBuilder(level).build(world);

assert.deepEqual(
  world.getEntities(WORLD_ENTITY_GROUPS.STRUCTURES),
  level.structures,
);
assert.deepEqual(
  world.getEntities(WORLD_ENTITY_GROUPS.PLATFORMS),
  level.platforms,
);
assert.deepEqual(
  world.getEntities(WORLD_ENTITY_GROUPS.DECORATIONS),
  level.storyProps,
);
assert.deepEqual(
  world.getEntities(WORLD_ENTITY_GROUPS.COLLECTABLES),
  level.collectables,
);
assert.deepEqual(world.getEntities(WORLD_ENTITY_GROUPS.HAZARDS), level.hazards);
assert.deepEqual({ x: character.x, y: character.y }, level.playerStart);
assert.equal(world.waveInitializations, 1);

const fallbackWorld = createWorld();
new WorldSceneBuilder(null).build(fallbackWorld);
assert.equal(fallbackWorld.getEntities(WORLD_ENTITY_GROUPS.CHARACTERS).length, 1);
assert.equal(fallbackWorld.getEntities(WORLD_ENTITY_GROUPS.PLATFORMS).length, 1);

console.log("CLEAN-013: Der Weltaufbau ist getrennt und vollständig.");

function createLevel() {
  return {
    structures: [{ id: "structure" }],
    platforms: [{ id: "platform" }], storyProps: [{ id: "story" }],
    collectables: [{ id: "pickup" }], hazards: [{ id: "hazard" }],
    playerStart: { x: 320, y: 640 },
  };
}

function createWorld() {
  const groups = createGroups();
  return {
    waveInitializations: 0,
    waveManager: { initialize(target) { target.waveInitializations += 1; } },
    addEntity: (group, entity) => groups.get(group).push(entity),
    getEntities: (group) => Object.freeze([...groups.get(group)]),
  };
}

function createGroups() {
  return new Map(
    Object.values(WORLD_ENTITY_GROUPS).map((group) => [group, []]),
  );
}
