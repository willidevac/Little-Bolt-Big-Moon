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
  definePlatform("tutorial-step-3", "rescue", 820, 750, 320, 88, 3),
  definePlatform("tutorial-step-4", "standard", 430, 530, 384, 93, 4),
  definePlatform("tutorial-step-5", "rescue", 100, 310, 320, 88, 5),
  definePlatform("tutorial-goal", "rest", 440, 90, 480, 120, 6),
]);

/** Creates one immutable platform definition. */
function definePlatform(id, platformRole, x, y, width, height, routeOrder) {
  return Object.freeze({
    id, platformRole, x, y, width, height, routeOrder,
    kind: platformRole === "floor" ? "floor" : "tutorial-platform",
    routeRole: "main", biomeId: "scrapyard", accentColor: "#35e8ef",
  });
}
