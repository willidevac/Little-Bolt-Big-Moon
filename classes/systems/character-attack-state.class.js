/**
 * Stores only Byte's short attack animation state.
 */
export class CharacterAttackState {
  /** Creates an inactive attack state. */
  constructor() {
    this.animationState = null;
    this.secondsRemaining = 0;
  }

  /**
   * Starts a new attack animation when none is already running.
   * @param {string} animationState
   * @param {number} durationSeconds
   * @returns {boolean}
   */
  start(animationState, durationSeconds) {
    this.#validateAttack(animationState, durationSeconds);
    if (this.isActive) return false;
    this.animationState = animationState;
    this.secondsRemaining = durationSeconds;
    return true;
  }

  /**
   * Reduces the remaining animation time.
   * @param {number} deltaTimeSeconds
   */
  update(deltaTimeSeconds) {
    if (!this.isActive || !Number.isFinite(deltaTimeSeconds)) return;
    this.secondsRemaining = Math.max(0, this.secondsRemaining - deltaTimeSeconds);
    if (this.secondsRemaining === 0) this.clear();
  }

  /**
   * Immediately ends an active attack animation.
   */
  clear() {
    this.animationState = null;
    this.secondsRemaining = 0;
  }

  /**
   * Indicates whether an attack animation is currently running.
   * @returns {boolean}
   */
  get isActive() {
    return this.animationState !== null;
  }

  #validateAttack(animationState, durationSeconds) {
    const hasState = animationState === "melee" || animationState === "shoot";
    const hasDuration = Number.isFinite(durationSeconds) && durationSeconds > 0;
    if (hasState && hasDuration) return;
    throw new TypeError("Die Angriffsanimation ist ungültig.");
  }
}
