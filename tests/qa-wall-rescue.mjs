import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PlatformRouteBuilder } from
  "../classes/systems/platform-route-builder.class.js";
import { PLATFORM_WIDTHS, SIDE_PADDING } from
  "../js/config/platform-route-rules.js";

const MAXIMUM_RESCUE_GAP_Y = 2_800;
const RISK_TYPES = Object.freeze(["narrow", "moving", "falling"]);
const level = JSON.parse(
  await readFile(new URL("../data/levels/level-01.json", import.meta.url), "utf8"),
);
const route = new PlatformRouteBuilder(level.width).build(level.sections);
const catches = route.filter(({ type }) => type === "catch")
  .sort((first, second) => second.y - first.y);

assertRegularRescues();
assertRescuesStayInsideWorld();
assertRiskPlatformsRemainUntouched();

console.log("FB-004: Wandrettung und verteilte Auffangplattformen bestanden.");

function assertRegularRescues() {
  const heights = [level.height, ...catches.map(({ y }) => y), 0];
  const gaps = heights.slice(1).map((height, index) => heights[index] - height);
  assert.ok(catches.length >= 90);
  assert.ok(Math.max(...gaps) <= MAXIMUM_RESCUE_GAP_Y);
  assert.ok(getBiomeCatchCounts().every((count) => count >= 10));
}

function assertRescuesStayInsideWorld() {
  catches.forEach(({ x }) => {
    assert.ok(x >= SIDE_PADDING);
    assert.ok(x + PLATFORM_WIDTHS.catch <= level.width - SIDE_PADDING);
  });
}

function assertRiskPlatformsRemainUntouched() {
  const authored = level.sections.flatMap(({ route: sectionRoute }) => {
    return sectionRoute.rooms.flatMap((room) => [
      ...room.steps, ...(room.shortcut ?? []),
    ]);
  });
  RISK_TYPES.forEach((type) => {
    assert.equal(countType(route, type), countType(authored, type));
  });
}

function getBiomeCatchCounts() {
  const biomes = new Set(level.sections.map(({ tileset }) => tileset));
  return [...biomes].map((tileset) => {
    return catches.filter((platform) => platform.tileset === tileset).length;
  });
}

function countType(platforms, type) {
  return platforms.filter((platform) => platform.type === type).length;
}
