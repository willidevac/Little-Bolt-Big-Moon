import { PLATFORM_MECHANIC_CONFIG } from "./world-content-config.js";
import {
  TUTORIAL_BOSS_ID,
  TUTORIAL_BOSS_ZONE_ID,
  TUTORIAL_COMBAT_ZONE_ID,
  TUTORIAL_PRACTICE_TARGET_ID,
  TUTORIAL_WEAPON_ID,
} from "./tutorial-config.js";
import { GAME_CONFIG } from "./game-config.js";

export { SCRAP_OVERSEER_VISUAL_CONFIG } from
  "./scrap-overseer-visual-config.js";

const LEVEL_WIDTH = 1280;
const LEVEL_HEIGHT = 1600;
const FLOOR_Y = 1408;
const CAMERA_TOP_PADDING = 300;

export const TUTORIAL_LEVEL_CONFIG = Object.freeze({
  id: "tutorial-scrapyard",
  width: LEVEL_WIDTH,
  height: LEVEL_HEIGHT,
  playerStart: Object.freeze({ x: 560, y: FLOOR_Y - 55 }),
  cameraBounds: Object.freeze({
    minimumY: -CAMERA_TOP_PADDING,
    maximumY: LEVEL_HEIGHT - GAME_CONFIG.canvas.height,
    deadZoneTopPixels: 300,
  }),
  section: Object.freeze({
    id: "tutorial-scrapyard",
    name: "Tutorial – Schrottplatz",
    backgroundId: "scrapyard",
    tileset: "scrapyard",
    topY: -CAMERA_TOP_PADDING,
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
  definePlatform("tutorial-goal", "rest", 160, 90, 960, 120, 6),
]);

export const TUTORIAL_WEAPON_PICKUP_DEFINITION = Object.freeze({
  id: "tutorial-bolt-thrower", type: "weapon", visualType: TUTORIAL_WEAPON_ID,
  weaponId: TUTORIAL_WEAPON_ID, amount: 1,
  anchorPlatformId: "tutorial-goal", x: 530, y: 90,
});

export const TUTORIAL_RESOURCE_PICKUP_DEFINITIONS = Object.freeze([
  Object.freeze({
    id: "tutorial-gear", type: "gear", visualType: "gear", amount: 1,
    anchorPlatformId: "tutorial-floor", x: 340, y: FLOOR_Y,
  }),
  Object.freeze({
    id: "tutorial-energy", type: "energy", visualType: "energy", amount: 25,
    anchorPlatformId: "tutorial-floor", x: 820, y: FLOOR_Y,
  }),
]);

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
    x: 300, y: 26, patrolMinX: 220, patrolMaxX: 480, startDirection: 1,
  }),
  Object.freeze({
    id: "tutorial-combat-spring-mine", type: "springMine",
    x: 580, y: 26, patrolMinX: 500, patrolMaxX: 820, startDirection: -1,
  }),
  Object.freeze({
    id: "tutorial-combat-drone", type: "droneGuard",
    x: 980, y: 30, patrolMinX: 900, patrolMaxX: 1080, startDirection: -1,
  }),
]);

export const TUTORIAL_COMBAT_PROFILES = Object.freeze({
  scrapCrawler: Object.freeze({
    speedPixelsPerSecond: 34, maximumHealth: 36,
    contactDamage: 8, attackCooldownSeconds: 1.8,
  }),
  springMine: Object.freeze({
    jumpHorizontalSpeedPixelsPerSecond: 160,
    jumpVerticalSpeedPixelsPerSecond: 480,
    jumpCooldownSeconds: 3,
    detectionRangePixels: 350,
    detectionHeightPixels: 200,
    maximumHealth: 36,
    contactDamage: 6,
    attackCooldownSeconds: 2.2,
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
  x: 160, y: 0, width: 960, height: 250,
  triggerEnemyId: TUTORIAL_PRACTICE_TARGET_ID,
  enemyIds: Object.freeze(TUTORIAL_COMBAT_ENEMY_DEFINITIONS.map(({ id }) => id)),
});

export const TUTORIAL_BOSS_DEFINITION = Object.freeze({
  id: TUTORIAL_BOSS_ID,
  type: "scrapOverseer",
  bossName: "Schrott-Aufseher",
  x: 544,
  y: -145,
  patrolMinX: 240,
  patrolMaxX: 1040,
  startDirection: 1,
});

export const TUTORIAL_BOSS_ZONE_DEFINITION = Object.freeze({
  id: TUTORIAL_BOSS_ZONE_ID,
  x: 160,
  y: -300,
  width: 960,
  height: 550,
  triggerZoneId: TUTORIAL_COMBAT_ZONE_ID,
  enemyIds: Object.freeze([TUTORIAL_BOSS_ID]),
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
