import { clamp } from "../../js/utils/math.js";

const STAT_BY_PICKUP_TYPE = Object.freeze({
  gear: "gears",
  energy: "energy",
  ammo: "ammo",
});

/**
 * Hält die kleinen Zahlen eines einzelnen Laufs unabhängig von der Anzeige.
 */
export class RunStats {
  #listeners;

  /**
   * @param {Readonly<object>} config
   * @param {number} startY
   */
  constructor(config, startY) {
    this.validateConfig(config, startY);
    this.config = config;
    this.#listeners = new Set();
    this.reset(startY);
  }

  /**
   * Setzt alle Laufwerte auf ihren konfigurierten Anfang zurück.
   * @param {number} [startY=this.startY]
   */
  reset(startY = this.startY) {
    this.#validateStartY(startY);
    this.startY = startY;
    this.maximumEnergy = this.config.maximumEnergy;
    this.maximumAmmo = this.config.maximumAmmo;
    this.energy = this.config.startingEnergy;
    this.ammo = this.config.startingAmmo;
    this.gears = this.config.startingGears;
    this.score = this.config.startingScore;
    this.heightMeters = 0;
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
    if (nextHeight === this.heightMeters) return false;
    this.heightMeters = nextHeight;
    this.#notifyChange();
    return true;
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
    let changed = false;
    pickups.forEach((pickup) => {
      if (this.#applyPickup(pickup)) changed = true;
    });
    if (changed) this.#notifyChange();
    return changed;
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
    this.#notifyChange();
    return this.energy;
  }

  /**
   * Verbraucht Bolzen nur, wenn die angeforderte Menge vorhanden ist.
   * @param {number} amount
   * @returns {boolean}
   */
  spendAmmo(amount) {
    if (!Number.isInteger(amount) || amount < 0) {
      throw new TypeError("Der Munitionsverbrauch muss eine ganze Zahl sein.");
    }
    if (amount > this.ammo) return false;
    if (amount === 0) return true;
    this.ammo -= amount;
    this.#notifyChange();
    return true;
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
   * Liefert eine unveränderliche Momentaufnahme für das HUD.
   * @returns {Readonly<object>}
   */
  getSnapshot() {
    return Object.freeze({
      energy: this.energy,
      maximumEnergy: this.maximumEnergy,
      ammo: this.ammo,
      maximumAmmo: this.maximumAmmo,
      gears: this.gears,
      heightMeters: this.heightMeters,
      score: this.score,
    });
  }

  /**
   * Prüft alle Werte, die für einen sicheren Start benötigt werden.
   * @param {Readonly<object>} config
   * @param {number} startY
   */
  validateConfig(config, startY) {
    const values = [
      config?.maximumEnergy,
      config?.maximumAmmo,
      config?.startingEnergy,
      config?.startingAmmo,
      config?.startingGears,
      config?.startingScore,
      config?.heightPixelsPerMeter,
      startY,
    ];
    const hasValidNumbers = values.every((value) => {
      return Number.isFinite(value) && value >= 0;
    });
    if (hasValidNumbers && config.heightPixelsPerMeter > 0) {
      this.validateEnergy(config);
      this.validateAmmo(config);
      return;
    }
    throw new TypeError("Die HUD-Startwerte sind unvollständig oder ungültig.");
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
    const hasIntegers = Number.isInteger(config.startingAmmo) &&
      Number.isInteger(config.maximumAmmo);
    if (hasIntegers && config.maximumAmmo > 0 &&
      config.startingAmmo <= config.maximumAmmo) return;
    throw new RangeError("Die Startmunition liegt außerhalb der Magazingrenze.");
  }

  #validateStartY(startY) {
    if (Number.isFinite(startY) && startY >= 0) return;
    throw new TypeError("Die Lauf-Starthöhe ist ungültig.");
  }

  #applyPickup(pickup) {
    const statName = STAT_BY_PICKUP_TYPE[pickup?.type];
    if (!statName || !Number.isFinite(pickup.amount) || pickup.amount <= 0) {
      throw new TypeError("Der eingesammelte Fund ist ungültig.");
    }
    const previousValue = this[statName];
    this[statName] = this.#getPickupValue(statName, pickup.amount);
    return this[statName] !== previousValue;
  }

  #getPickupValue(statName, amount) {
    if (statName === "energy") {
      return clamp(this.energy + amount, 0, this.maximumEnergy);
    }
    if (statName === "ammo") {
      return clamp(this.ammo + amount, 0, this.maximumAmmo);
    }
    return this[statName] + amount;
  }

  #validateUpgradeAmount(amount) {
    if (Number.isFinite(amount) && amount > 0) return;
    throw new TypeError("Eine Verbesserung muss eine positive Zahl sein.");
  }

  #notifyChange() {
    const snapshot = this.getSnapshot();
    this.#listeners.forEach((listener) => listener(snapshot));
  }
}
