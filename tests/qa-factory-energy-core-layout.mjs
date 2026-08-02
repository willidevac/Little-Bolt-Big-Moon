import { readFile } from "node:fs/promises";
import { PlatformRouteBuilder } from
  "../classes/systems/platform-route-builder.class.js";
import { verifyRoomLayout } from "./helpers/room-layout-qa.mjs";

const level = JSON.parse(
  await readFile(new URL("../data/levels/level-01.json", import.meta.url), "utf8"),
);
const section = level.sections.find(({ id }) => id === "factory-energy-core");
const rooms = section.route.rooms;
const route = new PlatformRouteBuilder(level.width).build(level.sections);
const platforms = route.filter(({ id }) => {
  return id.startsWith("factory-energy-core-");
});

verifyRoomLayout({
  worldWidth: level.width,
  rooms,
  platforms,
  expectedRoomCount: 12,
  minimumBothWalls: 3,
  challenge: Object.freeze({ type: "falling", count: 24 }),
});

console.log("MAP-005: Der Energiekern pulsiert durch 12 Reaktorr\u00e4ume.");
