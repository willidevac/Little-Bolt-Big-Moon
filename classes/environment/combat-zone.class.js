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
   * @param {Readonly<object>} zoneData
   */
  constructor(zoneData) {
    this.#validateData(zoneData);
    this.id = zoneData.id;
    this.x = zoneData.x;
    this.y = zoneData.y;
    this.width = zoneData.width;
    this.height = zoneData.height;
    this.enemyIds = Object.freeze([...zoneData.enemyIds]);
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
   * @param {Readonly<object>} target
   * @returns {boolean}
   */
  canTrigger(target) {
    if (this.#state !== COMBAT_ZONE_STATES.WAITING) return false;
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

  #validateData(data) {
    const hasId = typeof data?.id === "string" && data.id.length > 0;
    const position = [data?.x, data?.y];
    const hasPosition = position.every(Number.isFinite);
    const dimensions = [data?.width, data?.height];
    const hasDimensions = dimensions.every((value) => {
      return Number.isFinite(value) && value > 0;
    });
    const hasUnlock = this.#hasUnlockPlatformId(data);
    if (hasId && hasPosition && hasDimensions && hasUnlock &&
      this.#hasEnemyIds(data)) return;
    throw new TypeError("Die Kampfzonendaten sind ungültig.");
  }

  #hasUnlockPlatformId(data) {
    const id = data?.unlockPlatformId;
    return id === undefined || id === null ||
      (typeof id === "string" && id.length > 0);
  }

  #hasEnemyIds(data) {
    if (!Array.isArray(data?.enemyIds) || data.enemyIds.length === 0) return false;
    const uniqueIds = new Set(data.enemyIds);
    return uniqueIds.size === data.enemyIds.length &&
      data.enemyIds.every((id) => typeof id === "string" && id.length > 0);
  }
}
