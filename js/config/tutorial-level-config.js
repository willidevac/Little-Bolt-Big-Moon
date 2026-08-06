import { PLATFORM_MECHANIC_CONFIG } from "./world-content-config.js";
import {
  TUTORIAL_COMBAT_ZONE_ID,
  TUTORIAL_PRACTICE_TARGET_ID,
  TUTORIAL_WEAPON_ID,
} from "./tutorial-config.js";

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

export const TUTORIAL_WEAPON_PICKUP_DEFINITION = Object.freeze({
  id: "tutorial-bolt-thrower", type: "weapon", visualType: TUTORIAL_WEAPON_ID,
  weaponId: TUTORIAL_WEAPON_ID, amount: 1,
  anchorPlatformId: "tutorial-goal", x: 530, y: 90,
});

export const TUTORIAL_PRACTICE_TARGET_DEFINITION = Object.freeze({
  id: TUTORIAL_PRACTICE_TARGET_ID, type: "scrapCrawler",
  anchorPlatformId: "tutorial-goal", x: 770, y: 90,
  patrolMinX: 700, patrolMaxX: 900, startDirection: -1,
  isPassive: true,
});

export const TUTORIAL_PRACTICE_TARGET_PROFILE = Object.freeze({
  speedPixelsPerSecond: 20,
  maximumHealth: 18,
});

export const TUTORIAL_COMBAT_ENEMY_DEFINITIONS = Object.freeze([
  Object.freeze({
    id: "tutorial-combat-crawler", type: "scrapCrawler",
    x: 540, y: 26, patrolMinX: 470, patrolMaxX: 690, startDirection: 1,
  }),
  Object.freeze({
    id: "tutorial-combat-drone", type: "droneGuard",
    x: 740, y: 30, patrolMinX: 690, patrolMaxX: 910, startDirection: -1,
  }),
]);

export const TUTORIAL_COMBAT_PROFILES = Object.freeze({
  scrapCrawler: Object.freeze({
    speedPixelsPerSecond: 34, maximumHealth: 36,
    contactDamage: 8, attackCooldownSeconds: 1.8,
  }),
  droneGuard: Object.freeze({
    speedPixelsPerSecond: 44, maximumHealth: 36,
    contactDamage: 8, attackCooldownSeconds: 2,
    hoverAmplitudePixels: 8, hoverCyclesPerSecond: 0.3,
    verticalTrackingSpeedPixelsPerSecond: 54,
    verticalTrackingRangePixels: 70,
  }),
});

export const TUTORIAL_COMBAT_ZONE_DEFINITION = Object.freeze({
  id: TUTORIAL_COMBAT_ZONE_ID,
  x: 830, y: 0, width: 90, height: 250,
  enemyIds: Object.freeze(TUTORIAL_COMBAT_ENEMY_DEFINITIONS.map(({ id }) => id)),
});

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
