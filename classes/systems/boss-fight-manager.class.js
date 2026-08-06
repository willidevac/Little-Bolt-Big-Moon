import { WORLD_ENTITY_GROUPS } from "../core/world-entity-groups.js";

const BOSS_TRACKING_DISTANCE_PIXELS = 960;

const EMPTY_BOSS_SNAPSHOT = Object.freeze({
  name: "Zwischenboss",
  health: 0,
  maximumHealth: 1,
  phase: 1,
  isActive: false,
  isDead: false,
  isFinalBoss: false,
  isVisible: false,
});

/**
 * Tracks every biome boss and reports victory only after the final boss.
 */
export class BossFightManager {
  #bosses;
  #finalBoss;
  #activeBoss;
  #isActiveBossNearTarget;
  #isVictoryQueued;
  #wasVictoryDelivered;

  /**
   * Creates the configured system.
   * @param {ReadonlyArray<object>} enemies Enemy entities managed by the system.
   */
  constructor(enemies = []) {
    this.#validateEnemies(enemies);
    this.#bosses = enemies.filter((enemy) => enemy.isBoss);
    this.#finalBoss = this.#bosses.find((boss) => boss.isFinalBoss) ?? null;
    this.#activeBoss = null;
    this.#isActiveBossNearTarget = false;
    this.#isVictoryQueued = false;
    this.#wasVictoryDelivered = false;
  }

  /**
   * Selects the nearby boss and detects the removed final boss.
   * @param {import("../core/world.class.js").World} world Active world providing entities and runtime state.
   */
  update(world) {
    const enemies = world.getEntities(WORLD_ENTITY_GROUPS.ENEMIES);
    this.#activeBoss = this.#findNearestActiveBoss(enemies, world.character);
    this.#isActiveBossNearTarget = this.#isNearActiveBoss(world.character);
    this.#queueFinalVictory(enemies);
  }

  /**
   * Returns all values for the shared boss display.
   * @returns {Readonly<object>}
   */
  getSnapshot() {
    if (!this.#activeBoss) return EMPTY_BOSS_SNAPSHOT;
    const snapshot = this.#activeBoss.getBossSnapshot();
    const isActive = snapshot.isActive && this.#isActiveBossNearTarget;
    return Object.freeze({
      ...snapshot,
      isActive,
      isVisible: isActive && !this.#wasVictoryDelivered,
    });
  }

  /**
   * Passes the victory signal to the game exactly once.
   * @returns {boolean}
   */
  takeVictory() {
    if (!this.#isVictoryQueued || this.#wasVictoryDelivered) return false;
    this.#isVictoryQueued = false;
    this.#wasVictoryDelivered = true;
    return true;
  }

  /**
   * Returns find nearest active boss.
   * @param {ReadonlyArray<object>} enemies Enemy entities managed by the system.
   * @param {Readonly<object>} target Target entity inspected or modified by the system.
   */
  #findNearestActiveBoss(enemies, target) {
    const activeBosses = this.#bosses.filter((boss) => {
      return boss.isActive && enemies.includes(boss);
    });
    return activeBosses.reduce((nearest, boss) => {
      if (!nearest) return boss;
      return this.#getDistanceSquared(boss, target) <
        this.#getDistanceSquared(nearest, target) ? boss : nearest;
    }, null);
  }

  /**
   * Returns distance squared.
   * @param {Readonly<object>} entity Entity used while get distance squared.
   * @param {Readonly<object>} target Target entity inspected or modified by the system.
   */
  #getDistanceSquared(entity, target) {
    if (!target) return 0;
    const entityX = entity.x + entity.width / 2;
    const entityY = entity.y + entity.height / 2;
    const targetX = target.x + target.width / 2;
    const targetY = target.y + target.height / 2;
    return (entityX - targetX) ** 2 + (entityY - targetY) ** 2;
  }

  /**
   * Checks the near active boss condition.
   * @param {Readonly<object>} target Target entity inspected or modified by the system.
   */
  #isNearActiveBoss(target) {
    if (!this.#activeBoss) return false;
    const maximumDistanceSquared = BOSS_TRACKING_DISTANCE_PIXELS ** 2;
    return this.#getDistanceSquared(this.#activeBoss, target) <=
      maximumDistanceSquared;
  }

  /**
   * Performs the queue final victory operation.
   * @param {ReadonlyArray<object>} enemies Enemy entities managed by the system.
   */
  #queueFinalVictory(enemies) {
    if (!this.#finalBoss || this.#isVictoryQueued || this.#wasVictoryDelivered) {
      return;
    }
    const wasRemoved = !enemies.includes(this.#finalBoss);
    if (this.#finalBoss.isDead && wasRemoved) this.#isVictoryQueued = true;
  }

  /**
   * Validates enemies.
   * @param {ReadonlyArray<object>} enemies Enemy entities managed by the system.
   */
  #validateEnemies(enemies) {
    if (!Array.isArray(enemies)) {
      throw new TypeError("Die Bossgegner müssen als Liste vorliegen.");
    }
    const bosses = enemies.filter((enemy) => enemy?.isBoss);
    const haveSnapshots = bosses.every((boss) => {
      return typeof boss.getBossSnapshot === "function";
    });
    const uniqueIds = new Set(bosses.map((boss) => boss.id));
    const finalCount = bosses.filter((boss) => boss.isFinalBoss).length;
    if (haveSnapshots && uniqueIds.size === bosses.length &&
      (bosses.length === 0 || finalCount === 1)) return;
    throw new RangeError("Bossprofile oder Endboss-Zuordnung sind ungültig.");
  }
}
