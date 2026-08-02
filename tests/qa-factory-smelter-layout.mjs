import { readFile } from "node:fs/promises";
import { PlatformRouteBuilder } from
  "../classes/systems/platform-route-builder.class.js";
import { verifyRoomLayout } from "./helpers/room-layout-qa.mjs";

const level = JSON.parse(
  await readFile(new URL("../data/levels/level-01.json", import.meta.url), "utf8"),
);
const section = level.sections.find(({ id }) => id === "factory-smelter");
const rooms = section.route.rooms;
const route = new PlatformRouteBuilder(level.width).build(level.sections);
const platforms = route.filter(({ id }) => id.startsWith("factory-smelter-"));

verifyRoomLayout({
  worldWidth: level.width,
  rooms,
  platforms,
  expectedRoomCount: 12,
  minimumBothWalls: 6,
  challenge: Object.freeze({ type: "falling", count: 23 }),
});

console.log("MAP-004: Das Schmelzwerk besteht aus 12 Ofenkammern.");
