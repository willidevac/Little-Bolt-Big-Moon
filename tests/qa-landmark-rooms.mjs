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

assert.equal(landmarks.length, level.sections.length);
assert.equal(new Set(landmarks.map(({ section }) => section.id)).size, 15);
assert.deepEqual([...new Set(landmarks.map(({ room }) => room.landmark))].sort(), [
  "bridge", "chamber", "gate", "ruin", "shaft",
]);
assert.equal(landmarkStructures.length, landmarks.length * 3);
assert.ok(collidableLandmarks.length >= 19);
landmarks.forEach(assertLandmarkComposition);
landmarks.filter(hasTwoLandmarkWalls).forEach(assertOpenCorridor);

console.log("ENV-003: 15 distinctive landmark rooms vary the complete journey.");

function assertLandmarkComposition({ section, room }) {
  const prefix = `${section.id}-${room.id}-landmark-`;
  const structures = landmarkStructures.filter(({ id }) => id.startsWith(prefix));
  assert.equal(structures.length, 3, `${room.id} needs three connected parts.`);
  assert.equal(new Set(structures.map(({ id }) => id)).size, 3);
}

function hasTwoLandmarkWalls({ room }) {
  return room.landmark === "chamber" || room.landmark === "shaft";
}

function assertOpenCorridor({ section, room }) {
  const prefix = `${section.id}-${room.id}-landmark-`;
  const walls = landmarkStructures
    .filter(({ id, role }) => id.startsWith(prefix) && role === "wall")
    .flatMap((structure) => structure.getCollisionBoundsList())
    .sort((left, right) => left.x - right.x);
  assert.equal(walls.length, 2);
  assert.ok(walls[1].x - walls[0].x - walls[0].width >= 512);
}
