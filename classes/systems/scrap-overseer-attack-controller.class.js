const PHASE_SPREAD_RADIANS = Object.freeze({
  1: Object.freeze([0]),
  2: Object.freeze([-0.16, 0, 0.16]),
});

/** Schedules fixed, visibly announced Scrap Overseer bolt volleys. */
export class ScrapOverseerAttackController {
  #attackEvents = [];
  #config;
  #pendingAttack = null;
  #source;

  /** @param {string} source @param {Readonly<object>} config */
  constructor(source, config) {
    this.#validateConfig(source, config);
    this.#source = source;
    this.#config = config;
  }

  /** @returns {boolean} Whether a shot is being announced. */
  get hasPendingAttack() { return this.#pendingAttack !== null; }

  /** Begins one announced volley toward a fixed target position. */
  begin(target) {
    this.#validatePoint(target, "Angriffsziel");
    if (this.#pendingAttack) return null;
    this.#pendingAttack = {
      target: Object.freeze({ x: target.x, y: target.y }),
      secondsRemaining: this.#config.attackReleaseSeconds,
    };
    return this.getPendingSnapshot();
  }

  /** @returns {Readonly<object>|null} Visible preparation data. */
  getPendingSnapshot() {
    if (!this.#pendingAttack) return null;
    return Object.freeze({
      target: this.#pendingAttack.target,
      secondsRemaining: this.#pendingAttack.secondsRemaining,
    });
  }

  /** Counts down and releases one phase-dependent bolt volley. */
  update(deltaTimeSeconds, phase, origin) {
    if (!this.#pendingAttack) return false;
    this.#validateUpdate(deltaTimeSeconds, phase, origin);
    this.#pendingAttack.secondsRemaining -= deltaTimeSeconds;
    if (this.#pendingAttack.secondsRemaining > 0) return false;
    this.#releaseVolley(phase, origin);
    this.#pendingAttack = null;
    return true;
  }

  /** Removes an interrupted preparation. */
  clear() { this.#pendingAttack = null; }

  /** @returns {ReadonlyArray<Readonly<object>>} New attacks exactly once. */
  takeEvents() {
    const events = Object.freeze([...this.#attackEvents]);
    this.#attackEvents.length = 0;
    return events;
  }

  /** Creates every bolt in the current phase spread. */
  #releaseVolley(phase, origin) {
    const target = this.#pendingAttack.target;
    const baseAngle = Math.atan2(target.y - origin.y, target.x - origin.x);
    PHASE_SPREAD_RADIANS[phase].forEach((spread) => {
      this.#attackEvents.push(this.#createEvent(origin, baseAngle + spread));
    });
  }

  /** Creates one immutable neutral boss projectile event. */
  #createEvent(origin, angle) {
    return Object.freeze({
      kind: "overseerBolt",
      source: this.#source,
      damage: this.#config.boltDamage,
      origin: Object.freeze({ x: origin.x, y: origin.y }),
      direction: Object.freeze({ x: Math.cos(angle), y: Math.sin(angle) }),
    });
  }

  /** Validates one countdown update. */
  #validateUpdate(deltaTimeSeconds, phase, origin) {
    const hasTime = Number.isFinite(deltaTimeSeconds) && deltaTimeSeconds > 0;
    const hasPhase = Object.hasOwn(PHASE_SPREAD_RADIANS, phase);
    if (hasTime && hasPhase && this.#hasPoint(origin)) return;
    throw new TypeError("Der Schrott-Aufseher-Angriff ist ungültig.");
  }

  /** Validates the immutable attack configuration. */
  #validateConfig(source, config) {
    const values = [config?.attackReleaseSeconds, config?.boltDamage];
    const hasSource = typeof source === "string" && source.length > 0;
    const hasValues = values.every((value) => Number.isFinite(value) && value > 0);
    if (hasSource && hasValues) return;
    throw new TypeError("Die Schrott-Aufseher-Angriffe sind unvollständig.");
  }

  /** Validates a required point with a focused error. */
  #validatePoint(point, label) {
    if (this.#hasPoint(point)) return;
    throw new TypeError(`${label} des Schrott-Aufsehers ist ungültig.`);
  }

  /** Checks a finite two-dimensional point. */
  #hasPoint(point) {
    return Number.isFinite(point?.x) && Number.isFinite(point?.y);
  }
}
