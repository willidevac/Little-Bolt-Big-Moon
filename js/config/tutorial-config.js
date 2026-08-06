export const TUTORIAL_STEP_IDS = Object.freeze({
  MOVEMENT: "movement",
  RESOURCES: "resources",
  SHORT_JUMP: "shortJump",
  CHARGED_JUMP: "chargedJump",
  WALL_REBOUND: "wallRebound",
  PLATFORM_MECHANICS: "platformMechanics",
  WEAPON_PICKUP: "weaponPickup",
  PRACTICE_TARGET: "practiceTarget",
  COMBAT: "combat",
  COMPLETED: "completed",
});

export const TUTORIAL_STEP_ORDER = Object.freeze([
  TUTORIAL_STEP_IDS.MOVEMENT,
  TUTORIAL_STEP_IDS.RESOURCES,
  TUTORIAL_STEP_IDS.SHORT_JUMP,
  TUTORIAL_STEP_IDS.CHARGED_JUMP,
  TUTORIAL_STEP_IDS.WALL_REBOUND,
  TUTORIAL_STEP_IDS.PLATFORM_MECHANICS,
  TUTORIAL_STEP_IDS.WEAPON_PICKUP,
  TUTORIAL_STEP_IDS.PRACTICE_TARGET,
  TUTORIAL_STEP_IDS.COMBAT,
  TUTORIAL_STEP_IDS.COMPLETED,
]);

export const TUTORIAL_JUMP_THRESHOLDS = Object.freeze({
  shortMaximumPercent: 35,
  chargedMinimumPercent: 80,
});

export const TUTORIAL_PLATFORM_MECHANICS = Object.freeze([
  "spring", "falling", "trap",
]);

export const TUTORIAL_WEAPON_ID = "boltThrower";
export const TUTORIAL_RESOURCE_PICKUP_TYPES = Object.freeze([
  "gear", "energy",
]);
export const TUTORIAL_PRACTICE_TARGET_ID = "tutorial-practice-target";
export const TUTORIAL_COMBAT_ZONE_ID = "tutorial-combat-zone";

export const TUTORIAL_CHECKPOINTS = Object.freeze({
  movement: Object.freeze({ x: 560, y: 1353 }),
  resources: Object.freeze({ x: 560, y: 1353 }),
  chargedJump: Object.freeze({ x: 180, y: 1135 }),
  wallRebound: Object.freeze({ x: 650, y: 915 }),
  weaponPickup: Object.freeze({ x: 160, y: 255 }),
  practiceTarget: Object.freeze({ x: 500, y: 35 }),
  combat: Object.freeze({ x: 500, y: 35 }),
});
