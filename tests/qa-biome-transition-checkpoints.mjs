import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PlatformRouteBuilder } from
  "../classes/systems/platform-route-builder.class.js";
import { PLATFORM_WIDTHS } from "../js/config/platform-route-rules.js";

const level = JSON.parse(
  await readFile(new URL("../data/levels/level-01.json", import.meta.url), "utf8"),
);
const route = new PlatformRouteBuilder(level.width).build(level.sections);
const transitions = route.filter(({ type }) => type === "transition");
const bossZones = level.combatZones.filter(({ unlockPlatformId }) => {
  return Boolean(unlockPlatformId);
});

assert.equal(transitions.length, 4);
assert.equal(bossZones.length, transitions.length);
assert.equal(PLATFORM_WIDTHS.transition, level.width);
transitions.forEach(assertSafeTransition);

console.log("ENV-004: Four boss transitions form safe physical checkpoints.");

function assertSafeTransition(transition) {
  const zone = bossZones.find((candidate) => {
    return transition.y >= candidate.y &&
      transition.y <= candidate.y + candidate.height;
  });
  assert.ok(zone, `${transition.id} needs a matching boss arena.`);
  const boss = level.enemies.find(({ id }) => zone.enemyIds.includes(id));
  assert.equal(zone.enemyIds.length, 1);
  assert.equal(boss?.isBoss, true);
  assert.match(transition.id, /-catch-\d+$/);
  assert.equal(transition.x, 0);
  assert.equal(transition.movement, undefined);
  assert.equal(transition.fall, undefined);
}
