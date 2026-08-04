import assert from "node:assert/strict";
import { createLevelOne } from "../js/levels/level-01.js";

const level = createLevelOne();
const collectables = level.collectables;
const anchorIds = new Set();

assert.equal(collectables.length, 38);
const preBossSupply = collectables.find(({ isPreBossSupply }) => isPreBossSupply);
assert.ok(preBossSupply);
assert.ok(preBossSupply.y > 900 && preBossSupply.y < 2200);
collectables.forEach(assertAnchored);
assert.equal(anchorIds.size, collectables.length);
assert.deepEqual(new Set(collectables.map(({ type }) => type)), new Set([
  "gear", "energy", "arcCharge", "weapon", "storyBadge",
]));
assert.deepEqual(collectables.filter(({ type }) => type === "weapon")
  .map(({ weaponId }) => weaponId), ["boltThrower", "arcCannon"]);
assert.equal(collectables.filter(({ type }) => type === "storyBadge").length, 2);

console.log("VIS-001: Alle 38 nutzbaren Items stehen leuchtend auf sicherem Boden.");

function assertAnchored(collectable) {
  const anchor = collectable.anchorPlatform;
  assert.equal(collectable.anchorPlatformId, anchor?.id);
  assert.equal(collectable.y + collectable.height, anchor.y);
  assert.ok(collectable.x >= anchor.x);
  assert.ok(collectable.x + collectable.width <= anchor.x + anchor.width);
  assert.equal(anchor.mechanic ?? null, null);
  assert.equal(anchor.requiresWallBounce ?? null, null);
  assert.equal(anchor.preparesWallBounce ?? null, null);
  assert.ok(!anchorIds.has(anchor.id));
  anchorIds.add(anchor.id);
}
