import { WORLD_ENTITY_GROUPS } from "../core/world-entity-groups.js";

const BOSS_NAME = "Mondwächter";
const EMPTY_BOSS_SNAPSHOT = Object.freeze({
  name: BOSS_NAME,
  health: 0,
  maximumHealth: 1,
  phase: 1,
  isActive: false,
  isDead: false,
  isVisible: false,
});

/**
 * Beobachtet genau einen Endboss und meldet den Sieg nach dessen Todesanimation.
 */
export class BossFightManager {
  #boss;
  #isVictoryQueued;
  #wasVictoryDelivered;

  /**
   * @param {ReadonlyArray<object>} enemies
   */
  constructor(enemies = []) {
    this.#validateEnemies(enemies);
    this.#boss = enemies.find((enemy) => enemy.isBoss) ?? null;
    this.#isVictoryQueued = false;
    this.#wasVictoryDelivered = false;
  }

  /**
   * Erkennt den vollständig entfernten Boss höchstens einmal.
   * @param {import("../core/world.class.js").World} world
   */
  update(world) {
    if (!this.#boss || this.#isVictoryQueued || this.#wasVictoryDelivered) return;
    const snapshot = this.#boss.getBossSnapshot();
    if (!snapshot.isDead) return;
    const enemies = world.getEntities(WORLD_ENTITY_GROUPS.ENEMIES);
    this.#isVictoryQueued = !enemies.includes(this.#boss);
  }

  /**
   * Liefert alle Werte für die Bossanzeige.
   * @returns {Readonly<object>}
   */
  getSnapshot() {
    if (!this.#boss) return EMPTY_BOSS_SNAPSHOT;
    const snapshot = this.#boss.getBossSnapshot();
    return Object.freeze({
      name: BOSS_NAME,
      ...snapshot,
      isVisible: snapshot.isActive && !this.#wasVictoryDelivered,
    });
  }

  /**
   * Übergibt das Siegsignal genau einmal an das Spiel.
   * @returns {boolean}
   */
  takeVictory() {
    if (!this.#isVictoryQueued || this.#wasVictoryDelivered) return false;
    this.#isVictoryQueued = false;
    this.#wasVictoryDelivered = true;
    return true;
  }

  #validateEnemies(enemies) {
    if (!Array.isArray(enemies)) {
      throw new TypeError("Die Bossgegner müssen als Liste vorliegen.");
    }
    const bosses = enemies.filter((enemy) => enemy?.isBoss);
    const haveSnapshots = bosses.every((boss) => {
      return typeof boss.getBossSnapshot === "function";
    });
    if (bosses.length <= 1 && haveSnapshots) return;
    throw new RangeError("Ein Level darf höchstens einen gültigen Endboss besitzen.");
  }
}
