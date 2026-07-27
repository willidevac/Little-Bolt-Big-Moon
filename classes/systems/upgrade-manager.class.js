const REQUIRED_UPGRADE_IDS = Object.freeze([
  "maximumEnergy",
  "wrenchDamage",
  "ammoCapacity",
  "knockbackResistance",
  "jumpControl",
]);

/**
 * Wählt Laufverbesserungen aus und wendet genau eine gültige Auswahl an.
 */
export class UpgradeManager {
  #definitions;
  #effects;
  #levels;
  #selection;
  #random;

  /**
   * @param {Readonly<object>} data
   * @param {Readonly<Record<string, (value:number) => void>>} effects
   * @param {() => number} [random=Math.random]
   */
  constructor(data, effects, random = Math.random) {
    this.#validateDependencies(data, effects, random);
    this.selectionSize = data.selectionSize;
    this.iconSheet = Object.freeze({ ...data.iconSheet });
    this.#definitions = new Map(
      data.upgrades.map((upgrade) => [upgrade.id, Object.freeze({ ...upgrade })]),
    );
    this.#effects = Object.freeze({ ...effects });
    this.#random = random;
    this.#levels = new Map();
    this.#selection = Object.freeze([]);
    this.reset();
  }

  /**
   * Erstellt höchstens drei verschiedene, noch steigerbare Vorschläge.
   * @returns {ReadonlyArray<Readonly<object>>}
   */
  openSelection() {
    if (this.#selection.length > 0) return this.#selection;
    const available = [...this.#definitions.values()].filter((upgrade) => {
      return this.#levels.get(upgrade.id) < upgrade.maxLevel;
    });
    this.#selection = Object.freeze(
      this.#shuffle(available)
        .slice(0, this.selectionSize)
        .map((upgrade) => this.#createSnapshot(upgrade)),
    );
    return this.#selection;
  }

  /**
   * Wendet nur eine aktuell angebotene Verbesserung an.
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
   * Liefert die aktuelle Auswahl als unveränderliche Liste.
   * @returns {ReadonlyArray<Readonly<object>>}
   */
  getSelection() {
    return this.#selection;
  }

  /**
   * Setzt alle Verbesserungsstufen für einen frischen Lauf zurück.
   */
  reset() {
    this.#levels = new Map(
      [...this.#definitions.keys()].map((id) => [id, 0]),
    );
    this.#selection = Object.freeze([]);
  }

  #createSnapshot(upgrade) {
    return Object.freeze({
      id: upgrade.id,
      name: upgrade.name,
      description: upgrade.description,
      iconFrame: upgrade.iconFrame,
      currentLevel: this.#levels.get(upgrade.id),
      nextLevel: this.#levels.get(upgrade.id) + 1,
      maxLevel: upgrade.maxLevel,
      iconSheet: this.iconSheet,
    });
  }

  #shuffle(upgrades) {
    const shuffled = [...upgrades];
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const targetIndex = Math.floor(this.#getRandomValue() * (index + 1));
      [shuffled[index], shuffled[targetIndex]] =
        [shuffled[targetIndex], shuffled[index]];
    }
    return shuffled;
  }

  #validateDependencies(data, effects, random) {
    if (this.#hasValidData(data) && this.#hasValidEffects(effects, random)) return;
    throw new TypeError("Die Upgrade-Daten sind unvollständig oder ungültig.");
  }

  #hasValidData(data) {
    const upgrades = data?.upgrades;
    const ids = Array.isArray(upgrades) ? upgrades.map((upgrade) => upgrade.id) : [];
    const hasRequiredIds = REQUIRED_UPGRADE_IDS.every((id) => ids.includes(id));
    const hasUniqueIds = new Set(ids).size === ids.length;
    return Number.isInteger(data?.selectionSize) &&
      data.selectionSize > 0 &&
      hasRequiredIds &&
      ids.length === REQUIRED_UPGRADE_IDS.length &&
      hasUniqueIds &&
      this.#hasValidDefinitions(upgrades) &&
      this.#hasValidIconSheet(data.iconSheet);
  }

  #hasValidEffects(effects, random) {
    const hasEffects = REQUIRED_UPGRADE_IDS.every((id) => {
      return typeof effects?.[id] === "function";
    });
    return hasEffects && typeof random === "function";
  }

  #getRandomValue() {
    const value = this.#random();
    if (Number.isFinite(value) && value >= 0 && value < 1) return value;
    throw new RangeError("Die Zufallsfunktion muss einen Wert von 0 bis unter 1 liefern.");
  }

  #hasValidDefinitions(upgrades) {
    return upgrades.every((upgrade) => {
      const hasText = [upgrade.id, upgrade.name, upgrade.description].every((value) => {
        return typeof value === "string" && value.length > 0;
      });
      const hasNumbers = Number.isFinite(upgrade.value) && upgrade.value > 0 &&
        Number.isInteger(upgrade.maxLevel) && upgrade.maxLevel > 0 &&
        Number.isInteger(upgrade.iconFrame) && upgrade.iconFrame >= 0 &&
        upgrade.iconFrame < REQUIRED_UPGRADE_IDS.length;
      return hasText && hasNumbers;
    });
  }

  #hasValidIconSheet(iconSheet) {
    return typeof iconSheet?.source === "string" &&
      Number.isFinite(iconSheet.frameWidth) &&
      Number.isFinite(iconSheet.frameHeight) &&
      iconSheet.frameWidth > 0 &&
      iconSheet.frameHeight > 0;
  }
}
