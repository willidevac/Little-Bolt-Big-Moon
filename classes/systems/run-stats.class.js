import { RunResources } from "./run-resources.class.js";
import { RunScore } from "./run-score.class.js";

/**
 * Groups a run's progress, resources, and score for the HUD.
 */
export class RunStats {
  #listeners;
  #bossSignature;
  #resources;
  #score;

  /**
   * @param {Readonly<object>} config
   * @param {number} startY
   */
  constructor(config, startY) {
    this.#validateProgressConfig(config, startY);
    this.config = config;
    this.#resources = new RunResources(config);
    this.#listeners = new Set();
    this.#score = new RunScore(config.startingScore, config.scoring);
    this.reset(startY);
  }

  /** @returns {number} Remaining energy. */
  get energy() { return this.#resources.energy; }

  /** @returns {number} Maximum energy. */
  get maximumEnergy() { return this.#resources.maximumEnergy; }

  /** @returns {number} Remaining arc charges. */
  get arcCharges() { return this.#resources.arcCharges; }

  /** @returns {number} Maximum arc charges. */
  get maximumArcCharges() { return this.#resources.maximumArcCharges; }

  /** @returns {number} Collected gears. */
  get gears() { return this.#resources.gears; }

  /**
   * Resets all run values to their configured starting state.
   * @param {number} [startY=this.startY]
   */
  reset(startY = this.startY) {
    this.#validateStartY(startY);
    this.#resources.reset();
    Object.assign(this, { startY, heightMeters: 0, boss: null });
    this.#score.reset();
    this.#bossSignature = "";
    this.#notifyChange();
  }

  /**
   * Registers a view and returns its unsubscribe function.
   * @param {(snapshot: Readonly<object>) => void} listener
   * @returns {() => void}
   */
  onChange(listener) {
    if (typeof listener !== "function") {
      throw new TypeError("Der Laufwert-Beobachter muss eine Funktion sein.");
    }
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  /**
   * Calculates the current height from Byte's world position.
   * @param {number} characterY
   * @returns {boolean} Whether the displayed meters changed.
   */
  updateHeight(characterY) {
    if (!Number.isFinite(characterY)) return false;
    const climbedPixels = Math.max(0, this.startY - characterY);
    const nextHeight = Math.floor(climbedPixels / this.config.heightPixelsPerMeter);
    if (nextHeight <= this.heightMeters) return false;
    this.#score.addHeightMeters(nextHeight - this.heightMeters);
    this.heightMeters = nextHeight;
    this.#notifyChange();
    return true;
  }

  /**
   * Counts only actual play time and avoids notifying the HUD every frame.
   * @param {number} deltaTimeSeconds
   * @param {number} [heightLossPixels=0]
   */
  updateTime(deltaTimeSeconds, heightLossPixels = 0) {
    if (this.#score.updateTime(deltaTimeSeconds, heightLossPixels)) {
      this.#notifyChange();
    }
  }

  /**
   * Applies new pickups to the score and resources.
   * @param {ReadonlyArray<Readonly<{type:string, amount:number}>>} pickups
   * @returns {boolean} Whether at least one visible value changed.
   */
  applyPickups(pickups) {
    const scoreChanged = this.#score.addPickups(pickups);
    const resourcesChanged = this.#resources.applyPickups(pickups);
    const changed = scoreChanged || resourcesChanged;
    if (changed) this.#notifyChange();
    return changed;
  }

  /**
   * Scores every defeated enemy exactly once based on its ID.
   * @param {ReadonlyArray<Readonly<{id:string,type:string}>>} enemies
   * @returns {boolean}
   */
  applyEnemyDefeats(enemies) {
    const changed = this.#score.addEnemies(enemies);
    if (changed) this.#notifyChange();
    return changed;
  }

  /**
   * Scores every completed combat phase exactly once.
   * @param {ReadonlyArray<string>} phaseIds
   * @returns {boolean}
   */
  applyCombatPhases(phaseIds) {
    const changed = this.#score.addCombatPhases(phaseIds);
    if (changed) this.#notifyChange();
    return changed;
  }

  /**
   * Adds remaining energy and the victory time bonus exactly once at run end.
   * @param {boolean} isVictory
   * @returns {boolean}
   */
  finalizeScore(isVictory) {
    const changed = this.#score.finalize(isVictory, this.energy);
    if (!changed) return false;
    this.#notifyChange();
    return true;
  }

  /**
   * Reduces energy after a hit and returns the remaining value.
   * @param {number} amount
   * @returns {number}
   */
  takeDamage(amount) {
    const previousEnergy = this.energy;
    const remainingEnergy = this.#resources.takeDamage(amount);
    if (remainingEnergy === previousEnergy) return remainingEnergy;
    this.#score.breakCombo();
    this.#notifyChange();
    return remainingEnergy;
  }

  /**
   * Spends exactly the ammunition type used by the active weapon.
   * @param {string} type
   * @param {number} amount
   * @returns {boolean}
   */
  spendResource(type, amount) {
    const spent = this.#resources.spend(type, amount);
    if (spent && amount > 0) this.#notifyChange();
    return spent;
  }

  /**
   * Returns a weapon resource without exposing mutable access.
   * @param {string} type
   * @returns {number}
   */
  getResourceAmount(type) {
    return this.#resources.getAmount(type);
  }

  /** @param {number} amount Battery capacity increase. */
  increaseMaximumEnergy(amount) {
    this.#increaseCapacity("energy", amount);
  }

  /** @param {number} amount Arc-charge storage increase. */
  increaseArcChargeCapacity(amount) {
    this.#increaseCapacity("arcCharge", amount);
  }

  /**
   * Applies boss values only when a visible change occurs.
   * @param {Readonly<object>} snapshot
   * @returns {boolean}
   */
  updateBoss(snapshot) {
    this.#validateBossSnapshot(snapshot);
    const signature = this.#getBossSignature(snapshot);
    if (signature === this.#bossSignature) return false;
    this.boss = Object.freeze({ ...snapshot });
    this.#bossSignature = signature;
    this.#notifyChange();
    return true;
  }

  /** @returns {Readonly<object>} Immutable snapshot for the HUD. */
  getSnapshot() {
    return Object.freeze({
      energy: this.energy, maximumEnergy: this.maximumEnergy,
      arcCharges: this.arcCharges, gears: this.gears,
      heightMeters: this.heightMeters,
      score: this.#score.value, combo: this.#score.getComboSnapshot(),
      elapsedSeconds: Math.floor(this.#score.elapsedSeconds),
      boss: this.boss,
    });
  }

  /** Performs the increase capacity operation. */
  #increaseCapacity(type, amount) {
    this.#resources.increaseCapacity(type, amount);
    this.#notifyChange();
  }

  /** Validates progress config. */
  #validateProgressConfig(config, startY) {
    this.#validateStartY(startY);
    const pixelsPerMeter = config?.heightPixelsPerMeter;
    if (Number.isFinite(pixelsPerMeter) && pixelsPerMeter > 0) return;
    throw new TypeError("Die Höhenberechnung des Laufs ist ungültig.");
  }

  /** Validates start y. */
  #validateStartY(startY) {
    if (Number.isFinite(startY) && startY >= 0) return;
    throw new TypeError("Die Lauf-Starthöhe ist ungültig.");
  }

  /** Returns boss signature. */
  #getBossSignature(snapshot) {
    return [
      snapshot.name, snapshot.health, snapshot.maximumHealth, snapshot.phase,
      snapshot.isActive, snapshot.isDead, snapshot.isVisible,
    ].join("|");
  }

  /** Validates boss snapshot. */
  #validateBossSnapshot(snapshot) {
    const values = [snapshot?.health, snapshot?.maximumHealth, snapshot?.phase];
    const hasNumbers = values.every(Number.isFinite);
    const hasName = typeof snapshot?.name === "string" && snapshot.name;
    const flags = [snapshot?.isActive, snapshot?.isDead, snapshot?.isVisible];
    const hasFlags = flags.every((flag) => typeof flag === "boolean");
    const hasHealth = snapshot?.health >= 0 &&
      snapshot?.maximumHealth > 0 && snapshot?.health <= snapshot?.maximumHealth;
    const hasPhase = Number.isInteger(snapshot?.phase) && snapshot.phase > 0;
    if (hasNumbers && hasName && hasFlags && hasHealth && hasPhase) return;
    throw new TypeError("Die Bossanzeige enthält ungültige Werte.");
  }

  /** Performs the notify change operation. */
  #notifyChange() {
    const snapshot = this.getSnapshot();
    this.#listeners.forEach((listener) => listener(snapshot));
  }
}
