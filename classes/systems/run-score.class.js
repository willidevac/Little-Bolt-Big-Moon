import { RunCombo } from "./run-combo.class.js";

/**
 * Calculates a run's score independently of the HUD and game world.
 */
export class RunScore {
  #scoredCombatPhaseIds;
  #scoredEnemyIds;
  #scoredPickupIds;

  /**
   * @param {number} startingScore
   * @param {Readonly<object>} config
   */
  constructor(startingScore, config) {
    this.#validateConfig(startingScore, config);
    this.startingScore = startingScore;
    this.config = config;
    this.combo = new RunCombo(config.combo);
    this.reset();
  }

  /** Begins with a completely empty score state. */
  reset() {
    this.value = this.startingScore;
    this.elapsedSeconds = 0;
    this.isFinalized = false;
    this.combo.reset();
    this.#scoredEnemyIds = new Set();
    this.#scoredPickupIds = new Set();
    this.#scoredCombatPhaseIds = new Set();
  }

  /**
   * Counts only active run time.
   * @param {number} deltaTimeSeconds
   * @param {number} [heightLossPixels=0]
   * @returns {boolean} Whether a visible combo ended.
   */
  updateTime(deltaTimeSeconds, heightLossPixels = 0) {
    if (!Number.isFinite(deltaTimeSeconds) || deltaTimeSeconds < 0) {
      throw new TypeError("Die Laufzeit muss eine positive Zahl sein.");
    }
    if (!this.isFinalized) this.elapsedSeconds += deltaTimeSeconds;
    return this.combo.update(deltaTimeSeconds, heightLossPixels);
  }

  /** @param {number} meters */
  addHeightMeters(meters) {
    this.#addMeasuredPoints(meters, this.config.pointsPerHeightMeter);
  }

  /**
   * Scores enemies exactly once based on their ID.
   * @param {ReadonlyArray<Readonly<{id:string,type:string}>>} enemies
   * @returns {boolean}
   */
  addEnemies(enemies) {
    this.#validateEvents(enemies, "Gegner");
    return enemies.reduce((changed, enemy) => {
      return this.#addEnemy(enemy) || changed;
    }, false);
  }

  /**
   * Scores each real collectable exactly once based on its ID.
   * @param {ReadonlyArray<Readonly<object>>} pickups
   * @returns {boolean}
   */
  addPickups(pickups) {
    this.#validateEvents(pickups, "Funde");
    return pickups.reduce((changed, pickup) => {
      return this.#addPickup(pickup) || changed;
    }, false);
  }

  /**
   * Scores each combat phase exactly once.
   * @param {ReadonlyArray<string>} phaseIds
   * @returns {boolean}
   */
  addCombatPhases(phaseIds) {
    this.#validateEvents(phaseIds, "Kampfphasen");
    return phaseIds.reduce((changed, id) => {
      return this.#addCombatPhase(id) || changed;
    }, false);
  }

  /**
   * Adds remaining energy and saved victory time exactly once.
   * @param {boolean} isVictory
   * @param {number} remainingEnergy
   * @returns {boolean}
   */
  finalize(isVictory, remainingEnergy) {
    this.#validateFinalResult(isVictory, remainingEnergy);
    if (this.isFinalized) return false;
    this.#addPoints(this.#getFinalBonus(isVictory, remainingEnergy));
    this.isFinalized = true;
    return true;
  }

  /** @returns {boolean} Whether an active combo ended. */
  breakCombo() {
    return this.combo.break();
  }

  /** @returns {Readonly<object>} Current combo for the HUD. */
  getComboSnapshot() {
    return this.combo.getSnapshot();
  }

  /** Applies enemy. */
  #addEnemy(enemy) {
    const points = this.config.enemyPoints[enemy?.type];
    const hasIdentity = typeof enemy?.id === "string" && enemy.id;
    if (!hasIdentity || !Number.isFinite(points) || points < 0) {
      throw new TypeError("Der besiegte Gegner ist für die Wertung ungültig.");
    }
    if (this.#scoredEnemyIds.has(enemy.id)) return false;
    this.#scoredEnemyIds.add(enemy.id);
    this.#addComboPoints(points);
    return true;
  }

  /** Applies pickup. */
  #addPickup(pickup) {
    if (!pickup?.id) return false;
    this.#validatePickup(pickup);
    if (this.#scoredPickupIds.has(pickup.id)) return false;
    this.#scoredPickupIds.add(pickup.id);
    const points = pickup.type === "gear"
      ? pickup.amount * this.config.pointsPerGear
      : this.config.pointsPerPickup;
    this.#addComboPoints(points);
    return true;
  }

  /** Applies combat phase. */
  #addCombatPhase(phaseId) {
    if (typeof phaseId !== "string" || !phaseId) {
      throw new TypeError("Die abgeschlossene Kampfphase ist ungültig.");
    }
    if (this.#scoredCombatPhaseIds.has(phaseId)) return false;
    this.#scoredCombatPhaseIds.add(phaseId);
    this.#addPoints(this.config.pointsPerCombatPhase);
    return true;
  }

  /** Returns final bonus. */
  #getFinalBonus(isVictory, remainingEnergy) {
    const energyBonus = remainingEnergy * this.config.pointsPerRemainingEnergy;
    if (!isVictory) return energyBonus;
    const savedSeconds = Math.max(
      0,
      this.config.targetTimeSeconds - Math.floor(this.elapsedSeconds),
    );
    return energyBonus + savedSeconds * this.config.pointsPerSavedSecond;
  }

  /** Applies measured points. */
  #addMeasuredPoints(amount, pointsPerUnit) {
    if (!Number.isFinite(amount) || amount < 0) {
      throw new TypeError("Die Punkte-Einheit muss eine positive Zahl sein.");
    }
    this.#addPoints(amount * pointsPerUnit);
  }

  /** Applies points. */
  #addPoints(points) {
    this.value += Math.max(0, Math.floor(points));
  }

  /** Applies combo points. */
  #addComboPoints(points) {
    this.#addPoints(points * this.combo.recordActivity());
  }

  /** Validates pickup. */
  #validatePickup(pickup) {
    const hasIdentity = typeof pickup.id === "string" && pickup.id.length > 0;
    const hasType = typeof pickup.type === "string" && pickup.type.length > 0;
    const hasAmount = Number.isFinite(pickup.amount) && pickup.amount > 0;
    if (hasIdentity && hasType && hasAmount) return;
    throw new TypeError("Der Fund ist für die Wertung ungültig.");
  }

  /** Validates final result. */
  #validateFinalResult(isVictory, remainingEnergy) {
    const hasResult = typeof isVictory === "boolean";
    const hasEnergy = Number.isFinite(remainingEnergy) && remainingEnergy >= 0;
    if (hasResult && hasEnergy) return;
    throw new TypeError("Das Laufergebnis ist für die Wertung ungültig.");
  }

  /** Validates events. */
  #validateEvents(events, label) {
    if (Array.isArray(events)) return;
    throw new TypeError(`${label} müssen als Liste übergeben werden.`);
  }

  /** Validates config. */
  #validateConfig(startingScore, config) {
    const { enemyPoints, combo, ...scalarValues } = config ?? {};
    const enemies = Object.values(enemyPoints ?? {});
    const values = [startingScore, ...Object.values(scalarValues), ...enemies];
    const isComplete = Object.keys(scalarValues).length === 7 && enemies.length > 0;
    if (isComplete && values.every((value) => {
      return Number.isFinite(value) && value >= 0;
    }) && combo) return;
    throw new TypeError("Die Punktewertung ist unvollständig oder ungültig.");
  }
}
