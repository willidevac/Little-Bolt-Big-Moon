const STATE_TIME_EPSILON_SECONDS = 1e-9;

/**
 * Derives Byte's visible state from combat, jumping, and movement.
 * @param {Readonly<object>} character
 * @param {Readonly<object>} config
 * @param {Readonly<object>} states
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

/** Checks the sleeping condition. */
function isSleeping(character, config) {
  const inactivity = character.inactivitySeconds + STATE_TIME_EPSILON_SECONDS;
  return inactivity >= config.sleepAfterInactivitySeconds;
}
