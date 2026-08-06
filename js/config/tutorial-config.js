export const TUTORIAL_STEP_IDS = Object.freeze({
  MOVEMENT: "movement",
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
