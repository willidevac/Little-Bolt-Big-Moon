import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PlatformRouteBuilder } from "../classes/systems/platform-route-builder.class.js";
import { BIOME_CHALLENGE_PROFILES } from "../js/config/platform-route-rules.js";

const RISK_TYPES = new Set(["narrow", "moving", "falling"]);
const level = JSON.parse(
  await readFile(new URL("../data/levels/level-01.json", import.meta.url), "utf8"),
);
const route = new PlatformRouteBuilder(level.width).build(level.sections);
const biomeOrder = [...new Set(level.sections.map(({ tileset }) => tileset))];

assert.deepEqual(biomeOrder, [
  "scrapyard", "factory", "launch-tower", "space-station", "moon",
]);
assert.equal(new Set(Object.values(BIOME_CHALLENGE_PROFILES).map(String)).size, 5);
assert.ok(isNonDecreasingComplexity(biomeOrder));
biomeOrder.forEach(assertBiome);
assert.equal(route.length, 956);

console.log("BIO-001: Fünf Landschaften besitzen eigene Challenge-Sprachen.");

function assertBiome(tileset) {
  const sections = level.sections.filter((section) => section.tileset === tileset);
  assert.equal(sections.length, 3);
  sections.flatMap(({ route: sectionRoute }) => sectionRoute.rooms)
    .forEach((room) => assertRoomProfile(room, tileset));
}

function assertRoomProfile(room, tileset) {
  const profile = BIOME_CHALLENGE_PROFILES[tileset];
  const risks = room.steps.filter(({ type }) => RISK_TYPES.has(type));
  assert.ok(profile.every((type) => risks.some((step) => step.type === type)));
  assert.ok(risks.every((step) => profile.includes(step.type)));
}

function isNonDecreasingComplexity(tilesets) {
  const counts = tilesets.map((tileset) => {
    return BIOME_CHALLENGE_PROFILES[tileset].length;
  });
  return counts.slice(1).every((count, index) => count >= counts[index]);
}
