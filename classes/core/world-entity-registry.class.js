/**
 * Manages entity groups and safely defers changes until the end of a frame.
 */
export class WorldEntityRegistry {
  /** @type {ReadonlyArray<string>} */
  #groupNames;
  /** @type {Map<string, object[]>} */
  #groups;
  /** @type {Map<string, Set<object>>} */
  #pendingAdditions;
  /** @type {Map<string, Set<object>>} */
  #pendingRemovals;
  /** @type {boolean} */
  #isProcessing;

  /**
   * Creates the configured instance.
   * @param {ReadonlyArray<string>} groupNames Entity group names registered by the world.
   */
  constructor(groupNames) {
    this.#validateGroupNames(groupNames);
    this.#groupNames = Object.freeze([...groupNames]);
    this.#groups = new Map(groupNames.map((name) => [name, []]));
    this.#pendingAdditions = this.#createPendingMap();
    this.#pendingRemovals = this.#createPendingMap();
    this.#isProcessing = false;
  }

  /**
   * Adds an entity immediately or after the current processing pass.
   * @param {string} groupName Entity group addressed by the operation.
   * @param {object} entity World entity processed by the operation.
   * @returns {boolean}
   */
  add(groupName, entity) {
    this.#validateEntity(groupName, entity);
    const entities = this.#getGroup(groupName);
    const additions = this.#getPending(this.#pendingAdditions, groupName);
    const removals = this.#getPending(this.#pendingRemovals, groupName);
    if (removals.delete(entity)) return true;
    if (entities.includes(entity) || additions.has(entity)) return false;
    if (this.#isProcessing) additions.add(entity);
    else entities.push(entity);
    return true;
  }

  /**
   * Removes an entity immediately or after the current processing pass.
   * @param {string} groupName Entity group addressed by the operation.
   * @param {object} entity World entity processed by the operation.
   * @returns {boolean}
   */
  remove(groupName, entity) {
    this.#validateEntity(groupName, entity);
    const additions = this.#getPending(this.#pendingAdditions, groupName);
    if (additions.delete(entity)) return true;
    const entities = this.#getGroup(groupName);
    if (!entities.includes(entity)) return false;
    if (this.#isProcessing) return this.#queueRemoval(groupName, entity);
    entities.splice(entities.indexOf(entity), 1);
    return true;
  }

  /**
   * Returns an immutable snapshot of an entity group.
   * @param {string} groupName Entity group addressed by the operation.
   * @returns {ReadonlyArray<object>}
   */
  getSnapshot(groupName) {
    return Object.freeze([...this.#getGroup(groupName)]);
  }

  /**
   * Returns detached group snapshots without exposing the registry's arrays.
   * @returns {ReadonlyMap<string, ReadonlyArray<object>>}
   */
  getGroupsSnapshot() {
    return new Map(this.#groupNames.map((groupName) => {
      return [groupName, this.getSnapshot(groupName)];
    }));
  }

  /**
   * Processes groups in order and applies deferred changes afterward.
   * @param {ReadonlyArray<string>} groupOrder Ordered entity groups processed during the frame.
   * @param {(entity: object) => void} callback Callback invoked for each matching item.
   */
  process(groupOrder, callback) {
    this.#validateProcess(groupOrder, callback);
    this.#isProcessing = true;
    try {
      groupOrder.forEach((name) => this.#getGroup(name).forEach(callback));
    } finally {
      this.#isProcessing = false;
      this.#applyPendingChanges();
    }
  }

  /** Safely removes all active and queued entities. */
  clear() {
    this.#pendingAdditions.forEach((entities) => entities.clear());
    if (this.#isProcessing) this.#queueAllEntitiesForRemoval();
    else this.#groups.forEach((entities) => entities.splice(0));
  }

  /** @returns {Map<string, Set<object>>} */
  #createPendingMap() {
    return new Map(this.#groupNames.map((name) => [name, new Set()]));
  }

  /**
   * Runs get group with validated inputs.
   * @param {string} groupName Entity group addressed by the operation.
   * @returns {object[]}
   */
  #getGroup(groupName) {
    this.#validateGroupName(groupName);
    return /** @type {object[]} */ (this.#groups.get(groupName));
  }

  /**
   * Runs get pending with validated inputs.
   * @param {Map<string, Set<object>>} groups Groups supplied to get pending.
   * @param {string} groupName Entity group addressed by the operation.
   * @returns {Set<object>}
   */
  #getPending(groups, groupName) {
    this.#validateGroupName(groupName);
    return /** @type {Set<object>} */ (groups.get(groupName));
  }

  /** Applies pending changes. */
  #applyPendingChanges() {
    this.#groupNames.forEach((groupName) => {
      this.#applyRemovals(groupName);
      this.#applyAdditions(groupName);
    });
  }

  /**
   * Runs apply removals with validated inputs.
   * @param {string} groupName Entity group addressed by the operation.
   */
  #applyRemovals(groupName) {
    const removals = this.#getPending(this.#pendingRemovals, groupName);
    if (removals.size === 0) return;
    const remaining = this.#getGroup(groupName).filter((entity) => {
      return !removals.has(entity);
    });
    this.#groups.set(groupName, remaining);
    removals.clear();
  }

  /**
   * Runs apply additions with validated inputs.
   * @param {string} groupName Entity group addressed by the operation.
   */
  #applyAdditions(groupName) {
    const additions = this.#getPending(this.#pendingAdditions, groupName);
    if (additions.size === 0) return;
    this.#getGroup(groupName).push(...additions);
    additions.clear();
  }

  /** Performs the queue all entities for removal operation. */
  #queueAllEntitiesForRemoval() {
    this.#groupNames.forEach((groupName) => {
      const removals = this.#getPending(this.#pendingRemovals, groupName);
      this.#getGroup(groupName).forEach((entity) => removals.add(entity));
    });
  }

  /**
   * Runs queue removal with validated inputs.
   * @param {string} groupName Entity group addressed by the operation.
   * @param {object} entity World entity processed by the operation.
   */
  #queueRemoval(groupName, entity) {
    const removals = this.#getPending(this.#pendingRemovals, groupName);
    if (removals.has(entity)) return false;
    removals.add(entity);
    return true;
  }

  /**
   * Runs validate entity with validated inputs.
   * @param {string} groupName Entity group addressed by the operation.
   * @param {object} entity World entity processed by the operation.
   */
  #validateEntity(groupName, entity) {
    this.#validateGroupName(groupName);
    if (entity && typeof entity === "object") return;
    throw new TypeError("Eine Entität muss ein Objekt sein.");
  }

  /**
   * Runs validate group name with validated inputs.
   * @param {string} groupName Entity group addressed by the operation.
   */
  #validateGroupName(groupName) {
    if (this.#groups.has(groupName)) return;
    throw new RangeError(`Unbekannte Entitätsgruppe: ${groupName}`);
  }

  /**
   * Runs validate group names with validated inputs.
   * @param {ReadonlyArray<string>} groupNames Entity group names registered by the world.
   */
  #validateGroupNames(groupNames) {
    if (!Array.isArray(groupNames)) {
      throw new TypeError("Entitätsgruppen müssen als Liste übergeben werden.");
    }
    const uniqueNames = new Set(groupNames);
    if (groupNames.length > 0 && uniqueNames.size === groupNames.length &&
      [...uniqueNames].every((name) => typeof name === "string" && name)) return;
    throw new TypeError("Entitätsgruppen müssen eindeutige Namen besitzen.");
  }

  /**
   * Runs validate process with validated inputs.
   * @param {ReadonlyArray<string>} groupOrder Ordered entity groups processed during the frame.
   * @param {(entity:object) => void} callback Callback invoked for each matching item.
   */
  #validateProcess(groupOrder, callback) {
    if (!Array.isArray(groupOrder) || typeof callback !== "function") {
      throw new TypeError("Die Entitätsverarbeitung ist ungültig.");
    }
    groupOrder.forEach((groupName) => this.#validateGroupName(groupName));
  }
}
