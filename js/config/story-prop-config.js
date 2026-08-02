import { getAssetPath } from "./asset-paths.js";

const STATIC_FRAME = 0;
const COLLECTABLE_TRANSPARENT_BOTTOM_ROWS = Object.freeze([
  4, 3, 4, 4, 17, 17, 17, 17, 21, 4, 3, 3, 3, 3, 3,
]);
const LUMA_TRANSPARENT_BOTTOM_ROWS = Object.freeze([
  4, 2, 2, 2, 2, 4, 4, 5, 3, 3,
]);

function createSprite(source, frameWidth, frameHeight, frameCount = 1) {
  return Object.freeze({ source, frameWidth, frameHeight, frameCount });
}

function createVisual(sprite, options = {}) {
  const renderScale = options.renderScale ?? 2;
  const transparentRows = options.transparentBottomRows ?? [0];
  return Object.freeze({
    sprite,
    renderScale,
    frameIndex: options.frameIndex ?? STATIC_FRAME,
    animation: options.animation ?? null,
    groundOffsets: Object.freeze(
      transparentRows.map((rows) => rows * renderScale),
    ),
  });
}

const SIGNAL_ANIMATION = Object.freeze({
  startFrame: 0,
  frameCount: 4,
  frameDurationSeconds: 0.32,
  loop: true,
});

export const STORY_PROP_CONFIGS = Object.freeze({
  emptyLumaCradle: createVisual(createSprite(
    getAssetPath("props", "empty-luma-cradle.png"),
    96,
    64,
  ), { transparentBottomRows: [7] }),
  factoryDuoPoster: createVisual(createSprite(
    getAssetPath("props", "factory-duo-poster.png"),
    64,
    96,
  )),
  lumaCargoCrate: createVisual(createSprite(
    getAssetPath("props", "luma-cargo-crate.png"),
    64,
    64,
  )),
  lumaBadgeHalf: createVisual(createSprite(
    getAssetPath("items", "collectables-clean-hd.png"),
    64,
    64,
    15,
  ), {
    renderScale: 1,
    frameIndex: 14,
    transparentBottomRows: COLLECTABLE_TRANSPARENT_BOTTOM_ROWS,
  }),
  blueSignalBeacon: createVisual(createSprite(
    getAssetPath("props", "blue-signal-beacon.png"),
    64,
    96,
    4,
  ), {
    animation: SIGNAL_ANIMATION,
    transparentBottomRows: [0, 0, 0, 0],
  }),
  poweredOffLuma: createVisual(createSprite(
    getAssetPath("characters", "luma.png"),
    32,
    32,
    10,
  ), { transparentBottomRows: LUMA_TRANSPARENT_BOTTOM_ROWS }),
});
