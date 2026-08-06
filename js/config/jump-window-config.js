import { getAssetPath } from "./asset-paths.js";

const PROFILES = Object.freeze({
  factory: profile("factory", {
    ratios: [0.22, 0.47, 0.73],
    openingWidth: 430,
    height: 110,
    animationFrameSeconds: 0.22,
    guidanceColor: "#ff9c42",
    surfaceOffsetRatio: 0.26,
    outerWallRatio: 0.19,
    frameWidth: 1774,
    frameHeight: 221,
    sourceOpeningStart: 0.303,
    sourceOpeningEnd: 0.697,
  }),
  "launch-tower": profile("launch-tower", {
    ratios: [0.18, 0.38, 0.6, 0.82],
    openingWidth: 380,
    height: 112,
    animationFrameSeconds: 0.17,
    guidanceColor: "#53f4f2",
    surfaceOffsetRatio: 0.28,
    outerWallRatio: 0.2,
    frameWidth: 1536,
    frameHeight: 256,
    sourceOpeningStart: 0.318,
    sourceOpeningEnd: 0.68,
  }),
});

/**
 * Returns placement and native sprite geometry for one jump-window biome.
 * @param {string} biomeId Biome whose jump-window profile should be returned.
 */
export function getJumpWindowProfile(biomeId) {
  const result = PROFILES[biomeId];
  if (result) return result;
  throw new RangeError(`Unknown jump-window biome: ${biomeId}`);
}

/** Returns all biomes that intentionally contain jump windows. */
export function getJumpWindowBiomeIds() {
  return Object.freeze(Object.keys(PROFILES));
}

/**
 * Creates an immutable jump-window profile with copied nested collections.
 * @param {string} biomeId Biome represented by the profile.
 * @param {object} data Raw placement, timing, and sprite geometry values.
 */
function profile(biomeId, data) {
  return Object.freeze({
    ...data,
    ratios: Object.freeze([...data.ratios]),
    sprite: Object.freeze({
      source: getAssetPath(
        "environment", `${biomeId}-jump-window-clean-hd.png`,
      ),
      frameWidth: data.frameWidth,
      frameHeight: data.frameHeight,
      frameCount: 4,
    }),
  });
}
