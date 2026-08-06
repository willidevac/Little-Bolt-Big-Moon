/**
 * Selects a level without coupling the game core to concrete level modules.
 */
export class LevelSelection {
  #activeLevelId;
  #factories;

  /**
   * @param {Readonly<Record<string, () => Readonly<object>>>} factories
   * @param {string} initialLevelId
   */
  constructor(factories, initialLevelId) {
    this.#factories = Object.freeze({ ...factories });
    this.#assertKnownLevel(initialLevelId);
    this.#activeLevelId = initialLevelId;
  }

  /** @returns {string} The selected level identifier. */
  get activeLevelId() { return this.#activeLevelId; }

  /**
   * Selects the factory used for the next world creation.
   * @param {string} levelId
   * @returns {boolean} Whether the selection changed.
   */
  select(levelId) {
    this.#assertKnownLevel(levelId);
    if (levelId === this.#activeLevelId) return false;
    this.#activeLevelId = levelId;
    return true;
  }

  /** @returns {Readonly<object>} A fresh selected level. */
  createLevel() {
    return this.#factories[this.#activeLevelId]();
  }

  /** Rejects unknown public level identifiers. */
  #assertKnownLevel(levelId) {
    const isFactory = Object.hasOwn(this.#factories, levelId) &&
      typeof this.#factories[levelId] === "function";
    if (isFactory) return;
    throw new RangeError(`Unbekanntes Level: ${levelId}`);
  }
}
