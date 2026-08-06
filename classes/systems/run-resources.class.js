import { clamp } from "../../js/utils/math.js";

const STAT_BY_PICKUP_TYPE = Object.freeze({
  gear: "gears",
  energy: "energy",
  arcCharge: "arcCharges",
});
const CAPACITY_BY_STAT = Object.freeze({
  energy: "maximumEnergy",
  arcCharges: "maximumArcCharges",
});
const SPENDABLE_TYPES = Object.freeze(["arcCharge"]);
const NON_RESOURCE_TYPES = Object.freeze(["weapon", "storyBadge"]);

/**
 * Manages energy, gears, and limited arc charges for a single run.
 */
export class RunResources {
  #config;
  #values;
  #capacities;

  /** @param {Readonly<object>} config Configured starting values and limits. */
  constructor(config) {
    this.#validateConfig(config);
    this.#config = config;
    this.reset();
  }

  /** @returns {number} Remaining energy. */
  get energy() { return this.#values.energy; }

  /** @returns {number} Maximum energy. */
  get maximumEnergy() { return this.#capacities.maximumEnergy; }

  /** @returns {number} Remaining arc charges. */
  get arcCharges() { return this.#values.arcCharges; }

  /** @returns {number} Maximum arc charges. */
  get maximumArcCharges() { return this.#capacities.maximumArcCharges; }

  /** @returns {number} Collected gears. */
  get gears() { return this.#values.gears; }

  /** Resets all resources to their configured starting values. */
  reset() {
    this.#capacities = {
      maximumEnergy: this.#config.maximumEnergy,
      maximumArcCharges: this.#config.maximumArcCharges,
    };
    this.#values = {
      energy: this.#config.startingEnergy,
      arcCharges: this.#config.startingArcCharges,
      gears: this.#config.startingGears,
    };
  }

  /**
   * Applies new pickups to their matching resources as a batch.
   * @param {ReadonlyArray<Readonly<{type:string, amount:number}>>} pickups
   * @returns {boolean} Whether at least one resource changed.
   */
  applyPickups(pickups) {
    if (!Array.isArray(pickups)) {
      throw new TypeError("Funde müssen als Liste übergeben werden.");
    }
    return pickups.reduce((changed, pickup) => {
      return this.#applyPickup(pickup) || changed;
    }, false);
  }

  /**
   * Reduces energy and returns the remaining value.
   * @param {number} amount
   * @returns {number}
   */
  takeDamage(amount) {
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new TypeError("Schaden muss eine positive Zahl sein.");
    }
    this.#values.energy = clamp(
      this.energy - amount, 0, this.maximumEnergy,
    );
    return this.energy;
  }

  /**
   * Atomically spends an available limited weapon resource.
   * @param {string} type
   * @param {number} amount
   * @returns {boolean} Whether enough ammunition was available.
   */
  spend(type, amount) {
    this.#validateSpend(type, amount);
    const statName = STAT_BY_PICKUP_TYPE[type];
    if (amount > this.#values[statName]) return false;
    this.#values[statName] -= amount;
    return true;
  }

  /**
   * Returns a limited weapon resource without exposing mutable access.
   * @param {string} type
   * @returns {number}
   */
  getAmount(type) {
    if (!SPENDABLE_TYPES.includes(type)) {
      throw new RangeError(`Unbekannte Munitionsart: ${type}`);
    }
    return this.#values[STAT_BY_PICKUP_TYPE[type]];
  }

  /**
   * Increases a resource capacity and immediately fills the new space.
   * @param {"energy"|"arcCharge"} type
   * @param {number} amount
   */
  increaseCapacity(type, amount) {
    this.#validateUpgrade(type, amount);
    const statName = STAT_BY_PICKUP_TYPE[type];
    const capacityName = CAPACITY_BY_STAT[statName];
    this.#capacities[capacityName] += amount;
    this.#values[statName] = clamp(
      this.#values[statName] + amount, 0, this.#capacities[capacityName],
    );
  }

  /** @returns {Readonly<object>} Immutable HUD values. */
  getSnapshot() {
    return Object.freeze({
      energy: this.energy, maximumEnergy: this.maximumEnergy,
      arcCharges: this.arcCharges,
      maximumArcCharges: this.maximumArcCharges,
      gears: this.gears,
    });
  }

  /** Applies pickup. */
  #applyPickup(pickup) {
    const statName = STAT_BY_PICKUP_TYPE[pickup?.type];
    if (NON_RESOURCE_TYPES.includes(pickup?.type)) return false;
    if (!statName || !Number.isFinite(pickup.amount) || pickup.amount <= 0) {
      throw new TypeError("Der eingesammelte Fund ist ungültig.");
    }
    const previousValue = this.#values[statName];
    this.#values[statName] = this.#getPickupValue(statName, pickup.amount);
    return this.#values[statName] !== previousValue;
  }

  /** Returns pickup value. */
  #getPickupValue(statName, amount) {
    const capacityName = CAPACITY_BY_STAT[statName];
    if (!capacityName) return this.#values[statName] + amount;
    return clamp(
      this.#values[statName] + amount, 0, this.#capacities[capacityName],
    );
  }

  /** Validates config. */
  #validateConfig(config) {
    const values = [
      config?.maximumEnergy, config?.startingEnergy, config?.startingGears,
    ];
    const hasNumbers = values.every((value) => Number.isFinite(value) && value >= 0);
    if (!hasNumbers || config.maximumEnergy <= 0) {
      throw new TypeError("Die Vorrats-Startwerte sind unvollständig oder ungültig.");
    }
    this.#validateEnergy(config);
    this.#validateArcCharges(config);
  }

  /** Validates energy. */
  #validateEnergy(config) {
    if (config.startingEnergy <= config.maximumEnergy) return;
    throw new RangeError("Die Startenergie liegt außerhalb des erlaubten Bereichs.");
  }

  /** Validates arc charges. */
  #validateArcCharges(config) {
    this.#validateRange(
      config.startingArcCharges, config.maximumArcCharges,
      "Die Startladung liegt außerhalb des Ladungsspeichers.",
    );
  }

  /** Validates range. */
  #validateRange(starting, maximum, message) {
    const hasIntegers = Number.isInteger(starting) && Number.isInteger(maximum);
    if (hasIntegers && maximum > 0 && starting >= 0 && starting <= maximum) return;
    throw new RangeError(message);
  }

  /** Validates spend. */
  #validateSpend(type, amount) {
    const hasType = SPENDABLE_TYPES.includes(type);
    if (hasType && Number.isInteger(amount) && amount >= 0) return;
    throw new TypeError("Der Munitionsverbrauch ist ungültig.");
  }

  /** Validates upgrade. */
  #validateUpgrade(type, amount) {
    const canGrow = Object.hasOwn(CAPACITY_BY_STAT, STAT_BY_PICKUP_TYPE[type]);
    if (canGrow && Number.isFinite(amount) && amount > 0) return;
    throw new TypeError("Eine Verbesserung muss gültig und positiv sein.");
  }
}
