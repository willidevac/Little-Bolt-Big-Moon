import { readFile } from "node:fs/promises";
import { PlatformRouteBuilder } from
  "../classes/systems/platform-route-builder.class.js";
import { verifyRoomLayout } from "./helpers/room-layout-qa.mjs";

const level = JSON.parse(
  await readFile(new URL("../data/levels/level-01.json", import.meta.url), "utf8"),
);
const scrapyardSections = level.sections.slice(0, 3);
const route = new PlatformRouteBuilder(level.width).build(level.sections);

scrapyardSections.forEach(verifyScrapyardSection);

console.log("MAP-002: Der Schrottplatz besteht aus 42 verbundenen Räumen.");

function verifyScrapyardSection(section) {
  const platforms = route.filter(({ id }) => id.startsWith(`${section.id}-`));
  verifyRoomLayout({
    worldWidth: level.width,
    rooms: section.route.rooms,
    platforms,
    expectedRoomCount: 14,
    minimumBothWalls: 7,
  });
}
