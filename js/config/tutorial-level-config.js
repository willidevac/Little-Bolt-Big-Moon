import { PLATFORM_MECHANIC_CONFIG } from "./world-content-config.js";

const LEVEL_WIDTH = 1280;
const LEVEL_HEIGHT = 1600;
const FLOOR_Y = 1408;

export const TUTORIAL_LEVEL_CONFIG = Object.freeze({
  id: "tutorial-scrapyard",
  width: LEVEL_WIDTH,
  height: LEVEL_HEIGHT,
  playerStart: Object.freeze({ x: 560, y: FLOOR_Y - 55 }),
  section: Object.freeze({
    id: "tutorial-scrapyard",
    name: "Tutorial – Schrottplatz",
    backgroundId: "scrapyard",
    tileset: "scrapyard",
    topY: 0,
    bottomY: LEVEL_HEIGHT,
  }),
});

export const TUTORIAL_PLATFORM_DEFINITIONS = Object.freeze([
  definePlatform("tutorial-floor", "floor", 0, FLOOR_Y, LEVEL_WIDTH, 96, 0),
  definePlatform("tutorial-step-1", "standard", 120, 1190, 384, 93, 1),
  definePlatform("tutorial-step-2", "standard", 600, 970, 384, 93, 2),
  defineMechanicPlatform("tutorial-spring", "spring", 820, 750,
    320, 110, 3, { ...PLATFORM_MECHANIC_CONFIG.spring,
      bounceDirection: "left", springTargetId: "tutorial-falling" }),
  defineMechanicPlatform("tutorial-falling", "falling", 430, 530,
    384, 92, 4, PLATFORM_MECHANIC_CONFIG.falling),
  defineMechanicPlatform("tutorial-trap", "trap", 100, 310,
    320, 82, 5, PLATFORM_MECHANIC_CONFIG.trap),
  definePlatform("tutorial-goal", "rest", 440, 90, 480, 120, 6),
]);

/** Creates one tutorial use of an existing production platform mechanic. */
function defineMechanicPlatform(id, mechanic, x, y, width, height,
  routeOrder, config) {
  const configKey = mechanic === "falling" ? "fall" : mechanic;
  const mechanicData = mechanic === "spring"
    ? config
    : { [configKey]: Object.freeze({ ...config }) };
  return Object.freeze({
    ...definePlatform(id, mechanic, x, y, width, height, routeOrder),
    mechanic, kind: "mechanic-platform", ...mechanicData,
  });
}

/** Creates one immutable platform definition. */
function definePlatform(id, platformRole, x, y, width, height, routeOrder) {
  return Object.freeze({
    id, platformRole, x, y, width, height, routeOrder,
    kind: platformRole === "floor" ? "floor" : "tutorial-platform",
    routeRole: "main", biomeId: "scrapyard", accentColor: "#35e8ef",
  });
}
