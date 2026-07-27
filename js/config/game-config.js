const CANVAS_CONFIG = Object.freeze({
  width: 1280,
  height: 720,
});

const WORLD_CONFIG = Object.freeze({
  width: 1280,
  height: 8000,
  deathZoneOffsetPixels: 128,
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
  movementStateThresholdPixelsPerSecond: 1,
  sleepAfterInactivitySeconds: 15,
});

const COMBAT_CONFIG = Object.freeze({
  invulnerabilitySeconds: 1,
  hurtStateSeconds: 0.25,
  knockbackHorizontalPixelsPerSecond: 420,
  knockbackVerticalPixelsPerSecond: 460,
});

const WEAPON_DEFINITIONS = Object.freeze({
  repairWrench: Object.freeze({
    id: "repairWrench",
    name: "Reparaturschlüssel",
    type: "melee",
    damage: 25,
    cooldownSeconds: 0.45,
    ammoCost: 0,
    animationState: "melee",
    animationDurationSeconds: 0.32,
    attackWidth: 44,
    attackHeight: 32,
    attackOffsetY: 32,
  }),
  boltThrower: Object.freeze({
    id: "boltThrower",
    name: "Bolzenwerfer",
    type: "projectile",
    damage: 18,
    cooldownSeconds: 0.28,
    ammoCost: 1,
    animationState: "shoot",
    animationDurationSeconds: 0.18,
    attackWidth: 16,
    attackHeight: 8,
    attackOffsetY: 26,
  }),
});

const WEAPONS_CONFIG = Object.freeze({
  order: Object.freeze(["repairWrench", "boltThrower"]),
  definitions: WEAPON_DEFINITIONS,
});

const PROJECTILE_CONFIG = Object.freeze({
  playerBolt: Object.freeze({
    speedPixelsPerSecond: 900,
    lifetimeSeconds: 1.6,
    worldPaddingPixels: 64,
    animationFrameDurationSeconds: 0.08,
  }),
});

const CAMERA_CONFIG = Object.freeze({
  deadZoneTopPixels: 216,
  deadZoneBottomPixels: 504,
  upwardFollowSpeedPixelsPerSecond: 900,
  downwardFollowSpeedPixelsPerSecond: 1400,
});

const HUD_CONFIG = Object.freeze({
  maximumEnergy: 100,
  startingEnergy: 100,
  startingAmmo: 0,
  startingGears: 0,
  startingScore: 0,
  heightPixelsPerMeter: 4,
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
  combat: COMBAT_CONFIG,
  weapons: WEAPONS_CONFIG,
  projectiles: PROJECTILE_CONFIG,
  camera: CAMERA_CONFIG,
  hud: HUD_CONFIG,
  debug: DEBUG_CONFIG,
});
