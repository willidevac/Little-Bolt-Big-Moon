import { CombatZone, COMBAT_ZONE_STATES } from "../environment/combat-zone.class.js";
import { WORLD_ENTITY_GROUPS } from "../core/world-entity-groups.js";
import { GAMEPLAY_EVENTS } from "../core/gameplay-event-hub.class.js";

/**
 * Activates encounters and opens boss exits after victory.
 */
export class WaveManager {
  #zones;
  #enemiesById;
  #managedEnemyIds;
  #completedWaves;
  #platformsById;
  #isInitialized;

  /**
   * @param {ReadonlyArray<CombatZone>} combatZones
   * @param {ReadonlyArray<object>} enemies
   * @param {ReadonlyArray<object>} platforms
   */
  constructor(combatZones = [], enemies = [], platforms = []) {
    this.#validateCollections(combatZones, enemies, platforms);
    this.#zones = Object.freeze([...combatZones]);
    this.#enemiesById = new Map(enemies.map((enemy) => [enemy.id, enemy]));
    this.#platformsById = new Map(
      platforms.map((platform) => [platform.id, platform]),
    );
    this.#managedEnemyIds = this.#collectManagedEnemyIds();
    this.#completedWaves = [];
    this.#isInitialized = false;
    this.#validateEnemyReferences();
    this.#validatePlatformReferences();
  }

  /**
   * Adds only enemies without an arena assignment to the safe starting area.
   * @param {import("../core/world.class.js").World} world
   * @returns {boolean}
   */
  initialize(world) {
    if (this.#isInitialized) return false;
    this.#lockProgressionPlatforms(world);
    this.#enemiesById.forEach((enemy, id) => {
      if (!this.#managedEnemyIds.has(id)) {
        world.addEntity(WORLD_ENTITY_GROUPS.ENEMIES, enemy);
      }
    });
    this.#isInitialized = true;
    return true;
  }

  /**
   * Completes active encounters and triggers the next reached zone.
   * @param {import("../core/world.class.js").World} world
   */
  update(world) {
    if (!this.#isInitialized) return;
    this.#completeFinishedZones(world);
    const waitingZone = this.#zones.find((zone) => zone.canTrigger(world.character));
    if (waitingZone) this.#activate(waitingZone, world);
  }

  /**
   * Passes each completion to the next game system exactly once.
   * @returns {ReadonlyArray<Readonly<object>>}
   */
  takeCompletedWaves() {
    const completed = Object.freeze([...this.#completedWaves]);
    this.#completedWaves.length = 0;
    return completed;
  }

  /**
   * Returns the state of a specific arena.
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
    const completion = Object.freeze({
      id: zone.id,
      unlockPlatformId: zone.unlockPlatformId,
    });
    this.#completedWaves.push(completion);
    this.#unlockProgressionPlatform(zone, world);
    world.gameplayEvents.emit(GAMEPLAY_EVENTS.WAVE_COMPLETE, completion);
  }

  #lockProgressionPlatforms(world) {
    this.#zones.forEach((zone) => {
      const platform = this.#getUnlockPlatform(zone);
      if (platform) world.removeEntity(WORLD_ENTITY_GROUPS.PLATFORMS, platform);
    });
  }

  #unlockProgressionPlatform(zone, world) {
    const platform = this.#getUnlockPlatform(zone);
    if (platform) world.addEntity(WORLD_ENTITY_GROUPS.PLATFORMS, platform);
  }

  #getUnlockPlatform(zone) {
    if (!zone.unlockPlatformId) return null;
    return this.#platformsById.get(zone.unlockPlatformId) ?? null;
  }

  #completeFinishedZones(world) {
    this.#zones.filter((zone) => {
      return zone.state === COMBAT_ZONE_STATES.ACTIVE &&
        this.#hasEnded(zone, world);
    }).forEach((zone) => {
      this.#complete(zone, world);
    });
  }

  #collectManagedEnemyIds() {
    return new Set(this.#zones.flatMap((zone) => zone.enemyIds));
  }

  #validateCollections(combatZones, enemies, platforms) {
    const hasZones = Array.isArray(combatZones) &&
      combatZones.every((zone) => zone instanceof CombatZone);
    const hasEnemies = Array.isArray(enemies) &&
      enemies.every((enemy) => typeof enemy?.id === "string");
    const hasPlatforms = Array.isArray(platforms) &&
      platforms.every((platform) => typeof platform?.id === "string");
    const uniqueEnemyIds = new Set(enemies.map((enemy) => enemy.id));
    if (hasZones && hasEnemies && hasPlatforms &&
      uniqueEnemyIds.size === enemies.length) return;
    throw new TypeError("Die Kampfphasen-Daten sind ungültig.");
  }

  #validatePlatformReferences() {
    if (this.#platformsById.size === 0) return;
    const ids = this.#zones.flatMap((zone) => {
      return zone.unlockPlatformId ? [zone.unlockPlatformId] : [];
    });
    const allExist = ids.every((id) => this.#platformsById.has(id));
    if (allExist && new Set(ids).size === ids.length) return;
    throw new RangeError("Bossausgänge sind unbekannt oder doppelt vergeben.");
  }

  #validateEnemyReferences() {
    const referencedIds = this.#zones.flatMap((zone) => zone.enemyIds);
    const allExist = referencedIds.every((id) => this.#enemiesById.has(id));
    const uniqueReferences = new Set(referencedIds);
    if (allExist && uniqueReferences.size === referencedIds.length) return;
    throw new RangeError("Kampfzonen enthalten unbekannte oder doppelte Gegner.");
  }
}
