const CANVAS_CONFIG = Object.freeze({
  width: 1280,
  height: 720,
});

const WORLD_CONFIG = Object.freeze({
  width: 1280,
  height: 8000,
});

const TIMING_CONFIG = Object.freeze({
  targetFramesPerSecond: 60,
  maximumDeltaTimeMilliseconds: 100,
});

const PHYSICS_CONFIG = Object.freeze({
  gravityPixelsPerSecondSquared: 2200,
  maximumFallSpeedPixelsPerSecond: 1200,
  platformLandingTolerancePixels: 1,
});

const CHARACTER_CONFIG = Object.freeze({
  horizontalAccelerationPixelsPerSecondSquared: 1800,
  horizontalBrakingPixelsPerSecondSquared: 2400,
  maximumHorizontalSpeedPixelsPerSecond: 300,
  jumpSpeedPixelsPerSecond: 800,
  jumpReleaseSpeedPixelsPerSecond: 320,
  coyoteTimeSeconds: 0.1,
  jumpBufferSeconds: 0.12,
});

const DEBUG_CONFIG = Object.freeze({
  enabled: false,
  showCollisionBoxes: false,
  showCameraBounds: false,
  showFramesPerSecond: false,
});

export const GAME_CONFIG = Object.freeze({
  canvas: CANVAS_CONFIG,
  world: WORLD_CONFIG,
  timing: TIMING_CONFIG,
  physics: PHYSICS_CONFIG,
  character: CHARACTER_CONFIG,
  debug: DEBUG_CONFIG,
});
