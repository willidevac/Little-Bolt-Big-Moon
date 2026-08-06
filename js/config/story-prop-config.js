import { getAssetPath } from "./asset-paths.js";

/**
 * Creates an immutable visual definition for a story prop.
 * @param {string} file Sprite file below the props asset directory.
 * @param {number} frameWidth Native sprite-frame width in pixels.
 * @param {number} frameHeight Native sprite-frame height in pixels.
 * @param {string} glowColor CSS color used for the discovery glow.
 */
function createVisual(file, frameWidth, frameHeight, glowColor) {
  return Object.freeze({
    sprite: Object.freeze({
      source: getAssetPath("props", file), frameWidth, frameHeight, frameCount: 1,
    }),
    renderScale: 1, frameIndex: 0, animation: null,
    groundOffsets: Object.freeze([4]),
    glowColor,
  });
}

/** Newly drawn, wordless clues that form one chronological visual trail. */
export const STORY_PROP_CONFIGS = Object.freeze({
  abandonedCompanionCradle: createVisual(
    "story-abandoned-cradle-clean-hd.png", 160, 106, "#5ff6ff",
  ),
  sealedLumaTransport: createVisual(
    "story-luma-transport-case-clean-hd.png", 144, 84, "#45eaff",
  ),
  launchTraceConsole: createVisual(
    "story-launch-trace-console-clean-hd.png", 144, 109, "#46e7ff",
  ),
  stationDetentionPod: createVisual(
    "story-detention-pod-clean-hd.png", 160, 164, "#75f4ff",
  ),
  fortressRouteBeacon: createVisual(
    "story-fortress-route-beacon-clean-hd.png", 128, 142, "#9af8ff",
  ),
  lumaContainmentCapsule: createVisual(
    "story-luma-containment-clean-hd.png", 220, 192, "#65efff",
  ),
});

/** Semantic story targets that stay stable when route IDs change. */
export const STORY_PLAN = Object.freeze([
  clue("abandonedCompanionCradle", "scrapyard", 146500,
    "Lumas verlassene Ladestation"),
  clue("sealedLumaTransport", "factory", 116000,
    "Luma wurde durch die Fabrik transportiert"),
  clue("launchTraceConsole", "launch-tower", 86000,
    "Der Transport flog zum Mond"),
  clue("stationDetentionPod", "space-station", 56000,
    "Luma war auf der Station gefangen"),
  clue("fortressRouteBeacon", "moon", 26000,
    "Die Spur führt zur Wächterfestung"),
  clue("lumaContainmentCapsule", "moon", 600,
    "Luma wartet in der Bossarena"),
]);

/**
 * Creates one chronological story clue placement.
 * @param {string} type Story-prop configuration identifier.
 * @param {string} biomeId Biome containing the clue.
 * @param {number} targetY Vertical world position in pixels.
 * @param {string} storyBeat Short narrative meaning of the clue.
 */
function clue(type, biomeId, targetY, storyBeat) {
  return Object.freeze({ type, biomeId, targetY, storyBeat });
}
