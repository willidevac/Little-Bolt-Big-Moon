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
   * Creates the configured system.
   * @param {ReadonlyArray<CombatZone>} combatZones Combat zones managed during the level.
   * @param {ReadonlyArray<object>} enemies Enemy entities managed by the system.
   * @param {ReadonlyArray<object>} platforms Platforms managed during the level.
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
    this.#validateZoneReferences();
  }

  /**
   * Adds only enemies without an arena assignment to the safe starting area.
   * @param {import("../core/world.class.js").World} world Active world providing entities and runtime state.
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
   * @param {import("../core/world.class.js").World} world Active world providing entities and runtime state.
   */
  update(world) {
    if (!this.#isInitialized) return;
    this.#completeFinishedZones(world);
    const activeEnemyIds = this.#getLivingEnemyIds(world);
    const completedZoneIds = this.#getCompletedZoneIds();
    const waitingZone = this.#zones.find((zone) => {
      return zone.canTrigger(world.character, activeEnemyIds, completedZoneIds);
    });
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
   * @param {string} zoneId Zone id used while get zone snapshot.
   * @returns {Readonly<object>}
   */
  getZoneSnapshot(zoneId) {
    const zone = this.#zones.find((candidate) => candidate.id === zoneId);
    if (zone) return zone.getSnapshot();
    throw new RangeError(`Unbekannte Kampfzone: ${zoneId}`);
  }

  /**
   * Restores one deferred encounter and silently satisfies prerequisites.
   * @param {string} zoneId Zone id used while restore zone.
   * @param {Readonly<object>} world Active world providing entities and runtime state.
   */
  restoreZone(zoneId, world) {
    const zone = this.#zones.find(({ id }) => id === zoneId);
    if (!zone) throw new RangeError(`Unbekannte Kampfzone: ${zoneId}`);
    if (zone.state !== COMBAT_ZONE_STATES.WAITING) return false;
    this.#restorePrerequisite(zone, world);
    return this.#activate(zone, world);
  }

  /**
   * Performs the activate operation.
   * @param {Readonly<object>} zone Zone used while activate.
   * @param {Readonly<object>} world Active world providing entities and runtime state.
   */
  #activate(zone, world) {
    if (!zone.activate()) return false;
    zone.enemyIds.forEach((enemyId) => {
      world.addEntity(
        WORLD_ENTITY_GROUPS.ENEMIES,
        this.#enemiesById.get(enemyId),
      );
    });
    return true;
  }

  /**
   * Silently marks an earlier zone complete and removes its remaining actors.
   * @param {Readonly<object>} zone Zone used while restore prerequisite.
   * @param {Readonly<object>} world Active world providing entities and runtime state.
   */
  #restorePrerequisite(zone, world) {
    if (!zone.triggerZoneId) return;
    const prerequisite = this.#zones.find(({ id }) => id === zone.triggerZoneId);
    this.#restorePrerequisite(prerequisite, world);
    prerequisite.activate();
    prerequisite.complete();
    this.#removeZoneActors(prerequisite, world);
  }

  /**
   * Removes enemies and defeat triggers belonging to a restored prior zone.
   * @param {Readonly<object>} zone Zone used while remove zone actors.
   * @param {Readonly<object>} world Active world providing entities and runtime state.
   */
  #removeZoneActors(zone, world) {
    const ids = new Set([...zone.enemyIds, zone.triggerEnemyId].filter(Boolean));
    world.getEntities(WORLD_ENTITY_GROUPS.ENEMIES)
      .filter(({ id }) => ids.has(id))
      .forEach((enemy) => world.removeEntity(WORLD_ENTITY_GROUPS.ENEMIES, enemy));
  }

  /**
   * Checks the ended condition.
   * @param {Readonly<object>} zone Zone used while has ended.
   * @param {Readonly<object>} world Active world providing entities and runtime state.
   */
  #hasEnded(zone, world) {
    const activeEnemyIds = this.#getActiveEnemyIds(world);
    return zone.enemyIds.every((enemyId) => !activeEnemyIds.has(enemyId));
  }

  /**
   * Returns currently active enemy identities.
   * @param {Readonly<object>} world Active world providing entities and runtime state.
   */
  #getActiveEnemyIds(world) {
    return new Set(
      world.getEntities(WORLD_ENTITY_GROUPS.ENEMIES).map(({ id }) => id),
    );
  }

  /**
   * Returns living enemy identities for defeat-triggered encounters.
   * @param {Readonly<object>} world Active world providing entities and runtime state.
   */
  #getLivingEnemyIds(world) {
    return new Set(
      world.getEntities(WORLD_ENTITY_GROUPS.ENEMIES)
        .filter(({ isDead }) => !isDead).map(({ id }) => id),
    );
  }

  /** Returns every completed encounter identity. */
  #getCompletedZoneIds() {
    return new Set(this.#zones
      .filter(({ state }) => state === COMBAT_ZONE_STATES.COMPLETED)
      .map(({ id }) => id));
  }

  /**
   * Performs the complete operation.
   * @param {Readonly<object>} zone Zone used while complete.
   * @param {Readonly<object>} world Active world providing entities and runtime state.
   */
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

  /**
   * Performs the lock progression platforms operation.
   * @param {Readonly<object>} world Active world providing entities and runtime state.
   */
  #lockProgressionPlatforms(world) {
    this.#zones.forEach((zone) => {
      const platform = this.#getUnlockPlatform(zone);
      if (platform) world.removeEntity(WORLD_ENTITY_GROUPS.PLATFORMS, platform);
    });
  }

  /**
   * Performs the unlock progression platform operation.
   * @param {Readonly<object>} zone Zone used while unlock progression platform.
   * @param {Readonly<object>} world Active world providing entities and runtime state.
   */
  #unlockProgressionPlatform(zone, world) {
    const platform = this.#getUnlockPlatform(zone);
    if (platform) world.addEntity(WORLD_ENTITY_GROUPS.PLATFORMS, platform);
  }

  /**
   * Returns unlock platform.
   * @param {Readonly<object>} zone Zone used while get unlock platform.
   */
  #getUnlockPlatform(zone) {
    if (!zone.unlockPlatformId) return null;
    return this.#platformsById.get(zone.unlockPlatformId) ?? null;
  }

  /**
   * Performs the complete finished zones operation.
   * @param {Readonly<object>} world Active world providing entities and runtime state.
   */
  #completeFinishedZones(world) {
    this.#zones.filter((zone) => {
      return zone.state === COMBAT_ZONE_STATES.ACTIVE &&
        this.#hasEnded(zone, world);
    }).forEach((zone) => {
      this.#complete(zone, world);
    });
  }

  /** Collects managed enemy ids. */
  #collectManagedEnemyIds() {
    return new Set(this.#zones.flatMap((zone) => zone.enemyIds));
  }

  /**
   * Validates collections.
   * @param {ReadonlyArray<object>} combatZones Combat zones managed during the level.
   * @param {ReadonlyArray<object>} enemies Enemy entities managed by the system.
   * @param {ReadonlyArray<object>} platforms Platforms managed during the level.
   */
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

  /** Validates platform references. */
  #validatePlatformReferences() {
    if (this.#platformsById.size === 0) return;
    const ids = this.#zones.flatMap((zone) => {
      return zone.unlockPlatformId ? [zone.unlockPlatformId] : [];
    });
    const allExist = ids.every((id) => this.#platformsById.has(id));
    if (allExist && new Set(ids).size === ids.length) return;
    throw new RangeError("Bossausgänge sind unbekannt oder doppelt vergeben.");
  }

  /** Validates enemy references. */
  #validateEnemyReferences() {
    const referencedIds = this.#zones.flatMap((zone) => zone.enemyIds);
    const triggerIds = this.#zones.flatMap((zone) => {
      return zone.triggerEnemyId ? [zone.triggerEnemyId] : [];
    });
    const allExist = referencedIds.every((id) => this.#enemiesById.has(id));
    const triggersExist = triggerIds.every((id) => this.#enemiesById.has(id));
    const uniqueReferences = new Set(referencedIds);
    if (allExist && triggersExist &&
      uniqueReferences.size === referencedIds.length) return;
    throw new RangeError("Kampfzonen enthalten unbekannte oder doppelte Gegner.");
  }

  /** Validates every zone-to-zone dependency without self references. */
  #validateZoneReferences() {
    const ids = new Set(this.#zones.map(({ id }) => id));
    const dependencies = this.#zones.filter(({ triggerZoneId }) => triggerZoneId);
    const allExist = dependencies.every(({ triggerZoneId }) => {
      return ids.has(triggerZoneId);
    });
    const noSelfReferences = dependencies.every((zone) => {
      return zone.triggerZoneId !== zone.id;
    });
    if (allExist && noSelfReferences) return;
    throw new RangeError("Kampfzonen-Abhängigkeiten sind ungültig.");
  }
}
