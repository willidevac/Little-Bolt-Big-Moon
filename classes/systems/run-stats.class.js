import { clamp } from "../../js/utils/math.js";
import { RunScore } from "./run-score.class.js";

const STAT_BY_PICKUP_TYPE = Object.freeze({
  gear: "gears",
  energy: "energy",
  ammo: "ammo",
  arcCharge: "arcCharges",
});
const CAPACITY_BY_STAT = Object.freeze({
  energy: "maximumEnergy",
  ammo: "maximumAmmo",
  arcCharges: "maximumArcCharges",
});
const SPENDABLE_PICKUP_TYPES = Object.freeze(["ammo", "arcCharge"]);
const NON_STAT_PICKUP_TYPES = Object.freeze(["weapon", "storyBadge"]);
/**
 * Hält die kleinen Zahlen eines einzelnen Laufs unabhängig von der Anzeige.
 */
export class RunStats {
  #listeners;
  #bossSignature;
  #score;
  /**
   * @param {Readonly<object>} config
   * @param {number} startY
   */
  constructor(config, startY) {
    this.validateConfig(config, startY);
    this.config = config;
    this.#listeners = new Set();
    this.#score = new RunScore(config.startingScore, config.scoring);
    this.reset(startY);
  }

  /**
   * Setzt alle Laufwerte auf ihren konfigurierten Anfang zurück.
   * @param {number} [startY=this.startY]
   */
  reset(startY = this.startY) {
    this.#validateStartY(startY);
    Object.assign(this, {
      startY, maximumEnergy: this.config.maximumEnergy,
      maximumAmmo: this.config.maximumAmmo,
      maximumArcCharges: this.config.maximumArcCharges,
      energy: this.config.startingEnergy, ammo: this.config.startingAmmo,
      arcCharges: this.config.startingArcCharges, gears: this.config.startingGears,
      heightMeters: 0, boss: null,
    });
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
   * Rechnet neue Funde gesammelt auf die passenden Laufwerte.
   * @param {ReadonlyArray<Readonly<{type:string, amount:number}>>} pickups
   * @returns {boolean} Ob sich mindestens ein sichtbarer Wert geändert hat.
   */
  applyPickups(pickups) {
    if (!Array.isArray(pickups)) {
      throw new TypeError("Funde müssen als Liste übergeben werden.");
    }
    let changed = this.#score.addPickups(pickups);
    pickups.forEach((pickup) => {
      if (this.#applyPickup(pickup)) changed = true;
    });
    if (changed) this.#notifyChange();
    return changed;
  }

  /**
   * Bewertet jeden besiegten Gegner anhand seiner eindeutigen ID genau einmal.
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
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new TypeError("Schaden muss eine positive Zahl sein.");
    }
    const nextEnergy = clamp(this.energy - amount, 0, this.maximumEnergy);
    if (nextEnergy === this.energy) return this.energy;
    this.energy = nextEnergy;
    this.#score.breakCombo();
    this.#notifyChange();
    return this.energy;
  }

  /**
   * Verbraucht Bolzen nur, wenn die angeforderte Menge vorhanden ist.
   * @param {number} amount
   * @returns {boolean}
   */
  spendAmmo(amount) {
    return this.spendResource("ammo", amount);
  }

  /** Verbraucht genau die Munitionsart der aktiven Waffe. */
  spendResource(type, amount) {
    const statName = STAT_BY_PICKUP_TYPE[type];
    this.#validateResourceSpend(type, amount);
    if (amount > this[statName]) return false;
    if (amount === 0) return true;
    this[statName] -= amount;
    this.#notifyChange();
    return true;
  }

  /** Liefert den Vorrat einer Waffe ohne veränderbaren Zugriff. */
  getResourceAmount(type) {
    const statName = STAT_BY_PICKUP_TYPE[type];
    if (SPENDABLE_PICKUP_TYPES.includes(type)) return this[statName];
    throw new RangeError(`Unbekannte Munitionsart: ${type}`);
  }

  /**
   * Vergrößert Bytes Batterie und repariert den neu gewonnenen Bereich.
   * @param {number} amount
   */
  increaseMaximumEnergy(amount) {
    this.#validateUpgradeAmount(amount);
    this.maximumEnergy += amount;
    this.energy = clamp(this.energy + amount, 0, this.maximumEnergy);
    this.#notifyChange();
  }

  /**
   * Vergrößert das Magazin und füllt die neuen Plätze sofort.
   * @param {number} amount
   */
  increaseAmmoCapacity(amount) {
    this.#validateUpgradeAmount(amount);
    this.maximumAmmo += amount;
    this.ammo = clamp(this.ammo + amount, 0, this.maximumAmmo);
    this.#notifyChange();
  }

  /**
   * Vergrößert den Ladungsspeicher und füllt den neuen Platz sofort.
   * @param {number} amount
   */
  increaseArcChargeCapacity(amount) {
    this.#validateUpgradeAmount(amount);
    this.maximumArcCharges += amount;
    this.arcCharges = clamp(
      this.arcCharges + amount,
      0,
      this.maximumArcCharges,
    );
    this.#notifyChange();
  }

  /**
   * Übernimmt Bosswerte nur, wenn sich die Anzeige wirklich geändert hat.
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

  /**
   * Liefert eine unveränderliche Momentaufnahme für das HUD.
   * @returns {Readonly<object>}
   */
  getSnapshot() {
    return Object.freeze({
      energy: this.energy,
      maximumEnergy: this.maximumEnergy,
      ammo: this.ammo,
      maximumAmmo: this.maximumAmmo,
      arcCharges: this.arcCharges,
      gears: this.gears,
      heightMeters: this.heightMeters,
      score: this.#score.value, combo: this.#score.getComboSnapshot(),
      elapsedSeconds: Math.floor(this.#score.elapsedSeconds),
      boss: this.boss,
    });
  }

  /**
   * Prüft alle Werte, die für einen sicheren Start benötigt werden.
   * @param {Readonly<object>} config
   * @param {number} startY
   */
  validateConfig(config, startY) {
    if (this.#hasValidStartNumbers(config, startY)) {
      this.validateEnergy(config);
      this.validateAmmo(config);
      return;
    }
    throw new TypeError("Die HUD-Startwerte sind unvollständig oder ungültig.");
  }

  #hasValidStartNumbers(config, startY) {
    const values = this.#getStartValues(config, startY);
    const hasValidNumbers = values.every((value) => {
      return Number.isFinite(value) && value >= 0;
    });
    return hasValidNumbers && config.heightPixelsPerMeter > 0;
  }

  #getStartValues(config, startY) {
    return [
      config?.maximumEnergy,
      config?.maximumAmmo,
      config?.maximumArcCharges,
      config?.startingEnergy,
      config?.startingAmmo,
      config?.startingArcCharges,
      config?.startingGears,
      config?.startingScore,
      config?.heightPixelsPerMeter,
      startY,
    ];
  }

  /**
   * Verhindert einen Energiestart außerhalb der erlaubten Grenzen.
   * @param {Readonly<object>} config
   */
  validateEnergy(config) {
    const energy = clamp(config.startingEnergy, 0, config.maximumEnergy);
    if (energy === config.startingEnergy && config.maximumEnergy > 0) return;
    throw new RangeError("Die Startenergie liegt außerhalb des erlaubten Bereichs.");
  }

  /**
   * Verhindert einen Munitionsstart außerhalb der Magazingrenze.
   * @param {Readonly<object>} config
   */
  validateAmmo(config) {
    this.#validateResourceRange(
      config.startingAmmo,
      config.maximumAmmo,
      "Die Startmunition liegt außerhalb der Magazingrenze.",
    );
    this.#validateResourceRange(
      config.startingArcCharges,
      config.maximumArcCharges,
      "Die Startladung liegt außerhalb des Ladungsspeichers.",
    );
  }

  #validateStartY(startY) {
    if (Number.isFinite(startY) && startY >= 0) return;
    throw new TypeError("Die Lauf-Starthöhe ist ungültig.");
  }

  #applyPickup(pickup) {
    const statName = STAT_BY_PICKUP_TYPE[pickup?.type];
    if (NON_STAT_PICKUP_TYPES.includes(pickup?.type)) return false;
    if (!statName || !Number.isFinite(pickup.amount) || pickup.amount <= 0) {
      throw new TypeError("Der eingesammelte Fund ist ungültig.");
    }
    const previousValue = this[statName];
    this[statName] = this.#getPickupValue(statName, pickup.amount);
    return this[statName] !== previousValue;
  }

  #getPickupValue(statName, amount) {
    const capacityName = CAPACITY_BY_STAT[statName];
    if (capacityName) {
      return clamp(this[statName] + amount, 0, this[capacityName]);
    }
    return this[statName] + amount;
  }

  #validateResourceSpend(type, amount) {
    const hasType = SPENDABLE_PICKUP_TYPES.includes(type);
    if (hasType && Number.isInteger(amount) && amount >= 0) return;
    throw new TypeError("Der Munitionsverbrauch ist ungültig.");
  }

  #validateResourceRange(starting, maximum, message) {
    const hasIntegers = Number.isInteger(starting) && Number.isInteger(maximum);
    if (hasIntegers && maximum > 0 && starting <= maximum) return;
    throw new RangeError(message);
  }

  #validateUpgradeAmount(amount) {
    if (Number.isFinite(amount) && amount > 0) return;
    throw new TypeError("Eine Verbesserung muss eine positive Zahl sein.");
  }

  #getBossSignature(snapshot) {
    return [
      snapshot.name,
      snapshot.health,
      snapshot.maximumHealth,
      snapshot.phase,
      snapshot.isActive,
      snapshot.isDead,
      snapshot.isVisible,
    ].join("|");
  }

  #validateBossSnapshot(snapshot) {
    const values = [snapshot?.health, snapshot?.maximumHealth, snapshot?.phase];
    const hasNumbers = values.every(Number.isFinite);
    const hasName = typeof snapshot?.name === "string" && snapshot.name;
    const flags = [snapshot?.isActive, snapshot?.isDead, snapshot?.isVisible];
    const hasFlags = flags.every((flag) => typeof flag === "boolean");
    const hasHealth = snapshot?.health >= 0 &&
      snapshot?.maximumHealth > 0 &&
      snapshot?.health <= snapshot?.maximumHealth;
    const hasPhase = Number.isInteger(snapshot?.phase) && snapshot.phase > 0;
    if (hasNumbers && hasName && hasFlags && hasHealth && hasPhase) return;
    throw new TypeError("Die Bossanzeige enthält ungültige Werte.");
  }

  #notifyChange() {
    const snapshot = this.getSnapshot();
    this.#listeners.forEach((listener) => listener(snapshot));
  }
}
