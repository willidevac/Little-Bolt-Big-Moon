import { getAssetPath } from "./asset-paths.js";

const LOOP = Object.freeze({
  startFrame: 0,
  frameCount: 4,
  frameDurationSeconds: 0.14,
  loop: true,
});

/** Visual contract for the original tutorial-only Scrap Overseer. */
export const SCRAP_OVERSEER_VISUAL_CONFIG = Object.freeze({
  sprite: Object.freeze({
    source: getAssetPath("enemies", "scrap-overseer-clean-hd.png"),
    frameWidth: 192,
    frameHeight: 160,
    frameCount: 4,
  }),
  renderScale: 1,
  nativeFacingDirection: 1,
  collisionBox: Object.freeze({
    offsetX: 30,
    offsetY: 18,
    width: 132,
    height: 126,
  }),
  initialState: "idle",
  initialAttackState: "attack",
  animations: Object.freeze({
    idle: LOOP,
    move: LOOP,
    attack: LOOP,
    hurt: Object.freeze({
      startFrame: 2, frameCount: 1, frameDurationSeconds: 0.12, loop: false,
    }),
    dead: Object.freeze({
      startFrame: 3, frameCount: 1, frameDurationSeconds: 0.3, loop: false,
    }),
  }),
});
