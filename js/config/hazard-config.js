export const HAZARD_TYPES = Object.freeze({
  SHOCK_PAD: "shockPad",
  RETRACTABLE_SPIKES: "retractableSpikes",
  PULSE_GATE: "pulseGate",
});

const createClip = (startFrame, frameDurationSeconds) => Object.freeze({
  startFrame,
  frameCount: 4,
  frameDurationSeconds,
  loop: true,
});

const createCollisionBox = (offsetX, offsetY, width, height) => Object.freeze({
  offsetX, offsetY, width, height,
});

export const HAZARD_CONFIGS = Object.freeze({
  [HAZARD_TYPES.SHOCK_PAD]: Object.freeze({
    clip: createClip(4, 0.12),
    dangerousFrames: Object.freeze([4, 5, 6, 7]),
    collisionBox: createCollisionBox(16, 10, 32, 48),
  }),
  [HAZARD_TYPES.RETRACTABLE_SPIKES]: Object.freeze({
    clip: createClip(0, 0.45),
    dangerousFrames: Object.freeze([2, 3]),
    collisionBox: createCollisionBox(6, 18, 52, 40),
  }),
  [HAZARD_TYPES.PULSE_GATE]: Object.freeze({
    clip: createClip(12, 0.55),
    dangerousFrames: Object.freeze([14, 15]),
    collisionBox: createCollisionBox(14, 6, 36, 56),
  }),
});
