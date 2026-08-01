import { getAssetPath } from "./asset-paths.js";

export const BYTE_SPRITE_CONFIG = Object.freeze({
  source: getAssetPath("characters", "byte-clean-hd.png"),
  frameWidth: 64,
  frameHeight: 64,
  frameCount: 33,
});
export const BYTE_RENDER_SCALE = 1;
export const BYTE_HURTBOX = Object.freeze({
  offsetX: 12,
  offsetY: 6,
  width: 40,
  height: 58,
});
export const BYTE_STOMP_BOX = Object.freeze({
  offsetX: 16, offsetY: 50, width: 32, height: 14,
});

export const CHARACTER_STATES = Object.freeze({
  IDLE: "idle",
  RUN: "run",
  JUMP: "jump",
  FALL: "fall",
  MELEE: "melee",
  SHOOT: "shoot",
  HURT: "hurt",
  SLEEP: "sleep",
  DEAD: "dead",
});

const createAnimationClip = (
  startFrame,
  frameCount,
  frameDurationSeconds,
  loop = true,
) => Object.freeze({ startFrame, frameCount, frameDurationSeconds, loop });

export const BYTE_ANIMATION_CLIPS = Object.freeze({
  [CHARACTER_STATES.IDLE]: createAnimationClip(0, 4, 0.18),
  [CHARACTER_STATES.RUN]: createAnimationClip(4, 6, 0.08),
  [CHARACTER_STATES.JUMP]: createAnimationClip(10, 1, 1),
  [CHARACTER_STATES.FALL]: createAnimationClip(11, 1, 1),
  [CHARACTER_STATES.MELEE]: createAnimationClip(14, 4, 0.08, false),
  [CHARACTER_STATES.SHOOT]: createAnimationClip(18, 3, 0.06, false),
  [CHARACTER_STATES.HURT]: createAnimationClip(21, 2, 0.1),
  [CHARACTER_STATES.SLEEP]: createAnimationClip(23, 4, 0.3),
  [CHARACTER_STATES.DEAD]: createAnimationClip(27, 6, 0.14, false),
});
