import { getAssetPath } from "./asset-paths.js";

function createVisual(file, frameWidth, frameHeight, glowColor) {
  return Object.freeze({
    sprite: Object.freeze({
      source: getAssetPath("props", file),
      frameWidth,
      frameHeight,
      frameCount: 1,
    }),
    renderScale: 1,
    frameIndex: 0,
    animation: null,
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
