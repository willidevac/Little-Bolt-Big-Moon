export const COMBAT_ZONE_STATES = Object.freeze({
  WAITING: "waiting",
  ACTIVE: "active",
  COMPLETED: "completed",
});

/**
 * Unsichtbarer Auslöser für eine überspringbare Gegnergruppe.
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
    this.#state = COMBAT_ZONE_STATES.WAITING;
  }

  /**
   * Startet die Begegnung höchstens einmal.
   * @returns {boolean}
   */
  activate() {
    if (this.#state !== COMBAT_ZONE_STATES.WAITING) return false;
    this.#state = COMBAT_ZONE_STATES.ACTIVE;
    return true;
  }

  /**
   * Schließt die aktive Begegnung dauerhaft ab.
   * @returns {boolean}
   */
  complete() {
    if (this.#state !== COMBAT_ZONE_STATES.ACTIVE) return false;
    this.#state = COMBAT_ZONE_STATES.COMPLETED;
    return true;
  }

  /**
   * Prüft, ob die Mitte eines Ziels den wartenden Bereich betreten hat.
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
   * Liefert einen unveränderlichen Stand für Tests und Upgrade-Auslösung.
   * @returns {Readonly<object>}
   */
  getSnapshot() {
    return Object.freeze({
      id: this.id,
      state: this.#state,
      enemyIds: this.enemyIds,
    });
  }

  /**
   * Liefert den aktuellen Zustand ohne Änderungszugriff.
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
    if (hasId && hasPosition && hasDimensions && this.#hasEnemyIds(data)) return;
    throw new TypeError("Die Kampfzonendaten sind ungültig.");
  }

  #hasEnemyIds(data) {
    if (!Array.isArray(data?.enemyIds) || data.enemyIds.length === 0) return false;
    const uniqueIds = new Set(data.enemyIds);
    return uniqueIds.size === data.enemyIds.length &&
      data.enemyIds.every((id) => typeof id === "string" && id.length > 0);
  }
}
