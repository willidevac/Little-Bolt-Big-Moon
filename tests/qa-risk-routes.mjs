import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PlatformRouteBuilder } from "../classes/systems/platform-route-builder.class.js";
import { PLATFORM_WIDTHS } from "../js/config/platform-route-rules.js";

const RISK_TYPES = new Set(["narrow", "moving", "falling"]);
const level = JSON.parse(
  await readFile(new URL("../data/levels/level-01.json", import.meta.url), "utf8"),
);
const route = new PlatformRouteBuilder(level.width).build(level.sections);
const shortcutRooms = level.sections.flatMap(({ tileset, route: sectionRoute }) => {
  return sectionRoute.rooms.filter(({ shortcut }) => shortcut)
    .map((room) => ({ ...room, tileset }));
});

assert.equal(shortcutRooms.length, 5);
assert.equal(new Set(shortcutRooms.map(({ tileset }) => tileset)).size, 5);
shortcutRooms.forEach(assertShortcutRoom);
assert.equal(route.filter(({ roomRole }) => roomRole === "shortcut").length, 15);
assertRewardsStandOnShortcuts(shortcutRooms, route);

console.log("RISK-001: Fünf sichere Wege und belohnte Risikoabzweige bestanden.");

function assertShortcutRoom(room) {
  assert.ok(room.steps.slice(1, -1).every(({ type }) => type === "path"));
  assert.equal(room.shortcut.length, 3);
  assert.ok(room.shortcut.every(({ type }) => RISK_TYPES.has(type)));
  assert.equal(room.shortcut.filter(({ rewardId }) => rewardId).length, 1);
  assertSeparateRoutes(room);
}

function assertSeparateRoutes(room) {
  room.shortcut.forEach((step) => {
    const safeStep = room.steps[step.stepIndex];
    assert.equal(overlapsHorizontally(step, safeStep), false);
  });
}

function assertRewardsStandOnShortcuts(rooms, platforms) {
  rooms.forEach((room) => {
    const rewardStep = room.shortcut.find(({ rewardId }) => rewardId);
    const reward = level.collectables.find(({ id }) => id === rewardStep.rewardId);
    const platform = platforms.find(({ rewardId }) => rewardId === reward.id);
    assert.ok(platform);
    assert.equal(reward.y + 64, platform.y);
    assert.ok(overlapsHorizontally({ ...reward, width: 64 }, platform));
  });
}

function overlapsHorizontally(first, second) {
  const firstWidth = first.width ?? PLATFORM_WIDTHS[first.type];
  const secondWidth = second.width ?? PLATFORM_WIDTHS[second.type];
  return first.x < second.x + secondWidth && first.x + firstWidth > second.x;
}
