import { getAssetPath } from "./asset-paths.js";

export const BOSS_ARENA = Object.freeze({
  approachY: 777,
  floorY: 600,
  floorX: 48,
  floorWidth: 1184,
  floorHeight: 96,
  imageX: 0,
  imageY: 16,
  imageWidth: 1280,
  imageHeight: 1280 * 1024 / 1536,
  innerLeftX: 96,
  innerRightX: 1184,
  wallThickness: 48,
  ceilingBottomY: 108,
  roofThickness: 48,
  entranceCenterX: 640,
  entranceWidth: 144,
  triggerBottomY: 720,
});

/** Returns the native Clean-HD arena artwork without geometry distortion. */
export function getBossArenaSpriteConfig() {
  return Object.freeze({
    source: getAssetPath("environment", "moon-warden-arena-clean-hd.png"),
    frameWidth: 1536,
    frameHeight: 1024,
    frameCount: 1,
  });
}

/** Returns the dedicated dark lift used directly below the arena entrance. */
export function getBossEntranceLiftSpriteConfig() {
  return Object.freeze({
    source: getAssetPath(
      "environment", "moon-warden-entry-lift-clean-hd.png",
    ),
    frameWidth: 512,
    frameHeight: 107,
    frameCount: 1,
  });
}

export const WALL_CHALLENGE_ENTRY_OFFSET = 185;
export const WALL_CHALLENGE_EXIT_OFFSET = 185;

const PROFILES = Object.freeze({
  scrapyard: profile({
    accent: "#35e8ef", gaps: [250, 280, 306, 262, 318, 274, 296, 256],
    lanes: [140, 190, 520, 900, 760, 390, 120, 650,
      930, 820, 460, 180, 560, 960, 700, 300],
    widths: [240, 210, 150, 400], precisionEvery: 7, restEvery: 28,
    mechanics: { crane: [31, 19] },
  }),
  factory: profile({
    accent: "#ff9b38", gaps: [305, 335, 315, 350, 308, 328, 342, 296],
    lanes: [880, 930, 620, 250, 100, 470, 850, 690,
      310, 150, 720, 980, 600, 220, 450, 900],
    widths: [220, 190, 132, 360], precisionEvery: 5, restEvery: 38,
    mechanics: { trap: [12, 5], crane: [23, 14] },
  }),
  "launch-tower": profile({
    accent: "#4ce8ff", gaps: [326, 350, 336, 348, 332, 346],
    lanes: [120, 360, 650, 920, 700, 430, 180, 480, 790, 980, 730, 390],
    widths: [205, 176, 118, 330], precisionEvery: 4, restEvery: 36,
    mechanics: { falling: [11, 4], spring: [28, 17] },
  }),
  "space-station": profile({
    accent: "#77efff", gaps: [342, 370, 356, 368, 364, 338],
    lanes: [900, 650, 370, 120, 350, 640, 930, 720, 440, 180, 500, 820, 1020, 760],
    widths: [188, 158, 104, 300], precisionEvery: 3, restEvery: 46,
    mechanics: { falling: [11, 3], trap: [15, 8], spring: [21, 13] },
  }),
  moon: profile({
    accent: "#9aefff", gaps: [358, 386, 372, 384, 382, 350],
    lanes: [100, 320, 560, 830, 1050, 810, 540, 280, 80, 350, 650, 940, 720, 430],
    widths: [172, 142, 92, 280], precisionEvery: 3, restEvery: 54,
    mechanics: { falling: [9, 3], trap: [11, 7], spring: [15, 13] },
  }),
});

/**
 * Returns the immutable jump profile for one biome.
 * @param {string} biomeId Biome whose route profile should be returned.
 */
export function getProgressionProfile(biomeId) {
  const result = PROFILES[biomeId];
  if (result) return result;
  throw new RangeError(`Unknown progression biome: ${biomeId}`);
}

/**
 * Freezes a progression profile and copies its nested collections.
 * @param {object} data Raw spacing, lane, platform, and mechanic values.
 */
function profile(data) {
  return Object.freeze({
    ...data,
    gaps: Object.freeze([...data.gaps]),
    lanes: Object.freeze([...data.lanes]),
    widths: Object.freeze([...data.widths]),
    mechanics: Object.freeze({ ...data.mechanics }),
  });
}
