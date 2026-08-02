/**
 * Manages health, attack cooldowns, and timed enemy states.
 */
export class EnemyCombatState {
  #maximumHealth;
  #health;
  #contactDamage;
  #attackCooldownSeconds;
  #defaultAttackState;
  #hurtStateSeconds;
  #attackStateSeconds;
  #deathStateSeconds;
  #hurtSecondsRemaining;
  #attackSecondsRemaining;
  #deathSecondsRemaining;
  #attackCooldownSecondsRemaining;
  #attackAnimationState;
  #isDead;

  /**
   * @param {Readonly<object>} config
   * @param {Readonly<Record<string, Readonly<object>>>} animations
   * @param {string} defaultAttackState
   */
  constructor(config, animations, defaultAttackState) {
    this.#validateConfig(config);
    this.#validateAttackState(animations, defaultAttackState);
    this.#maximumHealth = config.maximumHealth;
    this.#contactDamage = config.contactDamage;
    this.#attackCooldownSeconds = config.attackCooldownSeconds;
    this.#defaultAttackState = defaultAttackState;
    this.#setStateDurations(animations);
    this.#reset();
  }

  /** @returns {number} Current health. */
  get health() { return this.#health; }

  /** @returns {number} Maximum health. */
  get maximumHealth() { return this.#maximumHealth; }

  /** @returns {boolean} Whether the enemy was defeated. */
  get isDead() { return this.#isDead; }

  /** @returns {boolean} Whether the hurt state is active. */
  get isHurt() { return this.#hurtSecondsRemaining > 0; }

  /** @returns {boolean} Whether the death animation has finished. */
  get isReadyForRemoval() {
    return this.#isDead && this.#deathSecondsRemaining === 0;
  }

  /** @returns {number} Remaining attack cooldown in seconds. */
  get attackCooldownSecondsRemaining() {
    return this.#attackCooldownSecondsRemaining;
  }

  /** @returns {number} Remaining attack animation time in seconds. */
  get attackSecondsRemaining() { return this.#attackSecondsRemaining; }

  /** @returns {number} Duration of the default attack in seconds. */
  get attackStateSeconds() { return this.#attackStateSeconds; }

  /** @returns {string} Name of the default attack. */
  get defaultAttackState() { return this.#defaultAttackState; }

  /** @returns {boolean} Whether an attack may begin. */
  get canAttack() {
    return !this.#isDead && !this.isHurt &&
      this.#attackCooldownSecondsRemaining === 0;
  }

  /**
   * Updates all timers and returns the locked animation state.
   * @param {number} deltaTimeSeconds
   * @returns {string|null}
   */
  update(deltaTimeSeconds) {
    if (!Number.isFinite(deltaTimeSeconds) || deltaTimeSeconds <= 0) return null;
    this.#attackCooldownSecondsRemaining = Math.max(
      0,
      this.#attackCooldownSecondsRemaining - deltaTimeSeconds,
    );
    const lockedState = this.#getLockedState();
    if (lockedState) this.#reduceStateTimer(lockedState, deltaTimeSeconds);
    return lockedState;
  }

  /**
   * Reduces health and reports the new hurt or death state.
   * @param {Readonly<{amount:number}>} hit
   * @returns {"hurt"|"dead"|null}
   */
  receiveHit(hit) {
    if (this.#isDead) return null;
    this.#validateHit(hit);
    this.#health = Math.max(0, this.#health - hit.amount);
    if (this.#health === 0) {
      this.#die();
      return "dead";
    }
    this.#hurtSecondsRemaining = this.#hurtStateSeconds;
    return "hurt";
  }

  /**
   * Starts an existing attack clip with a shared cooldown.
   * @param {string} animationState
   * @param {Readonly<object>} clip
   * @returns {boolean}
   */
  startAttack(animationState, clip) {
    if (!this.canAttack) return false;
    this.#attackSecondsRemaining = this.#getAnimationDuration(clip);
    this.#attackCooldownSecondsRemaining = this.#attackCooldownSeconds;
    this.#attackAnimationState = animationState;
    return true;
  }

  /**
   * Replaces the attack cooldown with a validated duration.
   * @param {number} seconds
   */
  setAttackCooldown(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) {
      throw new TypeError("Die Angriffssperre des Gegners ist ungültig.");
    }
    this.#attackCooldownSecondsRemaining = seconds;
  }

  /**
   * Creates an immutable contact hit.
   * @param {string} source
   * @param {number} direction
   * @returns {Readonly<{amount:number,direction:number,source:string}>}
   */
  createContactHit(source, direction) {
    const hasSource = typeof source === "string" && source.length > 0;
    const hasDirection = Number.isFinite(direction) && Math.abs(direction) === 1;
    if (!hasSource || !hasDirection) {
      throw new TypeError("Der Kontakttreffer des Gegners ist ungültig.");
    }
    return Object.freeze({ amount: this.#contactDamage, direction, source });
  }

  #setStateDurations(animations) {
    this.#hurtStateSeconds = this.#getAnimationDuration(animations.hurt);
    this.#attackStateSeconds = this.#getAnimationDuration(
      animations[this.#defaultAttackState],
    );
    this.#deathStateSeconds = this.#getAnimationDuration(animations.dead);
  }

  #reset() {
    this.#health = this.#maximumHealth;
    this.#hurtSecondsRemaining = 0;
    this.#attackSecondsRemaining = 0;
    this.#deathSecondsRemaining = 0;
    this.#attackCooldownSecondsRemaining = 0;
    this.#attackAnimationState = this.#defaultAttackState;
    this.#isDead = false;
  }

  #getLockedState() {
    if (this.#isDead) return "dead";
    if (this.isHurt) return "hurt";
    if (this.#attackSecondsRemaining > 0) return this.#attackAnimationState;
    return null;
  }

  #reduceStateTimer(state, deltaTimeSeconds) {
    if (state === "dead") return this.#reduceDeathTimer(deltaTimeSeconds);
    if (state === "hurt") return this.#reduceHurtTimer(deltaTimeSeconds);
    this.#attackSecondsRemaining = this.#reduce(
      this.#attackSecondsRemaining,
      deltaTimeSeconds,
    );
  }

  #reduceDeathTimer(deltaTimeSeconds) {
    this.#deathSecondsRemaining = this.#reduce(
      this.#deathSecondsRemaining,
      deltaTimeSeconds,
    );
  }

  #reduceHurtTimer(deltaTimeSeconds) {
    this.#hurtSecondsRemaining = this.#reduce(
      this.#hurtSecondsRemaining,
      deltaTimeSeconds,
    );
  }

  #reduce(value, deltaTimeSeconds) {
    return Math.max(0, value - deltaTimeSeconds);
  }

  #die() {
    this.#isDead = true;
    this.#hurtSecondsRemaining = 0;
    this.#attackSecondsRemaining = 0;
    this.#deathSecondsRemaining = this.#deathStateSeconds;
  }

  #getAnimationDuration(clip) {
    const values = [clip?.frameCount, clip?.frameDurationSeconds];
    if (values.every((value) => Number.isFinite(value) && value > 0)) {
      return clip.frameCount * clip.frameDurationSeconds;
    }
    throw new TypeError("Der Gegner-Kampfzustand hat keine gültige Animation.");
  }

  #validateConfig(config) {
    const values = [
      config?.maximumHealth,
      config?.contactDamage,
      config?.attackCooldownSeconds,
    ];
    if (values.every((value) => Number.isFinite(value) && value > 0)) return;
    throw new TypeError("Die Kampfwerte des Gegners sind ungültig.");
  }

  #validateAttackState(animations, defaultAttackState) {
    if (animations?.hurt && animations?.dead && animations[defaultAttackState]) {
      return;
    }
    throw new RangeError(`Unbekannter Standardangriff: ${defaultAttackState}`);
  }

  #validateHit(hit) {
    if (Number.isFinite(hit?.amount) && hit.amount > 0) return;
    throw new TypeError("Der Gegnertreffer ist ungültig.");
  }
}
