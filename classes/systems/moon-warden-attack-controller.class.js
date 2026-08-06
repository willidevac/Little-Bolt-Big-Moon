const ATTACK_PATTERNS = Object.freeze(["meleeAttack", "rangedAttack"]);
const RANGED_SPREAD_RADIANS = Object.freeze({
  1: Object.freeze([0]),
  2: Object.freeze([-0.1, 0.1]),
  3: Object.freeze([-0.18, 0, 0.18]),
});

/**
 * Schedules Moon Warden attacks and creates their projectile events.
 */
export class MoonWardenAttackController {
  #attackEvents;
  #config;
  #nextAttackIndex;
  #pendingAttack;
  #source;

  /**
   * Creates the configured system.
   * @param {string} source Unique boss ID.
   * @param {Readonly<object>} config Boss attack values.
   */
  constructor(source, config) {
    this.#validateConfig(source, config);
    this.#source = source;
    this.#config = config;
    this.#attackEvents = [];
    this.#pendingAttack = null;
    this.#nextAttackIndex = 0;
  }

  /** @returns {string} Name of the next attack pattern. */
  get nextPattern() { return ATTACK_PATTERNS[this.#nextAttackIndex]; }

  /** @returns {boolean} Whether an attack is currently being prepared. */
  get hasPendingAttack() { return this.#pendingAttack !== null; }

  /**
   * Begins the next attack pattern against a fixed target position.
   * @param {Readonly<{x:number,y:number}>} target Target entity inspected or modified by the system.
   * @returns {Readonly<object>}
   */
  begin(target) {
    this.#validatePoint(target, "Angriffsziel");
    const pattern = this.nextPattern;
    this.#pendingAttack = {
      pattern,
      target: Object.freeze({ x: target.x, y: target.y }),
      secondsRemaining: this.#config.attackReleaseSeconds,
    };
    this.#nextAttackIndex = (this.#nextAttackIndex + 1) % ATTACK_PATTERNS.length;
    return this.getPendingSnapshot();
  }

  /** @returns {Readonly<object>|null} Visible attack preparation. */
  getPendingSnapshot() {
    if (!this.#pendingAttack) return null;
    return Object.freeze({
      pattern: this.#pendingAttack.pattern,
      target: this.#pendingAttack.target,
      secondsRemaining: this.#pendingAttack.secondsRemaining,
    });
  }

  /**
   * Counts down the warning time and creates attacks when they are due.
   * @param {number} deltaTimeSeconds Elapsed time since the previous frame, in seconds.
   * @param {number} phase Phase used while update.
   * @param {ReadonlyArray<object>} bounds Bounds used while update.
   * @param {Readonly<{x:number,y:number}>} rangedOrigin Ranged origin used while update.
   * @returns {boolean} Whether the attack was released.
   */
  update(deltaTimeSeconds, phase, bounds, rangedOrigin) {
    if (!this.#pendingAttack) return false;
    this.#validateUpdate(deltaTimeSeconds, phase, bounds, rangedOrigin);
    this.#pendingAttack.secondsRemaining -= deltaTimeSeconds;
    if (this.#pendingAttack.secondsRemaining > 0) return false;
    if (this.#pendingAttack.pattern === "meleeAttack") {
      this.#releaseShockwaves(bounds);
    } else this.#releaseMoonBolts(phase, rangedOrigin);
    this.#pendingAttack = null;
    return true;
  }

  /** Removes an interrupted attack preparation. */
  clear() {
    this.#pendingAttack = null;
  }

  /** @returns {ReadonlyArray<Readonly<object>>} Attacks not yet consumed. */
  takeEvents() {
    const events = Object.freeze([...this.#attackEvents]);
    this.#attackEvents.length = 0;
    return events;
  }

  /**
   * Performs the release shockwaves operation.
   * @param {ReadonlyArray<object>} bounds Bounds used while release shockwaves.
   */
  #releaseShockwaves(bounds) {
    const originY = bounds.y + bounds.height;
    this.#attackEvents.push(
      this.#createEvent("shockwave", -1, 0, bounds.x, originY),
      this.#createEvent("shockwave", 1, 0, bounds.x + bounds.width, originY),
    );
  }

  /**
   * Performs the release moon bolts operation.
   * @param {Readonly<object>} phase Phase used while release moon bolts.
   * @param {Readonly<object>} origin Origin used while release moon bolts.
   */
  #releaseMoonBolts(phase, origin) {
    const target = this.#pendingAttack.target;
    const baseAngle = Math.atan2(target.y - origin.y, target.x - origin.x);
    RANGED_SPREAD_RADIANS[phase].forEach((spread) => {
      this.#attackEvents.push(this.#createEvent(
        "moonBolt", Math.cos(baseAngle + spread),
        Math.sin(baseAngle + spread), origin.x, origin.y,
      ));
    });
  }

  /**
   * Creates event.
   * @param {Readonly<object>} kind Kind used while create event.
   * @param {number} directionX Direction x used while create event.
   * @param {number} directionY Direction y used while create event.
   * @param {number} originX Origin x used while create event.
   * @param {number} originY Origin y used while create event.
   */
  #createEvent(kind, directionX, directionY, originX, originY) {
    const damage = kind === "shockwave"
      ? this.#config.shockwaveDamage
      : this.#config.moonBoltDamage;
    return Object.freeze({
      kind, source: this.#source, damage,
      origin: Object.freeze({ x: originX, y: originY }),
      direction: Object.freeze({ x: directionX, y: directionY }),
    });
  }

  /**
   * Validates update.
   * @param {number} deltaTimeSeconds Elapsed time since the previous frame, in seconds.
   * @param {Readonly<object>} phase Phase used while validate update.
   * @param {ReadonlyArray<object>} bounds Bounds used while validate update.
   * @param {Readonly<object>} rangedOrigin Ranged origin used while validate update.
   */
  #validateUpdate(deltaTimeSeconds, phase, bounds, rangedOrigin) {
    const hasTime = Number.isFinite(deltaTimeSeconds) && deltaTimeSeconds > 0;
    const hasPhase = Object.hasOwn(RANGED_SPREAD_RADIANS, phase);
    const hasBounds = this.#hasRectangle(bounds);
    const hasOrigin = this.#hasPoint(rangedOrigin);
    if (hasTime && hasPhase && hasBounds && hasOrigin) return;
    throw new TypeError("Die Aktualisierung des Bossangriffs ist ungültig.");
  }

  /**
   * Validates config.
   * @param {Readonly<object>} source Source entity or definition used by the operation.
   * @param {Readonly<object>} config Configuration values used by the system.
   */
  #validateConfig(source, config) {
    const values = [
      config?.attackReleaseSeconds,
      config?.shockwaveDamage,
      config?.moonBoltDamage,
    ];
    const hasSource = typeof source === "string" && source.length > 0;
    if (hasSource && values.every((value) => Number.isFinite(value) && value > 0)) {
      return;
    }
    throw new TypeError("Die Angriffskonfiguration des Mondwächters ist ungültig.");
  }

  /**
   * Validates point.
   * @param {Readonly<object>} point Point used while validate point.
   * @param {Readonly<object>} label Label used while validate point.
   */
  #validatePoint(point, label) {
    if (this.#hasPoint(point)) return;
    throw new TypeError(`${label} des Mondwächters ist ungültig.`);
  }

  /**
   * Checks the point condition.
   * @param {Readonly<object>} point Point used while has point.
   */
  #hasPoint(point) {
    return Number.isFinite(point?.x) && Number.isFinite(point?.y);
  }

  /**
   * Checks the rectangle condition.
   * @param {ReadonlyArray<object>} bounds Bounds used while has rectangle.
   */
  #hasRectangle(bounds) {
    return this.#hasPoint(bounds) &&
      Number.isFinite(bounds.width) && bounds.width > 0 &&
      Number.isFinite(bounds.height) && bounds.height > 0;
  }
}
