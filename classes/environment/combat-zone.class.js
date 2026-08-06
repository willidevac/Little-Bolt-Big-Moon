export const COMBAT_ZONE_STATES = Object.freeze({
  WAITING: "waiting",
  ACTIVE: "active",
  COMPLETED: "completed",
});

/**
 * Invisible trigger for an optional or progression-locking enemy encounter.
 */
export class CombatZone {
  #state;

  /**
   * Creates the configured instance.
   * @param {Readonly<object>} zoneData Zone data supplied to constructor.
   */
  constructor(zoneData) {
    this.#validateData(zoneData);
    this.id = zoneData.id;
    this.x = zoneData.x;
    this.y = zoneData.y;
    this.width = zoneData.width;
    this.height = zoneData.height;
    this.enemyIds = Object.freeze([...zoneData.enemyIds]);
    this.triggerEnemyId = zoneData.triggerEnemyId ?? null;
    this.triggerZoneId = zoneData.triggerZoneId ?? null;
    this.unlockPlatformId = zoneData.unlockPlatformId ?? null;
    this.#state = COMBAT_ZONE_STATES.WAITING;
  }

  /**
   * Starts the encounter at most once.
   * @returns {boolean}
   */
  activate() {
    if (this.#state !== COMBAT_ZONE_STATES.WAITING) return false;
    this.#state = COMBAT_ZONE_STATES.ACTIVE;
    return true;
  }

  /**
   * Permanently completes the active encounter.
   * @returns {boolean}
   */
  complete() {
    if (this.#state !== COMBAT_ZONE_STATES.ACTIVE) return false;
    this.#state = COMBAT_ZONE_STATES.COMPLETED;
    return true;
  }

  /**
   * Checks whether the center of a target entered the waiting area.
   * @param {Readonly<object>} target Target affected or inspected by the operation.
   * @param {ReadonlySet<string>|null} [activeEnemyIds] Active enemy ids supplied to can trigger.
   * @param {ReadonlySet<string>|null} [completedZoneIds] Completed zone ids supplied to can trigger.
   * @returns {boolean}
   */
  canTrigger(target, activeEnemyIds = null, completedZoneIds = null) {
    if (this.#state !== COMBAT_ZONE_STATES.WAITING) return false;
    if (this.triggerEnemyId) {
      return activeEnemyIds instanceof Set &&
        !activeEnemyIds.has(this.triggerEnemyId);
    }
    if (this.triggerZoneId) {
      return completedZoneIds instanceof Set &&
        completedZoneIds.has(this.triggerZoneId);
    }
    return this.#contains(target);
  }

  /**
   * Checks whether the target center lies inside the physical trigger.
   * @param {Readonly<object>} target Target affected or inspected by the operation.
   */
  #contains(target) {
    const centerX = target.x + target.width / 2;
    const centerY = target.y + target.height / 2;
    return centerX >= this.x &&
      centerX <= this.x + this.width &&
      centerY >= this.y &&
      centerY <= this.y + this.height;
  }

  /**
   * Returns an immutable state for tests and upgrade triggers.
   * @returns {Readonly<object>}
   */
  getSnapshot() {
    return Object.freeze({
      id: this.id,
      state: this.#state,
      enemyIds: this.enemyIds,
      unlockPlatformId: this.unlockPlatformId,
    });
  }

  /**
   * Returns the current state without mutation access.
   * @returns {string}
   */
  get state() {
    return this.#state;
  }

  /**
   * Validates data.
   * @param {Readonly<object>} data Source data used to configure the instance.
   */
  #validateData(data) {
    const hasId = typeof data?.id === "string" && data.id.length > 0;
    const position = [data?.x, data?.y];
    const hasPosition = position.every(Number.isFinite);
    const dimensions = [data?.width, data?.height];
    const hasDimensions = dimensions.every((value) => {
      return Number.isFinite(value) && value > 0;
    });
    const hasUnlock = this.#hasUnlockPlatformId(data);
    const hasTrigger = this.#hasTriggerEnemyId(data);
    if (hasId && hasPosition && hasDimensions && hasUnlock && hasTrigger &&
      this.#hasEnemyIds(data)) return;
    throw new TypeError("Die Kampfzonendaten sind ungültig.");
  }

  /**
   * Checks the unlock platform id condition.
   * @param {Readonly<object>} data Source data used to configure the instance.
   */
  #hasUnlockPlatformId(data) {
    const id = data?.unlockPlatformId;
    return id === undefined || id === null ||
      (typeof id === "string" && id.length > 0);
  }

  /**
   * Checks the optional defeat-trigger enemy id.
   * @param {Readonly<object>} data Source data used to configure the instance.
   */
  #hasTriggerEnemyId(data) {
    const id = data?.triggerEnemyId;
    const zoneId = data?.triggerZoneId;
    const hasEnemy = id !== undefined && id !== null;
    const hasZone = zoneId !== undefined && zoneId !== null;
    const validEnemy = !hasEnemy || typeof id === "string" && id.length > 0;
    const validZone = !hasZone || typeof zoneId === "string" && zoneId.length > 0;
    return validEnemy && validZone && !(hasEnemy && hasZone);
  }

  /**
   * Checks the enemy ids condition.
   * @param {Readonly<object>} data Source data used to configure the instance.
   */
  #hasEnemyIds(data) {
    if (!Array.isArray(data?.enemyIds) || data.enemyIds.length === 0) return false;
    const uniqueIds = new Set(data.enemyIds);
    return uniqueIds.size === data.enemyIds.length &&
      data.enemyIds.every((id) => typeof id === "string" && id.length > 0);
  }
}
