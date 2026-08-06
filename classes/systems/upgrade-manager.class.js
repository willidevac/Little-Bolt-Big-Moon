const REQUIRED_UPGRADE_IDS = Object.freeze([
  "maximumEnergy",
  "wrenchDamage",
  "arcChargeCapacity",
  "knockbackResistance",
  "jumpControl",
]);
const REQUIRED_RARITY_IDS = Object.freeze(["common", "rare", "epic"]);

/**
 * Selects run upgrades and applies exactly one valid choice.
 */
export class UpgradeManager {
  #definitions;
  #effects;
  #levels;
  #random;
  #rarities;
  #selection;

  /**
   * @param {Readonly<object>} data
   * @param {Readonly<Record<string, (value:number) => void>>} effects
   * @param {() => number} [random=Math.random]
   */
  constructor(data, effects, random = Math.random) {
    this.#validateDependencies(data, effects, random);
    this.selectionSize = data.selectionSize;
    this.iconSheet = Object.freeze({ ...data.iconSheet });
    this.#rarities = this.#createMap(data.rarities);
    this.#definitions = this.#createMap(data.upgrades);
    this.#effects = Object.freeze({ ...effects });
    this.#random = random;
    this.#levels = new Map();
    this.#selection = Object.freeze([]);
    this.reset();
  }

  /** Creates map. */
  #createMap(entries) {
    return new Map(
      entries.map((entry) => [entry.id, Object.freeze({ ...entry })]),
    );
  }

  /**
   * Creates at most three distinct upgradeable options.
   * @returns {ReadonlyArray<Readonly<object>>}
   */
  openSelection() {
    if (this.#selection.length > 0) return this.#selection;
    const available = [...this.#definitions.values()].filter((upgrade) => {
      return this.#levels.get(upgrade.id) < upgrade.maxLevel;
    });
    this.#selection = Object.freeze(
      this.#drawWeighted(available)
        .map((upgrade) => this.#createSnapshot(upgrade)),
    );
    return this.#selection;
  }

  /**
   * Applies only an upgrade that is currently offered.
   * @param {string} upgradeId
   * @returns {Readonly<object>}
   */
  choose(upgradeId) {
    const choice = this.#selection.find((upgrade) => upgrade.id === upgradeId);
    if (!choice) throw new RangeError("Diese Verbesserung steht nicht zur Auswahl.");
    const definition = this.#definitions.get(upgradeId);
    this.#effects[upgradeId](definition.value);
    this.#levels.set(upgradeId, choice.nextLevel);
    this.#selection = Object.freeze([]);
    return this.#createSnapshot(definition);
  }

  /**
   * Returns the current selection as an immutable list.
   * @returns {ReadonlyArray<Readonly<object>>}
   */
  getSelection() {
    return this.#selection;
  }

  /**
   * Resets all upgrade levels for a fresh run.
   */
  reset() {
    this.#levels = new Map(
      [...this.#definitions.keys()].map((id) => [id, 0]),
    );
    this.#selection = Object.freeze([]);
  }

  /** Creates snapshot. */
  #createSnapshot(upgrade) {
    return Object.freeze({
      id: upgrade.id,
      name: upgrade.name,
      description: upgrade.description,
      value: upgrade.value,
      rarity: upgrade.rarity,
      iconFrame: upgrade.iconFrame,
      currentLevel: this.#levels.get(upgrade.id),
      nextLevel: this.#levels.get(upgrade.id) + 1,
      maxLevel: upgrade.maxLevel,
      iconSheet: this.iconSheet,
    });
  }

  /** Draws weighted. */
  #drawWeighted(upgrades) {
    const pool = [...upgrades];
    const selection = [];
    while (pool.length > 0 && selection.length < this.selectionSize) {
      const index = this.#getWeightedIndex(pool);
      selection.push(pool.splice(index, 1)[0]);
    }
    return selection;
  }

  /** Returns weighted index. */
  #getWeightedIndex(upgrades) {
    const weights = upgrades.map((upgrade) => this.#getWeight(upgrade));
    const target = this.#getRandomValue() * weights.reduce((sum, value) => sum + value, 0);
    let upperBoundary = 0;
    for (let index = 0; index < weights.length; index += 1) {
      upperBoundary += weights[index];
      if (target < upperBoundary) return index;
    }
    return weights.length - 1;
  }

  /** Returns weight. */
  #getWeight(upgrade) {
    return this.#rarities.get(upgrade.rarity).weight;
  }

  /** Validates dependencies. */
  #validateDependencies(data, effects, random) {
    if (this.#hasValidData(data) && this.#hasValidEffects(effects, random)) return;
    throw new TypeError("Die Upgrade-Daten sind unvollständig oder ungültig.");
  }

  /** Checks the valid data condition. */
  #hasValidData(data) {
    const upgrades = data?.upgrades;
    const ids = Array.isArray(upgrades) ? upgrades.map((upgrade) => upgrade.id) : [];
    const hasRequiredIds = REQUIRED_UPGRADE_IDS.every((id) => ids.includes(id));
    const hasUniqueIds = new Set(ids).size === ids.length;
    return this.#hasValidSelectionSize(data?.selectionSize, ids.length) &&
      hasRequiredIds &&
      ids.length === REQUIRED_UPGRADE_IDS.length &&
      hasUniqueIds &&
      this.#hasValidRarities(data.rarities) &&
      this.#hasValidDefinitions(upgrades) &&
      this.#hasValidIconSheet(data.iconSheet);
  }

  /** Checks the valid selection size condition. */
  #hasValidSelectionSize(selectionSize, upgradeCount) {
    return Number.isInteger(selectionSize) &&
      selectionSize > 0 &&
      selectionSize <= upgradeCount;
  }

  /** Checks the valid effects condition. */
  #hasValidEffects(effects, random) {
    const hasEffects = REQUIRED_UPGRADE_IDS.every((id) => {
      return typeof effects?.[id] === "function";
    });
    return hasEffects && typeof random === "function";
  }

  /** Returns random value. */
  #getRandomValue() {
    const value = this.#random();
    if (Number.isFinite(value) && value >= 0 && value < 1) return value;
    throw new RangeError("Die Zufallsfunktion muss einen Wert von 0 bis unter 1 liefern.");
  }

  /** Checks the valid definitions condition. */
  #hasValidDefinitions(upgrades) {
    return upgrades.every((upgrade) => {
      const hasText = [upgrade.id, upgrade.name, upgrade.description].every((value) => {
        return typeof value === "string" && value.length > 0;
      });
      const hasNumbers = Number.isFinite(upgrade.value) && upgrade.value > 0 &&
        Number.isInteger(upgrade.maxLevel) && upgrade.maxLevel > 0 &&
        Number.isInteger(upgrade.iconFrame) && upgrade.iconFrame >= 0 &&
        upgrade.iconFrame < REQUIRED_UPGRADE_IDS.length;
      return hasText && hasNumbers && REQUIRED_RARITY_IDS.includes(upgrade.rarity);
    });
  }

  /** Checks the valid rarities condition. */
  #hasValidRarities(rarities) {
    if (!Array.isArray(rarities)) return false;
    const ids = rarities.map((rarity) => rarity.id);
    const hasRequiredIds = REQUIRED_RARITY_IDS.every((id) => ids.includes(id));
    return hasRequiredIds && ids.length === REQUIRED_RARITY_IDS.length &&
      new Set(ids).size === ids.length &&
      rarities.every((rarity) => Number.isFinite(rarity.weight) && rarity.weight > 0);
  }

  /** Checks the valid icon sheet condition. */
  #hasValidIconSheet(iconSheet) {
    return typeof iconSheet?.source === "string" &&
      Number.isFinite(iconSheet.frameWidth) &&
      Number.isFinite(iconSheet.frameHeight) &&
      iconSheet.frameWidth > 0 &&
      iconSheet.frameHeight > 0;
  }
}
