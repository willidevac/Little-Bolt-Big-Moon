import assert from "node:assert/strict";
import { GAME_CONFIG } from "../js/config/game-config.js";
import { createLevelOne } from "../js/levels/level-01.js";

const level = createLevelOne(GAME_CONFIG.enemies);
const landmarks = level.sections.flatMap((section) => {
  return section.route.rooms
    .filter(({ landmark }) => landmark)
    .map((room) => ({ section, room }));
});
const landmarkStructures = level.structures.filter(({ id }) => {
  return id.includes("-landmark-");
});
const collidableLandmarks = landmarkStructures.filter((structure) => {
  return structure.getCollisionBoundsList().length > 0;
});
const MINIMUM_COLLIDERS = Object.freeze({
  bridge: 2,
  chamber: 2,
  gate: 3,
  ruin: 3,
  shaft: 2,
});
const gameplaySignatures = new Map(landmarks.map(({ section, room }) => {
  return [room.landmark, getGameplaySignature(section.id, room.id)];
}));

assert.equal(landmarks.length, level.sections.length);
assert.equal(new Set(landmarks.map(({ section }) => section.id)).size, 15);
assert.deepEqual([...new Set(landmarks.map(({ room }) => room.landmark))].sort(), [
  "bridge", "chamber", "gate", "ruin", "shaft",
]);
assert.equal(landmarkStructures.length, landmarks.length * 3);
assert.ok(collidableLandmarks.length >= 35);
assert.equal(gameplaySignatures.size, 5);
assert.equal(new Set(gameplaySignatures.values()).size, 5);
landmarks.forEach(assertLandmarkComposition);
landmarks.forEach(assertNoPlatformBlocked);
landmarks.filter(hasTwoLandmarkWalls).forEach(assertSingleSolidWall);

console.log("ENV-003: 15 distinctive landmark rooms vary the complete journey.");

function assertLandmarkComposition({ section, room }) {
  const structures = getLandmarkStructures(section.id, room.id);
  assert.equal(structures.length, 3, `${room.id} needs three connected parts.`);
  assert.equal(new Set(structures.map(({ id }) => id)).size, 3);
  const collidable = structures.filter((structure) => {
    return structure.getCollisionBoundsList().length > 0;
  });
  assert.ok(collidable.length >= MINIMUM_COLLIDERS[room.landmark]);
}

function hasTwoLandmarkWalls({ room }) {
  return room.landmark === "chamber" || room.landmark === "shaft";
}

function assertSingleSolidWall({ section, room }) {
  const walls = getLandmarkStructures(section.id, room.id)
    .filter(({ role }) => role === "wall");
  const solidWalls = walls.filter((structure) => {
    return structure.getCollisionBoundsList().length > 0;
  });
  assert.equal(walls.length, 2);
  assert.equal(solidWalls.length, 1);
}

function getGameplaySignature(sectionId, roomId) {
  return getLandmarkStructures(sectionId, roomId)
    .filter((structure) => structure.getCollisionBoundsList().length > 0)
    .map(({ role }) => role)
    .sort()
    .join("-");
}

function getLandmarkStructures(sectionId, roomId) {
  const prefix = `${sectionId}-${roomId}-landmark-`;
  return landmarkStructures.filter(({ id }) => id.startsWith(prefix));
}

function assertNoPlatformBlocked({ section, room }) {
  const prefix = `${section.id}-${room.id}-`;
  const platforms = level.platforms.filter(({ id }) => id.startsWith(prefix));
  const colliders = getLandmarkStructures(section.id, room.id)
    .flatMap((structure) => structure.getCollisionBoundsList());
  const overlaps = colliders.flatMap((collider) => {
    return platforms.filter((platform) => crossesPlatform(collider, platform));
  });
  assert.equal(overlaps.length, 0, `${room.id} blocks an authored platform.`);
}

function crossesPlatform(collider, platform) {
  const crossesY = platform.y >= collider.y &&
    platform.y <= collider.y + collider.height;
  const crossesX = platform.x < collider.x + collider.width &&
    platform.x + platform.width > collider.x;
  return crossesX && crossesY;
}
