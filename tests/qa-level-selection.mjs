import assert from "node:assert/strict";
import { LevelSelection } from
  "../classes/core/level-selection.class.js";

const creations = [];
const selection = new LevelSelection({
  /** Creates a main fixture. */
  main: () => createFixture("main"),
  /** Creates a tutorial fixture. */
  tutorial: () => createFixture("tutorial"),
}, "main");

assert.equal(selection.activeLevelId, "main");
assert.equal(selection.hasLevel("main"), true);
assert.equal(selection.hasLevel("missing"), false);
assert.deepEqual(selection.createLevel(), { id: "main" });
assert.equal(selection.select("tutorial"), true);
assert.equal(selection.activeLevelId, "tutorial");
assert.deepEqual(selection.createLevel(), { id: "tutorial" });
assert.equal(selection.select("tutorial"), false);
assert.throws(() => selection.select("missing"), RangeError);
assert.throws(() => selection.select("toString"), RangeError);
assert.deepEqual(creations, ["main", "tutorial"]);

console.log("ARCH-002: Levelauswahl und Levelerzeugung sind zentral getrennt.");

/** Creates an observable level fixture. */
function createFixture(id) {
  creations.push(id);
  return { id };
}
