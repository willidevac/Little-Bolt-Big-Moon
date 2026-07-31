import { getAssetPath } from "./asset-paths.js";

const STATIC_FRAME = 0;

function createSprite(source, frameWidth, frameHeight, frameCount = 1) {
  return Object.freeze({ source, frameWidth, frameHeight, frameCount });
}

function createStatic(sprite, renderScale = 2, frameIndex = STATIC_FRAME) {
  return Object.freeze({ sprite, renderScale, frameIndex });
}

const SIGNAL_ANIMATION = Object.freeze({
  startFrame: 0,
  frameCount: 4,
  frameDurationSeconds: 0.32,
  loop: true,
});

export const STORY_PROP_CONFIGS = Object.freeze({
  emptyLumaCradle: createStatic(createSprite(
    getAssetPath("props", "empty-luma-cradle.png"),
    96,
    64,
  )),
  factoryDuoPoster: createStatic(createSprite(
    getAssetPath("props", "factory-duo-poster.png"),
    64,
    96,
  )),
  lumaCargoCrate: createStatic(createSprite(
    getAssetPath("props", "luma-cargo-crate.png"),
    64,
    64,
  )),
  lumaBadgeHalf: createStatic(createSprite(
    getAssetPath("items", "collectables-clean-hd.png"),
    64,
    64,
    15,
  ), 1, 14),
  blueSignalBeacon: Object.freeze({
    sprite: createSprite(
      getAssetPath("props", "blue-signal-beacon.png"),
      64,
      96,
      4,
    ),
    renderScale: 2,
    frameIndex: 0,
    animation: SIGNAL_ANIMATION,
  }),
  poweredOffLuma: createStatic(createSprite(
    getAssetPath("characters", "luma.png"),
    32,
    32,
    10,
  )),
});
