/**
 * Manages hurt state, invulnerability, and death for the playable character.
 */
export class CharacterHitState {
  #hurtSecondsRemaining;
  #invulnerabilitySecondsRemaining;
  #isDead;
  #isHurt;

  /** Creates an unharmed and vulnerable starting state. */
  constructor() {
    this.#reset();
  }

  /** @returns {boolean} Whether the character is hurt. */
  get isHurt() { return this.#isHurt; }

  /** @returns {boolean} Whether the character is disabled. */
  get isDead() { return this.#isDead; }

  /** @returns {boolean} Whether another hit is blocked. */
  get isInvulnerable() { return this.#invulnerabilitySecondsRemaining > 0; }

  /** @returns {number} Remaining hurt duration. */
  get hurtSecondsRemaining() { return this.#hurtSecondsRemaining; }

  /** @returns {number} Remaining invulnerability duration. */
  get invulnerabilitySecondsRemaining() {
    return this.#invulnerabilitySecondsRemaining;
  }

  /** @returns {boolean} Whether a new hurt state started. */
  enterHurt() {
    if (this.#isDead || this.#isHurt) return false;
    this.#isHurt = true;
    return true;
  }

  /**
   * Starts the hurt state and invulnerability after a valid hit.
   * @param {number} hurtSeconds Hurt seconds used while receive hit.
   * @param {number} invulnerabilitySeconds Invulnerability seconds used while receive hit.
   * @returns {boolean} Whether the hit was accepted.
   */
  receiveHit(hurtSeconds, invulnerabilitySeconds) {
    this.#validateDurations(hurtSeconds, invulnerabilitySeconds);
    if (this.#isDead || this.isInvulnerable) return false;
    this.#isHurt = true;
    this.#hurtSecondsRemaining = hurtSeconds;
    this.#invulnerabilitySecondsRemaining = invulnerabilitySeconds;
    return true;
  }

  /** @returns {boolean} Whether the hurt state ended. */
  leaveHurt() {
    if (!this.#isHurt || this.#isDead) return false;
    this.#isHurt = false;
    return true;
  }

  /** @returns {boolean} Whether the death state started anew. */
  die() {
    if (this.#isDead) return false;
    this.#isDead = true;
    this.#isHurt = false;
    this.#hurtSecondsRemaining = 0;
    this.#invulnerabilitySecondsRemaining = 0;
    return true;
  }

  /**
   * Updates the hurt and invulnerability timers.
   * @param {number} deltaTimeSeconds Elapsed time since the previous frame, in seconds.
   */
  update(deltaTimeSeconds) {
    if (!Number.isFinite(deltaTimeSeconds) || deltaTimeSeconds <= 0) return;
    this.#hurtSecondsRemaining = this.#reduceTimer(
      this.#hurtSecondsRemaining, deltaTimeSeconds,
    );
    this.#invulnerabilitySecondsRemaining = this.#reduceTimer(
      this.#invulnerabilitySecondsRemaining, deltaTimeSeconds,
    );
    if (this.#hurtSecondsRemaining === 0) this.leaveHurt();
  }

  /**
   * Sets a finite or permanent invulnerability duration.
   * @param {number} seconds Seconds used while set invulnerability.
   */
  setInvulnerability(seconds) {
    const isDuration = Number.isFinite(seconds) && seconds >= 0;
    if (!isDuration && seconds !== Infinity) {
      throw new TypeError("Die Schutzzeit des Charakters ist ungültig.");
    }
    this.#invulnerabilitySecondsRemaining = seconds;
  }

  /**
   * Performs the reduce timer operation.
   * @param {Readonly<object>} timer Timer used while reduce timer.
   * @param {number} deltaTimeSeconds Elapsed time since the previous frame, in seconds.
   */
  #reduceTimer(timer, deltaTimeSeconds) {
    return Math.max(0, timer - deltaTimeSeconds);
  }

  /**
   * Validates durations.
   * @param {number} hurtSeconds Hurt seconds used while validate durations.
   * @param {number} invulnerabilitySeconds Invulnerability seconds used while validate durations.
   */
  #validateDurations(hurtSeconds, invulnerabilitySeconds) {
    const values = [hurtSeconds, invulnerabilitySeconds];
    if (values.every((value) => Number.isFinite(value) && value > 0)) return;
    throw new TypeError("Die Trefferzeiten des Charakters sind ungültig.");
  }

  /** Resets the hit state. */
  #reset() {
    this.#isHurt = false;
    this.#isDead = false;
    this.#hurtSecondsRemaining = 0;
    this.#invulnerabilitySecondsRemaining = 0;
  }
}
