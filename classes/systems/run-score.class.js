/**
 * Berechnet die Punktzahl eines Laufs unabhängig von HUD und Spielwelt.
 */
export class RunScore {
  #scoredEnemyIds;
  #scoredCombatPhaseIds;

  /**
   * @param {number} startingScore
   * @param {Readonly<object>} config
   */
  constructor(startingScore, config) {
    this.#validateConfig(startingScore, config);
    this.startingScore = startingScore;
    this.config = config;
    this.reset();
  }

  /** Beginnt eine vollständig leere Wertung. */
  reset() {
    this.value = this.startingScore;
    this.elapsedSeconds = 0;
    this.isFinalized = false;
    this.#scoredEnemyIds = new Set();
    this.#scoredCombatPhaseIds = new Set();
  }

  /**
   * Zählt nur aktive Laufzeit.
   * @param {number} deltaTimeSeconds
   */
  updateTime(deltaTimeSeconds) {
    if (!Number.isFinite(deltaTimeSeconds) || deltaTimeSeconds < 0) {
      throw new TypeError("Die Laufzeit muss eine positive Zahl sein.");
    }
    if (!this.isFinalized) this.elapsedSeconds += deltaTimeSeconds;
  }

  /** @param {number} meters */
  addHeightMeters(meters) {
    this.#addMeasuredPoints(meters, this.config.pointsPerHeightMeter);
  }

  /** @param {number} amount */
  addGears(amount) {
    this.#addMeasuredPoints(amount, this.config.pointsPerGear);
  }

  /**
   * Bewertet Gegner anhand ihrer ID genau einmal.
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
   * Bewertet jede Kampfphase genau einmal.
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
   * Ergänzt Restenergie und bei Sieg gesparte Zeit genau einmal.
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

  #addEnemy(enemy) {
    const points = this.config.enemyPoints[enemy?.type];
    const hasIdentity = typeof enemy?.id === "string" && enemy.id;
    if (!hasIdentity || !Number.isFinite(points) || points < 0) {
      throw new TypeError("Der besiegte Gegner ist für die Wertung ungültig.");
    }
    if (this.#scoredEnemyIds.has(enemy.id)) return false;
    this.#scoredEnemyIds.add(enemy.id);
    this.#addPoints(points);
    return true;
  }

  #addCombatPhase(phaseId) {
    if (typeof phaseId !== "string" || !phaseId) {
      throw new TypeError("Die abgeschlossene Kampfphase ist ungültig.");
    }
    if (this.#scoredCombatPhaseIds.has(phaseId)) return false;
    this.#scoredCombatPhaseIds.add(phaseId);
    this.#addPoints(this.config.pointsPerCombatPhase);
    return true;
  }

  #getFinalBonus(isVictory, remainingEnergy) {
    const energyBonus = remainingEnergy * this.config.pointsPerRemainingEnergy;
    if (!isVictory) return energyBonus;
    const savedSeconds = Math.max(
      0,
      this.config.targetTimeSeconds - Math.floor(this.elapsedSeconds),
    );
    return energyBonus + savedSeconds * this.config.pointsPerSavedSecond;
  }

  #addMeasuredPoints(amount, pointsPerUnit) {
    if (!Number.isFinite(amount) || amount < 0) {
      throw new TypeError("Die Punkte-Einheit muss eine positive Zahl sein.");
    }
    this.#addPoints(amount * pointsPerUnit);
  }

  #addPoints(points) {
    this.value += Math.max(0, Math.floor(points));
  }

  #validateFinalResult(isVictory, remainingEnergy) {
    const hasResult = typeof isVictory === "boolean";
    const hasEnergy = Number.isFinite(remainingEnergy) && remainingEnergy >= 0;
    if (hasResult && hasEnergy) return;
    throw new TypeError("Das Laufergebnis ist für die Wertung ungültig.");
  }

  #validateEvents(events, label) {
    if (Array.isArray(events)) return;
    throw new TypeError(`${label} müssen als Liste übergeben werden.`);
  }

  #validateConfig(startingScore, config) {
    const { enemyPoints, ...scalarValues } = config ?? {};
    const enemies = Object.values(enemyPoints ?? {});
    const values = [startingScore, ...Object.values(scalarValues), ...enemies];
    const isComplete = Object.keys(scalarValues).length === 6 && enemies.length > 0;
    if (isComplete && values.every((value) => {
      return Number.isFinite(value) && value >= 0;
    })) return;
    throw new TypeError("Die Punktewertung ist unvollständig oder ungültig.");
  }
}
