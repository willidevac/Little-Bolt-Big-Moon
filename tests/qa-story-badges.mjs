import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { GAME_CONFIG } from "../js/config/game-config.js";
import { createLevelOne } from "../js/levels/level-01.js";
import { RunStats } from "../classes/systems/run-stats.class.js";

const level = createLevelOne();
const badges = level.collectables.filter(({ type }) => type === "storyBadge");

assert.equal(badges.length, 2);
assert.deepEqual(badges.map(({ badgePart }) => badgePart), ["left", "right"]);
badges.forEach(assertSafeRouteAnchor);
assertBadgeRemainsAnchored();
assertBadgeRewardsDiscovery();
await assertPresentationSupport();

console.log("STORY-P2: Beide verankerten Erinnerungsabzeichen bestanden.");

function assertSafeRouteAnchor(badge) {
  const anchor = level.platforms.find(({ id }) => id === badge.anchorPlatform.id);
  assert.equal(anchor.mechanic ?? null, null);
  assert.equal(anchor.routeRole, "main");
  assert.equal(badge.y + badge.height, anchor.y);
  assert.ok(overlaps(badge, anchor));
}

function assertBadgeRemainsAnchored() {
  const badge = badges[0];
  const start = { x: badge.x, y: badge.y };
  badge.update(0.1);
  assert.deepEqual({ x: badge.x, y: badge.y }, start);
}

function assertBadgeRewardsDiscovery() {
  const stats = new RunStats(GAME_CONFIG.hud, level.playerStart.y);
  const pickup = badges[0].getPickup();
  assert.equal(pickup.badgePart, "left");
  assert.equal(stats.applyPickups([pickup]), true);
  assert.ok(stats.getSnapshot().score > 0);
}

async function assertPresentationSupport() {
  const [audio, feedback] = await Promise.all([
    fs.readFile("classes/systems/game-audio-controller.class.js", "utf8"),
    fs.readFile("classes/ui/hud-announcement.class.js", "utf8"),
  ]);
  assert.match(audio, /storyBadge:\s*"pickupGear"/);
  assert.match(feedback, /"storyBadge"/);
}

function overlaps(first, second) {
  return first.x < second.x + second.width &&
    first.x + first.width > second.x;
}
