const STATE_TIME_EPSILON_SECONDS = 1e-9;

/**
 * Derives Byte's visible state from combat, jumping, and movement.
 * @param {Readonly<object>} character Character state and motion to evaluate.
 * @param {Readonly<object>} config Animation-state thresholds and timing.
 * @param {Readonly<object>} states Stable visual-state identifiers.
 * @returns {string}
 */
export function resolveCharacterState(character, config, states) {
  const threshold = config.movementStateThresholdPixelsPerSecond;
  if (character.isDead) return states.DEAD;
  if (character.isHurt) return states.HURT;
  if (character.attackState.isActive) return character.attackState.animationState;
  if (character.jumpController.isCharging) return states.JUMP;
  if (character.velocityY < -threshold) return states.JUMP;
  if (!character.isOnGround || character.velocityY > threshold) return states.FALL;
  if (Math.abs(character.velocityX) > threshold) return states.RUN;
  return isSleeping(character, config) ? states.SLEEP : states.IDLE;
}

/**
 * Checks whether character inactivity reached the sleep threshold.
 * @param {Readonly<object>} character Character inactivity state to evaluate.
 * @param {Readonly<object>} config Configuration containing the sleep threshold.
 */
function isSleeping(character, config) {
  const inactivity = character.inactivitySeconds + STATE_TIME_EPSILON_SECONDS;
  return inactivity >= config.sleepAfterInactivitySeconds;
}
