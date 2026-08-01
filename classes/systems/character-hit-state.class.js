/**
 * Verwaltet Verletzung, Schutzzeit und Tod des spielbaren Charakters.
 */
export class CharacterHitState {
  #hurtSecondsRemaining;
  #invulnerabilitySecondsRemaining;
  #isDead;
  #isHurt;

  /** Erstellt einen unverletzten und verwundbaren Startzustand. */
  constructor() {
    this.#reset();
  }

  /** @returns {boolean} Ob der Charakter verletzt ist. */
  get isHurt() { return this.#isHurt; }

  /** @returns {boolean} Ob der Charakter ausgeschaltet ist. */
  get isDead() { return this.#isDead; }

  /** @returns {boolean} Ob ein weiterer Treffer blockiert wird. */
  get isInvulnerable() { return this.#invulnerabilitySecondsRemaining > 0; }

  /** @returns {number} Verbleibende Verletzungsdauer. */
  get hurtSecondsRemaining() { return this.#hurtSecondsRemaining; }

  /** @returns {number} Verbleibende Schutzdauer. */
  get invulnerabilitySecondsRemaining() {
    return this.#invulnerabilitySecondsRemaining;
  }

  /** @returns {boolean} Ob ein neuer Verletzungszustand begonnen hat. */
  enterHurt() {
    if (this.#isDead || this.#isHurt) return false;
    this.#isHurt = true;
    return true;
  }

  /**
   * Startet Verletzung und Schutzzeit nach einem gültigen Treffer.
   * @param {number} hurtSeconds
   * @param {number} invulnerabilitySeconds
   * @returns {boolean} Ob der Treffer angenommen wurde.
   */
  receiveHit(hurtSeconds, invulnerabilitySeconds) {
    this.#validateDurations(hurtSeconds, invulnerabilitySeconds);
    if (this.#isDead || this.isInvulnerable) return false;
    this.#isHurt = true;
    this.#hurtSecondsRemaining = hurtSeconds;
    this.#invulnerabilitySecondsRemaining = invulnerabilitySeconds;
    return true;
  }

  /** @returns {boolean} Ob der Verletzungszustand beendet wurde. */
  leaveHurt() {
    if (!this.#isHurt || this.#isDead) return false;
    this.#isHurt = false;
    return true;
  }

  /** @returns {boolean} Ob der Todeszustand neu begonnen hat. */
  die() {
    if (this.#isDead) return false;
    this.#isDead = true;
    this.#isHurt = false;
    this.#hurtSecondsRemaining = 0;
    this.#invulnerabilitySecondsRemaining = 0;
    return true;
  }

  /**
   * Aktualisiert Verletzungs- und Schutzzeit.
   * @param {number} deltaTimeSeconds
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
   * Setzt eine endliche oder dauerhafte Schutzzeit.
   * @param {number} seconds
   */
  setInvulnerability(seconds) {
    const isDuration = Number.isFinite(seconds) && seconds >= 0;
    if (!isDuration && seconds !== Infinity) {
      throw new TypeError("Die Schutzzeit des Charakters ist ungültig.");
    }
    this.#invulnerabilitySecondsRemaining = seconds;
  }

  #reduceTimer(timer, deltaTimeSeconds) {
    return Math.max(0, timer - deltaTimeSeconds);
  }

  #validateDurations(hurtSeconds, invulnerabilitySeconds) {
    const values = [hurtSeconds, invulnerabilitySeconds];
    if (values.every((value) => Number.isFinite(value) && value > 0)) return;
    throw new TypeError("Die Trefferzeiten des Charakters sind ungültig.");
  }

  #reset() {
    this.#isHurt = false;
    this.#isDead = false;
    this.#hurtSecondsRemaining = 0;
    this.#invulnerabilitySecondsRemaining = 0;
  }
}
