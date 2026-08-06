import { RunCombo } from "./run-combo.class.js";

/**
 * Calculates a run's score independently of the HUD and game world.
 */
export class RunScore {
  #scoredCombatPhaseIds;
  #scoredEnemyIds;
  #scoredPickupIds;

  /**
   * Creates the configured system.
   * @param {number} startingScore Starting score used by constructor.
   * @param {Readonly<object>} config Configuration values used by the system.
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
   * @param {number} deltaTimeSeconds Elapsed time since the previous frame, in seconds.
   * @param {number} [heightLossPixels=0] Height loss pixels used by update time.
   * @returns {boolean} Whether a visible combo ended.
   */
  updateTime(deltaTimeSeconds, heightLossPixels = 0) {
    if (!Number.isFinite(deltaTimeSeconds) || deltaTimeSeconds < 0) {
      throw new TypeError("Die Laufzeit muss eine positive Zahl sein.");
    }
    if (!this.isFinalized) this.elapsedSeconds += deltaTimeSeconds;
    return this.combo.update(deltaTimeSeconds, heightLossPixels);
  }

  /**
   * Runs add height meters with validated inputs.
   * @param {number} meters Meters used by add height meters.
   */
  addHeightMeters(meters) {
    this.#addMeasuredPoints(meters, this.config.pointsPerHeightMeter);
  }

  /**
   * Scores enemies exactly once based on their ID.
   * @param {ReadonlyArray<Readonly<{id:string,type:string}>>} enemies Enemies used by add enemies.
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
   * @param {ReadonlyArray<Readonly<object>>} pickups Pickups used by add pickups.
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
   * @param {ReadonlyArray<string>} phaseIds Phase ids used by add combat phases.
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
   * @param {boolean} isVictory Is victory used by finalize.
   * @param {number} remainingEnergy Remaining energy used by finalize.
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

  /**
   * Applies enemy.
   * @param {Readonly<object>} enemy Enemy involved in the reported gameplay event.
   */
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

  /**
   * Applies pickup.
   * @param {Readonly<object>} pickup Pickup used by add pickup.
   */
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

  /**
   * Applies combat phase.
   * @param {string} phaseId Phase id used by add combat phase.
   */
  #addCombatPhase(phaseId) {
    if (typeof phaseId !== "string" || !phaseId) {
      throw new TypeError("Die abgeschlossene Kampfphase ist ungültig.");
    }
    if (this.#scoredCombatPhaseIds.has(phaseId)) return false;
    this.#scoredCombatPhaseIds.add(phaseId);
    this.#addPoints(this.config.pointsPerCombatPhase);
    return true;
  }

  /**
   * Returns final bonus.
   * @param {boolean} isVictory Is victory used by get final bonus.
   * @param {number} remainingEnergy Remaining energy used by get final bonus.
   */
  #getFinalBonus(isVictory, remainingEnergy) {
    const energyBonus = remainingEnergy * this.config.pointsPerRemainingEnergy;
    if (!isVictory) return energyBonus;
    const savedSeconds = Math.max(
      0,
      this.config.targetTimeSeconds - Math.floor(this.elapsedSeconds),
    );
    return energyBonus + savedSeconds * this.config.pointsPerSavedSecond;
  }

  /**
   * Applies measured points.
   * @param {Readonly<object>} amount Amount used by add measured points.
   * @param {Readonly<object>} pointsPerUnit Points per unit used by add measured points.
   */
  #addMeasuredPoints(amount, pointsPerUnit) {
    if (!Number.isFinite(amount) || amount < 0) {
      throw new TypeError("Die Punkte-Einheit muss eine positive Zahl sein.");
    }
    this.#addPoints(amount * pointsPerUnit);
  }

  /**
   * Applies points.
   * @param {Readonly<object>} points Points used by add points.
   */
  #addPoints(points) {
    this.value += Math.max(0, Math.floor(points));
  }

  /**
   * Applies combo points.
   * @param {Readonly<object>} points Points used by add combo points.
   */
  #addComboPoints(points) {
    this.#addPoints(points * this.combo.recordActivity());
  }

  /**
   * Validates pickup.
   * @param {Readonly<object>} pickup Pickup used by validate pickup.
   */
  #validatePickup(pickup) {
    const hasIdentity = typeof pickup.id === "string" && pickup.id.length > 0;
    const hasType = typeof pickup.type === "string" && pickup.type.length > 0;
    const hasAmount = Number.isFinite(pickup.amount) && pickup.amount > 0;
    if (hasIdentity && hasType && hasAmount) return;
    throw new TypeError("Der Fund ist für die Wertung ungültig.");
  }

  /**
   * Validates final result.
   * @param {boolean} isVictory Is victory used by validate final result.
   * @param {number} remainingEnergy Remaining energy used by validate final result.
   */
  #validateFinalResult(isVictory, remainingEnergy) {
    const hasResult = typeof isVictory === "boolean";
    const hasEnergy = Number.isFinite(remainingEnergy) && remainingEnergy >= 0;
    if (hasResult && hasEnergy) return;
    throw new TypeError("Das Laufergebnis ist für die Wertung ungültig.");
  }

  /**
   * Validates events.
   * @param {Readonly<object>} events Gameplay event hub receiving progress reports.
   * @param {Readonly<object>} label Label used by validate events.
   */
  #validateEvents(events, label) {
    if (Array.isArray(events)) return;
    throw new TypeError(`${label} müssen als Liste übergeben werden.`);
  }

  /**
   * Validates config.
   * @param {number} startingScore Starting score used by validate config.
   * @param {Readonly<object>} config Configuration values used by the system.
   */
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
