import { CombatZone, COMBAT_ZONE_STATES } from "../environment/combat-zone.class.js";
import { WORLD_ENTITY_GROUPS } from "../core/world-entity-groups.js";
import { GAMEPLAY_EVENTS } from "../core/gameplay-event-hub.class.js";

/**
 * Aktiviert Begegnungsgegner und meldet sichere Abschlüsse ohne Einsperren.
 */
export class WaveManager {
  #zones;
  #enemiesById;
  #managedEnemyIds;
  #completedWaveIds;
  #isInitialized;

  /**
   * @param {ReadonlyArray<CombatZone>} combatZones
   * @param {ReadonlyArray<object>} enemies
   */
  constructor(combatZones = [], enemies = []) {
    this.#validateCollections(combatZones, enemies);
    this.#zones = Object.freeze([...combatZones]);
    this.#enemiesById = new Map(enemies.map((enemy) => [enemy.id, enemy]));
    this.#managedEnemyIds = this.#collectManagedEnemyIds();
    this.#completedWaveIds = [];
    this.#isInitialized = false;
    this.#validateEnemyReferences();
  }

  /**
   * Fügt nur Gegner ohne Arenazugehörigkeit zum sicheren Startbereich hinzu.
   * @param {import("../core/world.class.js").World} world
   * @returns {boolean}
   */
  initialize(world) {
    if (this.#isInitialized) return false;
    this.#enemiesById.forEach((enemy, id) => {
      if (!this.#managedEnemyIds.has(id)) {
        world.addEntity(WORLD_ENTITY_GROUPS.ENEMIES, enemy);
      }
    });
    this.#isInitialized = true;
    return true;
  }

  /**
   * Aktualisiert genau eine Begegnung oder löst die nächste Gegnergruppe aus.
   * @param {import("../core/world.class.js").World} world
   */
  update(world) {
    if (!this.#isInitialized) return;
    const activeZone = this.#getActiveZone();
    if (activeZone) {
      if (this.#hasEnded(activeZone, world)) this.#complete(activeZone, world);
      return;
    }
    const waitingZone = this.#zones.find((zone) => zone.canTrigger(world.character));
    if (waitingZone) this.#activate(waitingZone, world);
  }

  /**
   * Übergibt jeden Abschluss genau einmal an das nächste Spielsystem.
   * @returns {ReadonlyArray<string>}
   */
  takeCompletedWaveIds() {
    const completedIds = Object.freeze([...this.#completedWaveIds]);
    this.#completedWaveIds.length = 0;
    return completedIds;
  }

  /**
   * Liefert den Zustand einer bestimmten Arena.
   * @param {string} zoneId
   * @returns {Readonly<object>}
   */
  getZoneSnapshot(zoneId) {
    const zone = this.#zones.find((candidate) => candidate.id === zoneId);
    if (zone) return zone.getSnapshot();
    throw new RangeError(`Unbekannte Kampfzone: ${zoneId}`);
  }

  #activate(zone, world) {
    if (!zone.activate()) return;
    zone.enemyIds.forEach((enemyId) => {
      world.addEntity(
        WORLD_ENTITY_GROUPS.ENEMIES,
        this.#enemiesById.get(enemyId),
      );
    });
  }

  #hasEnded(zone, world) {
    const activeEnemyIds = new Set(
      world.getEntities(WORLD_ENTITY_GROUPS.ENEMIES).map((enemy) => enemy.id),
    );
    return zone.enemyIds.every((enemyId) => !activeEnemyIds.has(enemyId));
  }

  #complete(zone, world) {
    if (!zone.complete()) return;
    this.#completedWaveIds.push(zone.id);
    world.gameplayEvents.emit(GAMEPLAY_EVENTS.WAVE_COMPLETE, { id: zone.id });
  }

  #getActiveZone() {
    return this.#zones.find((zone) => {
      return zone.state === COMBAT_ZONE_STATES.ACTIVE;
    });
  }

  #collectManagedEnemyIds() {
    return new Set(this.#zones.flatMap((zone) => zone.enemyIds));
  }

  #validateCollections(combatZones, enemies) {
    const hasZones = Array.isArray(combatZones) &&
      combatZones.every((zone) => zone instanceof CombatZone);
    const hasEnemies = Array.isArray(enemies) &&
      enemies.every((enemy) => typeof enemy?.id === "string");
    const uniqueEnemyIds = new Set(enemies.map((enemy) => enemy.id));
    if (hasZones && hasEnemies && uniqueEnemyIds.size === enemies.length) return;
    throw new TypeError("Die Kampfphasen-Daten sind ungültig.");
  }

  #validateEnemyReferences() {
    const referencedIds = this.#zones.flatMap((zone) => zone.enemyIds);
    const allExist = referencedIds.every((id) => this.#enemiesById.has(id));
    const uniqueReferences = new Set(referencedIds);
    if (allExist && uniqueReferences.size === referencedIds.length) return;
    throw new RangeError("Kampfzonen enthalten unbekannte oder doppelte Gegner.");
  }
}
