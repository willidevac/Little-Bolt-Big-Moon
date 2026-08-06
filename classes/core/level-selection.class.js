/**
 * Selects a level without coupling the game core to concrete level modules.
 */
export class LevelSelection {
  #activeLevelId;
  #factories;

  /**
   * Creates the configured instance.
   * @param {Readonly<Record<string, () => Readonly<object>>>} factories Level factories available for selection.
   * @param {string} initialLevelId Initial level id supplied to constructor.
   */
  constructor(factories, initialLevelId) {
    this.#factories = Object.freeze({ ...factories });
    this.#assertKnownLevel(initialLevelId);
    this.#activeLevelId = initialLevelId;
  }

  /** @returns {string} The selected level identifier. */
  get activeLevelId() { return this.#activeLevelId; }

  /**
   * Checks whether a level factory is registered.
   * @param {string} levelId Identifier of the level addressed by the operation.
   * @returns {boolean}
   */
  hasLevel(levelId) {
    return Object.hasOwn(this.#factories, levelId) &&
      typeof this.#factories[levelId] === "function";
  }

  /**
   * Selects the factory used for the next world creation.
   * @param {string} levelId Identifier of the level addressed by the operation.
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

  /**
   * Rejects unknown public level identifiers.
   * @param {string} levelId Identifier of the level addressed by the operation.
   */
  #assertKnownLevel(levelId) {
    if (this.hasLevel(levelId)) return;
    throw new RangeError(`Unbekanntes Level: ${levelId}`);
  }
}
