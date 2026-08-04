import assert from "node:assert/strict";
import { createLevelOne } from "../js/levels/level-01.js";

const level = createLevelOne();
const biomes = [
  "scrapyard", "factory", "launch-tower", "space-station", "moon",
];
const expectations = {
  scrapyard: {
    mechanics: { crane: 3 },
    roles: { precision: 15, rest: 4, launch: 1, rescue: 1 },
    structures: { "early-trickshot-wall": 5 },
  },
  factory: {
    mechanics: { trap: 8, crane: 4 },
    roles: { precision: 15, rest: 4 },
    structures: { "early-trickshot-wall": 6, "jump-window": 3 },
  },
  "launch-tower": {
    mechanics: { falling: 8, spring: 3 },
    roles: { precision: 18, rest: 3 },
    structures: { "wall-bounce-choke": 2, "jump-window": 4 },
  },
  "space-station": {
    mechanics: { falling: 6, trap: 5, spring: 3 },
    roles: { precision: 18, rest: 4 },
    structures: { "wall-bounce-choke": 4 },
  },
  moon: {
    mechanics: { falling: 5, trap: 4, spring: 4 },
    roles: { precision: 19, rest: 7 },
    structures: { "wall-bounce-choke": 6 },
  },
};

for (const biomeId of biomes) {
  const platforms = level.platforms.filter((entry) => {
    return entry.biomeId === biomeId;
  });
  const structures = level.structures.filter((entry) => {
    return entry.biomeId === biomeId;
  });
  assertMinimumCounts(platforms, "mechanic", expectations[biomeId].mechanics);
  assertMinimumCounts(platforms, "platformRole", expectations[biomeId].roles);
  assertMinimumCounts(structures, "role", expectations[biomeId].structures);
  assert.ok(platforms.filter(({ routeRole }) => routeRole === "main").length >= 60);
}

const chokeCounts = ["launch-tower", "space-station", "moon"].map((biomeId) => {
  return level.structures.filter(({ role, biomeId: owner }) => {
    return owner === biomeId && role === "wall-bounce-choke";
  }).length;
});
assert.deepEqual(chokeCounts, [2, 4, 6]);

const signatures = biomes.map((biomeId) => {
  const platforms = level.platforms.filter((entry) => entry.biomeId === biomeId);
  const structures = level.structures.filter((entry) => entry.biomeId === biomeId);
  return [
    countSignature(platforms, "mechanic"),
    countSignature(structures, "role"),
  ].join("|");
});
assert.equal(new Set(signatures).size, biomes.length);

console.log("VAR-002: Every biome has a distinct, escalating gameplay mix.");

function assertMinimumCounts(entries, property, minimums) {
  for (const [value, minimum] of Object.entries(minimums)) {
    const count = entries.filter((entry) => entry[property] === value).length;
    assert.ok(count >= minimum, `${property} ${value}: ${count} < ${minimum}`);
  }
}

function countSignature(entries, property) {
  const values = [...new Set(entries.map((entry) => entry[property])
    .filter(Boolean))].sort();
  return values.map((value) => {
    return `${value}:${entries.filter((entry) => entry[property] === value).length}`;
  }).join(",");
}
