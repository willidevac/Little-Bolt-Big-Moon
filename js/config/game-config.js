import { getAssetPath } from "./asset-paths.js";

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
  boss: Object.freeze({
    shockwave: Object.freeze({
      speedPixelsPerSecond: 520,
      lifetimeSeconds: 1.6,
      worldPaddingPixels: 64,
      animationFrameDurationSeconds: 0.08,
    }),
    moonBolt: Object.freeze({
      speedPixelsPerSecond: 430,
      lifetimeSeconds: 2.4,
      worldPaddingPixels: 64,
      animationFrameDurationSeconds: 0.09,
    }),
  }),
});

const ENEMY_CONFIG = Object.freeze({
  scrapCrawler: Object.freeze({
    speedPixelsPerSecond: 58,
    maximumHealth: 50,
    contactDamage: 15,
    attackCooldownSeconds: 1.1,
  }),
  droneGuard: Object.freeze({
    speedPixelsPerSecond: 86,
    hoverAmplitudePixels: 12,
    hoverCyclesPerSecond: 0.45,
    verticalTrackingSpeedPixelsPerSecond: 96,
    verticalTrackingRangePixels: 120,
    maximumHealth: 36,
    contactDamage: 20,
    attackCooldownSeconds: 1.4,
  }),
  moonWarden: Object.freeze({
    speedPixelsPerSecond: 72,
    maximumHealth: 400,
    contactDamage: 25,
    attackCooldownSeconds: 2.4,
    activationDistancePixels: 760,
    movementStopDistancePixels: 176,
    attackReleaseSeconds: 0.3,
    shockwaveDamage: 25,
    moonBoltDamage: 18,
  }),
});

const ENEMY_COMBAT_CONFIG = Object.freeze({
  stompDamage: 30,
  stompBounceSpeedPixelsPerSecond: 620,
});

const CAMERA_CONFIG = Object.freeze({
  deadZoneTopPixels: 216,
  deadZoneBottomPixels: 504,
  upwardFollowSpeedPixelsPerSecond: 900,
  downwardFollowSpeedPixelsPerSecond: 1400,
});

const SCORE_CONFIG = Object.freeze({
  pointsPerHeightMeter: 10,
  pointsPerGear: 250,
  pointsPerCombatPhase: 1500,
  pointsPerRemainingEnergy: 10,
  targetTimeSeconds: 600,
  pointsPerSavedSecond: 5,
  enemyPoints: Object.freeze({
    scrapCrawler: 750,
    droneGuard: 1000,
    moonWarden: 5000,
  }),
});

const HUD_CONFIG = Object.freeze({
  maximumEnergy: 100,
  maximumAmmo: 12,
  startingEnergy: 100,
  startingAmmo: 0,
  startingGears: 0,
  startingScore: 0,
  heightPixelsPerMeter: 4,
  scoring: SCORE_CONFIG,
});

const DEBUG_CONFIG = Object.freeze({
  enabled: false,
  showCollisionBoxes: false,
  showCameraBounds: false,
  showFramesPerSecond: false,
});

const STORAGE_CONFIG = Object.freeze({
  key: "little-bolt-big-moon",
  version: 1,
});

const createMusic = (fileName, volume) => Object.freeze({
  source: getAssetPath("audio", `music/${fileName}`),
  volume,
});

const createEffect = (
  fileName,
  volume,
  maximumVoices = 2,
  minimumIntervalMilliseconds = 80,
) => Object.freeze({
  source: getAssetPath("audio", `sfx/${fileName}`),
  volume,
  maximumVoices,
  minimumIntervalMilliseconds,
});

const AUDIO_CONFIG = Object.freeze({
  music: Object.freeze({
    climb: createMusic("climb-loop.wav", 0.24),
    boss: createMusic("boss-loop.wav", 0.28),
  }),
  effects: Object.freeze({
    jump: createEffect("byte-jump.wav", 0.58, 2, 100),
    land: createEffect("byte-land.wav", 0.5, 2, 120),
    wrench: createEffect("wrench-swing.wav", 0.58, 2, 180),
    bolt: createEffect("bolt-shot.wav", 0.55, 3, 100),
    hurt: createEffect("byte-hurt.wav", 0.6, 1, 700),
    lose: createEffect("game-lose.wav", 0.58, 1, 1_000),
    pickupGear: createEffect("pickup-gear.wav", 0.5, 2, 100),
    pickupEnergy: createEffect("pickup-energy.wav", 0.5, 2, 100),
    pickupAmmo: createEffect("pickup-ammo.wav", 0.5, 2, 100),
    enemyHit: createEffect("enemy-hit.wav", 0.5, 3, 80),
    enemyDeath: createEffect("enemy-death.wav", 0.55, 2, 120),
    bossAttack: createEffect("boss-attack.wav", 0.58, 2, 180),
    bossPhase: createEffect("boss-phase.wav", 0.58, 1, 500),
    bossDeath: createEffect("boss-death.wav", 0.62, 1, 1_000),
    waveComplete: createEffect("wave-complete.wav", 0.52, 1, 500),
    win: createEffect("game-win.wav", 0.58, 1, 1_000),
  }),
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
  enemies: ENEMY_CONFIG,
  enemyCombat: ENEMY_COMBAT_CONFIG,
  camera: CAMERA_CONFIG,
  hud: HUD_CONFIG,
  storage: STORAGE_CONFIG,
  audio: AUDIO_CONFIG,
  debug: DEBUG_CONFIG,
});
