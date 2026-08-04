import { getAssetPath } from "./asset-paths.js";

export const WALL_WIDTH = 48;
export const WALL_TILE_HEIGHT = 512;
export const START_FLOOR_Y = 149904;

const BIOME_PROFILES = Object.freeze({
  scrapyard: createProfile(432, [240, 224, 208, 192], 128),
  factory: createProfile(424, [224, 208, 192, 176], 120),
  "launch-tower": createProfile(424, [208, 192, 176, 160], 112),
  "space-station": createProfile(424, [192, 176, 160, 144], 104),
  moon: createProfile(424, [176, 160, 144, 128], 96),
});

/** Sparse late-game shafts that teach increasingly tight wall rebounds. */
export const WALL_BOUNCE_CHALLENGES = Object.freeze([
  createChoke("launch-rebound-shaft", "launch-tower", 76000, 1800,
    240, 992, "left", 980, 1180),
  createChoke("station-rebound-lock-1", "space-station", 48000, 2000,
    320, 912, "right", 920, 1120),
  createChoke("station-rebound-lock-2", "space-station", 35500, 2200,
    360, 872, "left", 900, 1100),
  createChoke("moon-rebound-lock-1", "moon", 22000, 2200,
    380, 852, "right", 880, 1080),
  createChoke("moon-rebound-lock-2", "moon", 11000, 2400,
    400, 832, "left", 860, 1060),
  createChoke("moon-rebound-lock-3", "moon", 3000, 2600,
    420, 812, "right", 840, 1040),
]);

/** Returns the new animated wall sprite-sheet definition for one biome. */
export function getWallSpriteConfig(biomeId) {
  assertBiome(biomeId);
  return Object.freeze({
    source: getAssetPath("environment", `${biomeId}-wall-clean-hd.png`),
    frameWidth: 96,
    frameHeight: 1024,
    frameCount: 4,
  });
}

/** Returns the new wall-mounted platform sprite definition for one biome. */
export function getWallPlatformSpriteConfig(biomeId) {
  assertBiome(biomeId);
  return Object.freeze({
    source: getAssetPath(
      "environment", `${biomeId}-wall-platform-clean-hd.png`,
    ),
    frameWidth: 512,
    frameHeight: 102,
    frameCount: 1,
  });
}

/** Returns one native extra-wide combat platform without runtime stretching. */
export function getCombatPlatformSpriteConfig(biomeId) {
  assertBiome(biomeId);
  const frameHeight = COMBAT_PLATFORM_HEIGHTS[biomeId];
  return Object.freeze({
    source: getAssetPath(
      "environment", `${biomeId}-combat-platform-clean-hd.png`,
    ),
    frameWidth: 1024,
    frameHeight,
    frameCount: 1,
  });
}

/** Returns the safe scrapyard floor sprite definition. */
export function getStartFloorSpriteConfig() {
  return Object.freeze({
    source: getAssetPath("environment", "scrapyard-floor-clean-hd.png"),
    frameWidth: 1280,
    frameHeight: 96,
    frameCount: 1,
  });
}

/** Returns one new sprite definition for the scrapyard route prototype. */
export function getScrapyardPrototypePlatformSpriteConfig(role) {
  const config = SCRAPYARD_PROTOTYPE_PLATFORM_SPRITES[role];
  if (!config) throw new RangeError(`Unknown scrapyard platform role: ${role}`);
  return config;
}

/** Returns the rare wall-feature dimensions for one biome. */
export function getWallFeatureProfile(biomeId) {
  assertBiome(biomeId);
  return BIOME_PROFILES[biomeId];
}

function createProfile(crossWidth, standardWidths, smallWidth) {
  return Object.freeze({
    crossWidth,
    standardWidths: Object.freeze([...standardWidths]),
    smallWidth,
  });
}

function createChoke(id, biomeId, y, height, leftX, rightX, entrySide,
  reboundHorizontalSpeedPixelsPerSecond,
  reboundVerticalSpeedPixelsPerSecond) {
  return Object.freeze({
    id, biomeId, y, height, leftX, rightX, entrySide,
    corridorWidth: rightX - leftX - WALL_WIDTH,
    reboundHorizontalSpeedPixelsPerSecond,
    reboundVerticalSpeedPixelsPerSecond,
    reboundControlSeconds: 0.9,
    reboundReleasedVerticalRatio: 0.52,
    reboundDropVerticalRatio: 0.18,
    exitTargetCenterX: 640,
    exitTargetSurfaceY: y - 185,
    exitAssistBandPixels: 120,
    exitAssistVerticalSpeedPixelsPerSecond: 1280,
    exitAssistMaximumHorizontalSpeedPixelsPerSecond: 520,
    exitAssistControlSeconds: 0.45,
  });
}

function assertBiome(biomeId) {
  if (BIOME_PROFILES[biomeId]) return;
  throw new RangeError(`Unknown wall-course biome: ${biomeId}`);
}

const SCRAPYARD_PROTOTYPE_PLATFORM_SPRITES = Object.freeze({
  precision: platformSprite("precision", 192, 103),
  standard: platformSprite("standard", 384, 93),
  launch: platformSprite("launch", 512, 87),
  rest: platformSprite("rest", 640, 175),
  rescue: platformSprite("rescue", 320, 88),
});

const COMBAT_PLATFORM_HEIGHTS = Object.freeze({
  scrapyard: 182,
  factory: 175,
  "launch-tower": 231,
  "space-station": 185,
  moon: 213,
});

function platformSprite(role, frameWidth, frameHeight) {
  return Object.freeze({
    source: getAssetPath(
      "environment", `scrapyard-platform-${role}-clean-hd.png`,
    ),
    frameWidth,
    frameHeight,
    frameCount: 1,
  });
}
