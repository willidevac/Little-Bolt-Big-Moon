/**
 * Verwaltet Leben, Angriffssperren und zeitgesteuerte Gegnerzustände.
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

  /** @returns {number} Aktuelle Lebenspunkte. */
  get health() { return this.#health; }

  /** @returns {number} Maximale Lebenspunkte. */
  get maximumHealth() { return this.#maximumHealth; }

  /** @returns {boolean} Ob der Gegner besiegt wurde. */
  get isDead() { return this.#isDead; }

  /** @returns {boolean} Ob der Trefferzustand aktiv ist. */
  get isHurt() { return this.#hurtSecondsRemaining > 0; }

  /** @returns {boolean} Ob die Todesanimation abgeschlossen ist. */
  get isReadyForRemoval() {
    return this.#isDead && this.#deathSecondsRemaining === 0;
  }

  /** @returns {number} Verbleibende Angriffssperre in Sekunden. */
  get attackCooldownSecondsRemaining() {
    return this.#attackCooldownSecondsRemaining;
  }

  /** @returns {number} Verbleibende Angriffsanimation in Sekunden. */
  get attackSecondsRemaining() { return this.#attackSecondsRemaining; }

  /** @returns {number} Dauer des Standardangriffs in Sekunden. */
  get attackStateSeconds() { return this.#attackStateSeconds; }

  /** @returns {string} Name des Standardangriffs. */
  get defaultAttackState() { return this.#defaultAttackState; }

  /** @returns {boolean} Ob ein Angriff beginnen darf. */
  get canAttack() {
    return !this.#isDead && !this.isHurt &&
      this.#attackCooldownSecondsRemaining === 0;
  }

  /**
   * Aktualisiert alle Timer und liefert den gesperrten Animationszustand.
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
   * Zieht Leben ab und meldet den neuen Treffer- oder Todeszustand.
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
   * Startet einen vorhandenen Angriffsclip mit gemeinsamem Cooldown.
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
   * Ersetzt die Angriffssperre durch eine geprüfte Dauer.
   * @param {number} seconds
   */
  setAttackCooldown(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) {
      throw new TypeError("Die Angriffssperre des Gegners ist ungültig.");
    }
    this.#attackCooldownSecondsRemaining = seconds;
  }

  /**
   * Erstellt einen unveränderlichen Kontakttreffer.
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
