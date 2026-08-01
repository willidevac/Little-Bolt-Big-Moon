import assert from "node:assert/strict";
import { WorldEntityRegistry } from
  "../classes/core/world-entity-registry.class.js";

const registry = new WorldEntityRegistry(["actors", "effects"]);
const byte = { id: "byte" };
const drone = { id: "drone" };
const spark = { id: "spark" };

assert.equal(registry.add("actors", byte), true);
assert.equal(registry.add("actors", byte), false);
assertSnapshot(registry, "actors", [byte]);
assertDeferredChanges(registry, byte, drone, spark);
assertClearDuringProcessing(registry, drone);
assertValidation(registry);

console.log("CLEAN-001: Entitätsgruppen besitzen einen sicheren Frame-Lebenszyklus.");

function assertSnapshot(target, groupName, expected) {
  const snapshot = target.getSnapshot(groupName);
  assert.deepEqual(snapshot, expected);
  assert.equal(Object.isFrozen(snapshot), true);
  assert.throws(() => snapshot.push({}), TypeError);
}

function assertDeferredChanges(target, current, next, effect) {
  target.process(["actors"], (entity) => {
    assert.equal(entity, current);
    target.remove("actors", current);
    target.add("actors", next);
    target.add("effects", effect);
  });
  assertSnapshot(target, "actors", [next]);
  assertSnapshot(target, "effects", [effect]);
}

function assertClearDuringProcessing(target, actor) {
  target.process(["actors"], (entity) => {
    assert.equal(entity, actor);
    target.clear();
  });
  assertSnapshot(target, "actors", []);
  assertSnapshot(target, "effects", []);
}

function assertValidation(target) {
  assert.throws(() => target.add("unknown", {}), RangeError);
  assert.throws(() => target.add("actors", null), TypeError);
  assert.throws(() => new WorldEntityRegistry([]), TypeError);
  assert.throws(() => new WorldEntityRegistry(["same", "same"]), TypeError);
}
