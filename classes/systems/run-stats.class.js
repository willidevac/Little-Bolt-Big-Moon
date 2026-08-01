import { RunResources } from "./run-resources.class.js";
import { RunScore } from "./run-score.class.js";

/**
 * Bündelt Fortschritt, Vorräte und Wertung eines Laufs für das HUD.
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

  /** @returns {number} Verbleibende Energie. */
  get energy() { return this.#resources.energy; }

  /** @returns {number} Höchstmögliche Energie. */
  get maximumEnergy() { return this.#resources.maximumEnergy; }

  /** @returns {number} Verbleibende Bolzen. */
  get ammo() { return this.#resources.ammo; }

  /** @returns {number} Höchstmögliche Bolzen. */
  get maximumAmmo() { return this.#resources.maximumAmmo; }

  /** @returns {number} Verbleibende Lichtbogenladungen. */
  get arcCharges() { return this.#resources.arcCharges; }

  /** @returns {number} Höchstmögliche Lichtbogenladungen. */
  get maximumArcCharges() { return this.#resources.maximumArcCharges; }

  /** @returns {number} Gesammelte Zahnräder. */
  get gears() { return this.#resources.gears; }

  /**
   * Setzt alle Laufwerte auf ihren konfigurierten Anfang zurück.
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
   * Registriert eine Anzeige und liefert ihre Abmeldefunktion.
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
   * Berechnet die aktuelle Höhe aus Bytes Weltposition.
   * @param {number} characterY
   * @returns {boolean} Ob sich die angezeigten Meter geändert haben.
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
   * Zählt nur tatsächliche Spielzeit und informiert das HUD nicht jeden Frame.
   * @param {number} deltaTimeSeconds
   * @param {number} [heightLossPixels=0]
   */
  updateTime(deltaTimeSeconds, heightLossPixels = 0) {
    if (this.#score.updateTime(deltaTimeSeconds, heightLossPixels)) {
      this.#notifyChange();
    }
  }

  /**
   * Rechnet neue Funde auf Wertung und Vorräte.
   * @param {ReadonlyArray<Readonly<{type:string, amount:number}>>} pickups
   * @returns {boolean} Ob sich mindestens ein sichtbarer Wert geändert hat.
   */
  applyPickups(pickups) {
    const scoreChanged = this.#score.addPickups(pickups);
    const resourcesChanged = this.#resources.applyPickups(pickups);
    const changed = scoreChanged || resourcesChanged;
    if (changed) this.#notifyChange();
    return changed;
  }

  /**
   * Bewertet jeden besiegten Gegner anhand seiner ID genau einmal.
   * @param {ReadonlyArray<Readonly<{id:string,type:string}>>} enemies
   * @returns {boolean}
   */
  applyEnemyDefeats(enemies) {
    const changed = this.#score.addEnemies(enemies);
    if (changed) this.#notifyChange();
    return changed;
  }

  /**
   * Bewertet jede abgeschlossene Kampfphase genau einmal.
   * @param {ReadonlyArray<string>} phaseIds
   * @returns {boolean}
   */
  applyCombatPhases(phaseIds) {
    const changed = this.#score.addCombatPhases(phaseIds);
    if (changed) this.#notifyChange();
    return changed;
  }

  /**
   * Ergänzt am Laufende Restenergie und bei Sieg den Zeitbonus genau einmal.
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
   * Zieht Trefferenergie ab und liefert den verbleibenden Wert.
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
   * Verbraucht Bolzen nur, wenn die angeforderte Menge vorhanden ist.
   * @param {number} amount
   * @returns {boolean}
   */
  spendAmmo(amount) {
    return this.spendResource("ammo", amount);
  }

  /**
   * Verbraucht genau die Munitionsart der aktiven Waffe.
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
   * Liefert den Vorrat einer Waffe ohne veränderbaren Zugriff.
   * @param {string} type
   * @returns {number}
   */
  getResourceAmount(type) {
    return this.#resources.getAmount(type);
  }

  /** @param {number} amount Vergrößerung der Batterie. */
  increaseMaximumEnergy(amount) {
    this.#increaseCapacity("energy", amount);
  }

  /** @param {number} amount Vergrößerung des Bolzenmagazins. */
  increaseAmmoCapacity(amount) {
    this.#increaseCapacity("ammo", amount);
  }

  /** @param {number} amount Vergrößerung des Ladungsspeichers. */
  increaseArcChargeCapacity(amount) {
    this.#increaseCapacity("arcCharge", amount);
  }

  /**
   * Übernimmt Bosswerte nur bei einer sichtbaren Änderung.
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

  /** @returns {Readonly<object>} Unveränderliche Momentaufnahme für das HUD. */
  getSnapshot() {
    return Object.freeze({
      energy: this.energy, maximumEnergy: this.maximumEnergy,
      ammo: this.ammo, maximumAmmo: this.maximumAmmo,
      arcCharges: this.arcCharges, gears: this.gears,
      heightMeters: this.heightMeters,
      score: this.#score.value, combo: this.#score.getComboSnapshot(),
      elapsedSeconds: Math.floor(this.#score.elapsedSeconds),
      boss: this.boss,
    });
  }

  #increaseCapacity(type, amount) {
    this.#resources.increaseCapacity(type, amount);
    this.#notifyChange();
  }

  #validateProgressConfig(config, startY) {
    this.#validateStartY(startY);
    const pixelsPerMeter = config?.heightPixelsPerMeter;
    if (Number.isFinite(pixelsPerMeter) && pixelsPerMeter > 0) return;
    throw new TypeError("Die Höhenberechnung des Laufs ist ungültig.");
  }

  #validateStartY(startY) {
    if (Number.isFinite(startY) && startY >= 0) return;
    throw new TypeError("Die Lauf-Starthöhe ist ungültig.");
  }

  #getBossSignature(snapshot) {
    return [
      snapshot.name, snapshot.health, snapshot.maximumHealth, snapshot.phase,
      snapshot.isActive, snapshot.isDead, snapshot.isVisible,
    ].join("|");
  }

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

  #notifyChange() {
    const snapshot = this.getSnapshot();
    this.#listeners.forEach((listener) => listener(snapshot));
  }
}
