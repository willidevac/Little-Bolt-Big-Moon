import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { GAME_CONFIG } from "../js/config/game-config.js";
import { createLevelOne } from "../js/levels/level-01.js";
import { RunStats } from "../classes/systems/run-stats.class.js";

const BIOMES = Object.freeze(["scrapyard", "factory", "launch", "space", "moon"]);
const level = createLevelOne(GAME_CONFIG.enemies);
const badges = level.collectables.filter(({ type }) => type === "storyBadge");

assert.equal(badges.length, BIOMES.length);
BIOMES.forEach(assertBiomeHasBadge);
badges.forEach(assertOptionalShortcutAnchor);
assertBadgeFollowsPlatform();
assertBadgeRewardsDiscovery();
await assertPresentationSupport();

console.log("STORY-P2: Fünf optionale, verankerte Erinnerungsabzeichen bestanden.");

function assertBiomeHasBadge(biome) {
  assert.equal(badges.filter(({ id }) => id.startsWith(biome)).length, 1);
}

function assertOptionalShortcutAnchor(badge) {
  const anchor = level.platforms.find(({ id }) => id === badge.anchorPlatform.id);
  assert.ok(anchor.id.includes("shortcut"));
  assert.equal(badge.y + badge.height, anchor.y);
  assert.ok(overlaps(badge, anchor));
}

function assertBadgeFollowsPlatform() {
  const badge = badges.find(({ id }) => id.startsWith("launch"));
  const start = { x: badge.x, y: badge.y };
  badge.anchorPlatform.setFrameDisplacement(8, -3);
  badge.update(0.1);
  assert.deepEqual({ x: badge.x, y: badge.y }, { x: start.x + 8, y: start.y - 3 });
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
    fs.readFile("classes/ui/pickup-feedback.class.js", "utf8"),
  ]);
  assert.match(audio, /storyBadge:\s*"pickupGear"/);
  assert.match(feedback, /"storyBadge"/);
}

function overlaps(first, second) {
  return first.x < second.x + second.width &&
    first.x + first.width > second.x;
}
