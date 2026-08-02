import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PlatformDefinitionFactory } from
  "../classes/systems/platform-definition-factory.class.js";

const level = JSON.parse(
  await readFile(new URL("../data/levels/level-01.json", import.meta.url), "utf8"),
);
const factory = new PlatformDefinitionFactory(level.width);
const authoredSteps = getAuthoredSteps();

assertGeneratedPlatform();
assertAuthoredBehaviors();
assertBoundaryAndReachability();
assert.throws(() => new PlatformDefinitionFactory(0), TypeError);

console.log("CLEAN-006: Einzelne Plattformdefinitionen sind getrennt geprüft.");

function assertGeneratedPlatform() {
  const section = level.sections[0];
  const platform = factory.create(section, 0, level.height - 160, {
    isFloor: true,
  });
  assert.equal(platform.type, "floor");
  assert.equal(platform.tileset, section.tileset);
  assert.equal(Object.isFrozen(platform), true);
}

function assertAuthoredBehaviors() {
  const moving = createAuthoredPlatform("moving");
  const falling = createAuthoredPlatform("falling");
  assert.ok(moving.movement.minimumX < moving.movement.maximumX);
  assert.equal(Object.isFrozen(moving.movement), true);
  assert.equal(falling.fall.maximumDropPixels, 900);
  assert.equal(falling.fall.respawnDelaySeconds, 3);
  assert.equal(Object.isFrozen(falling.fall), true);
}

function assertBoundaryAndReachability() {
  const section = level.sections[0];
  const floor = factory.create(section, 0, level.height - 160, { isFloor: true });
  const boundary = factory.createBoundary(
    section, 99, section.topY + 64, floor, level.sections[1],
  );
  assert.equal(boundary.type, "catch");
  assert.ok(boundary.x >= 64 && boundary.x <= level.width - 64 - 512);
  assert.throws(() => factory.assertAuthoredJump(
    { x: 1_000, type: "path" }, { x: 0, type: "path" },
  ), RangeError);
}

function createAuthoredPlatform(type) {
  const entry = authoredSteps.find(({ step }) => step.type === type);
  return factory.createAuthored(
    entry.section, entry.room, entry.roomIndex,
    entry.step, entry.stepIndex, 500, null,
  );
}

function getAuthoredSteps() {
  return level.sections.flatMap((section) => {
    return section.route.rooms.flatMap((room, roomIndex) => {
      return room.steps.map((step, stepIndex) => ({
        section, room, roomIndex, step, stepIndex,
      }));
    });
  });
}
