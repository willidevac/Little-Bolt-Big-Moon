import { CollisionManager } from "../systems/collision-manager.class.js";
import { FallTracker } from "../systems/fall-tracker.class.js";
import { ProjectileSystem } from "../systems/projectile-system.class.js";
import { EnemyCombatSystem } from "../systems/enemy-combat-system.class.js";
import { WaveManager } from "../systems/wave-manager.class.js";
import { BossFightManager } from "../systems/boss-fight-manager.class.js";
import { WorldEventReporter } from "../systems/world-event-reporter.class.js";
import { PlatformMotionSystem } from "../systems/platform-motion-system.class.js";
import { VisualFeedbackSystem } from "../systems/visual-feedback-system.class.js";
import { WorldRenderer } from "../systems/world-renderer.class.js";
import { StructureCollisionSystem } from
  "../systems/structure-collision-system.class.js";
import { WORLD_ENTITY_GROUPS } from "./world-entity-groups.js";
import { Camera } from "./camera.class.js";
import { GameplayEventHub, GAMEPLAY_EVENTS } from "./gameplay-event-hub.class.js";
import { WorldEntityRegistry } from "./world-entity-registry.class.js";
import { WorldSceneBuilder } from "./world-scene-builder.class.js";

export { WORLD_ENTITY_GROUPS } from "./world-entity-groups.js";
const UPDATE_ORDER = Object.freeze([
  WORLD_ENTITY_GROUPS.STRUCTURES,
  WORLD_ENTITY_GROUPS.PLATFORMS,
  WORLD_ENTITY_GROUPS.DECORATIONS,
  WORLD_ENTITY_GROUPS.CHARACTERS,
  WORLD_ENTITY_GROUPS.ENEMIES,
  WORLD_ENTITY_GROUPS.PROJECTILES,
  WORLD_ENTITY_GROUPS.COLLECTABLES,
  WORLD_ENTITY_GROUPS.HAZARDS,
]);
const NON_PLATFORM_UPDATE_ORDER = Object.freeze(UPDATE_ORDER.slice(2));

/**
 * Coordinates active game objects and the systems of a world frame.
 */
export class World {
  #entityRegistry;
  #collisionManager;
  #fallTracker;
  #collectedPickups;
  #damageEvents;
  #projectileSystem;
  #enemyCombatSystem;
  #platformMotionSystem;
  #structureCollisionSystem;
  #renderer;
  #sceneBuilder;

  /**
   * @param {CanvasRenderingContext2D} context
   * @param {Readonly<object>} config
   * @param {Readonly<object>|null} [input=null]
   * @param {Readonly<object>|null} [level=null]
   * @param {GameplayEventHub} [gameplayEvents]
   */
  constructor(context, config, input = null, level = null,
    gameplayEvents = new GameplayEventHub()) {
    Object.assign(this, { context, config, input, level, gameplayEvents });
    this.eventReporter = new WorldEventReporter(gameplayEvents);
    this.feedback = new VisualFeedbackSystem(gameplayEvents, () => this.character);
    this.isInitialized = false;
    this.#initializeEntityState();
    this.#initializeSimulation(config);
    this.waveManager = new WaveManager(level?.combatZones, level?.enemies, level?.platforms);
    this.bossFight = new BossFightManager(level?.enemies);
    this.character = null;
    this.camera = new Camera(config);
    this.#renderer = new WorldRenderer(context, config, level?.sections);
  }

  /** Initializes entity state. */
  #initializeEntityState() {
    this.#entityRegistry = new WorldEntityRegistry(
      Object.values(WORLD_ENTITY_GROUPS),
    );
    this.#sceneBuilder = new WorldSceneBuilder(this.level);
    this.#collectedPickups = [];
    this.#damageEvents = [];
  }

  /** Initializes simulation. */
  #initializeSimulation(config) {
    this.#collisionManager = new CollisionManager(config.physics);
    this.#fallTracker = new FallTracker(config.world);
    this.#projectileSystem = new ProjectileSystem(
      config.projectiles,
      this.#collisionManager,
    );
    this.#enemyCombatSystem = new EnemyCombatSystem(
      config.enemyCombat,
      this.#collisionManager,
    );
    this.#platformMotionSystem = new PlatformMotionSystem();
    this.#structureCollisionSystem = new StructureCollisionSystem(config.physics);
  }

  /** @returns {boolean} Whether the world was newly activated. */
  initialize() {
    if (this.isInitialized) return false;
    this.character = this.#sceneBuilder.build(this);
    this.camera.reset(this.character);
    this.#fallTracker.reset(this.character);
    this.isInitialized = true;
    return true;
  }

  /**
   * Adds a game object to a validated group.
   * @param {string} groupName
   * @param {object} entity
   * @returns {boolean} Whether the object was newly queued or added.
   */
  addEntity(groupName, entity) {
    return this.#entityRegistry.add(groupName, entity);
  }

  /**
   * Removes a game object without mutating active iterations.
   * @param {string} groupName
   * @param {object} entity
   * @returns {boolean} Whether the object was active or queued.
   */
  removeEntity(groupName, entity) {
    return this.#entityRegistry.remove(groupName, entity);
  }

  /** @returns {ReadonlyArray<object>} Snapshot of an entity group. */
  getEntities(groupName) {
    return this.#entityRegistry.getSnapshot(groupName);
  }

  /**
   * Updates all eligible entities in a fixed order.
   * @param {number} deltaTimeSeconds
   */
  update(deltaTimeSeconds) {
    if (!this.isInitialized) return;
    this.eventReporter.capture(this.character, this.bossFight.getSnapshot());
    const groundMovables = this.#getGroundMovables();
    this.#updateMovingEntities(groundMovables, deltaTimeSeconds);
    this.#resolveInteractions(groundMovables, deltaTimeSeconds);
    this.#updateWorldSystems(deltaTimeSeconds);
    this.eventReporter.report(this.character, this.bossFight.getSnapshot());
  }

  /** Updates moving entities. */
  #updateMovingEntities(movableObjects, deltaTimeSeconds) {
    this.#updateEntityGroups([WORLD_ENTITY_GROUPS.STRUCTURES], deltaTimeSeconds);
    this.#updateEntityGroups([WORLD_ENTITY_GROUPS.PLATFORMS], deltaTimeSeconds);
    this.#platformMotionSystem.carryGroundMovables(movableObjects);
    this.#updateEntityGroups(NON_PLATFORM_UPDATE_ORDER, deltaTimeSeconds);
  }

  /** Returns resolve interactions. */
  #resolveInteractions(movableObjects, deltaTimeSeconds) {
    this.#damageEvents.push(...this.#projectileSystem.resolve(this));
    this.#resolveEnemyCombat(deltaTimeSeconds);
    this.#collisionManager.resetGroundStates(movableObjects);
    this.#resolveStructureCollisions(deltaTimeSeconds);
    this.#resolvePlatformLandings(movableObjects, deltaTimeSeconds);
    this.#resolveCollectablePickups();
    this.#resolveHazardHits();
  }

  /** Updates world systems. */
  #updateWorldSystems(deltaTimeSeconds) {
    this.waveManager.update(this);
    this.bossFight.update(this);
    this.#fallTracker.update(this.character);
    this.feedback.update(deltaTimeSeconds);
    const fall = this.#fallTracker.takeCompletedFall();
    if (fall) this.gameplayEvents.emit(GAMEPLAY_EVENTS.PLAYER_FALL, fall);
    this.camera.update(this.character, deltaTimeSeconds);
  }

  /** @returns {number} Height lost since reaching the highest point. */
  getHeightLossPixels() {
    return this.#fallTracker.getHeightLossPixels();
  }

  /** @returns {boolean} Whether Byte reached the lower death zone. */
  isCharacterInDeathZone() {
    if (!this.character) return false;
    return this.#fallTracker.hasReachedDeathZone(this.character);
  }

  /**
   * Places the fresh character at a validated alternate run start.
   * @param {Readonly<{x:number,y:number}>} position
   * @returns {boolean}
   */
  placeCharacterAt(position) {
    const values = [position?.x, position?.y];
    if (!this.character || !values.every(Number.isFinite)) return false;
    Object.assign(this.character, {
      x: position.x, y: position.y, velocityX: 0, velocityY: 0,
    });
    this.character.setOnGround(false);
    this.camera.reset(this.character);
    this.#fallTracker.reset(this.character);
    return true;
  }

  /**
   * Converts a new ranged attack into a projectile.
   * @param {Readonly<object>|null} attack
   * @returns {import("../entities/weapons/bolt-projectile.class.js").BoltProjectile|null}
   */
  handlePlayerAttack(attack) {
    if (attack) {
      this.gameplayEvents.emit(GAMEPLAY_EVENTS.PLAYER_ATTACK, {
        weaponId: attack.weaponId,
      });
    }
    this.#enemyCombatSystem.resolvePlayerAttack(attack, this);
    return this.#projectileSystem.spawn(attack, this);
  }

  /** @returns {ReadonlyArray<Readonly<object>>} All new pickups exactly once. */
  takeCollectedPickups() {
    const pickups = Object.freeze([...this.#collectedPickups]);
    this.#collectedPickups.length = 0;
    return pickups;
  }

  /** Passes defeated enemies to the run score exactly once. */
  takeDefeatedEnemies() {
    return this.#enemyCombatSystem.takeDefeatedEnemies();
  }

  /** @returns {ReadonlyArray<Readonly<object>>} New hits exactly once. */
  takeDamageEvents() {
    const events = Object.freeze([...this.#damageEvents]);
    this.#damageEvents.length = 0;
    return events;
  }

  /** Draws all entities in a fixed layer order. */
  draw() {
    if (!this.isInitialized) return;
    this.#renderer.draw(
      this.#entityRegistry.getGroupsSnapshot(),
      this.camera,
      this,
    );
  }

  /** Removes all active and queued entities. */
  clear() {
    this.#collectedPickups.length = 0;
    this.#damageEvents.length = 0;
    this.#entityRegistry.clear();
  }

  /** Clears and deactivates the world for a controlled rebuild. */
  destroy() {
    this.clear();
    this.feedback.destroy();
    this.camera.reset();
    this.isInitialized = false;
  }

  /** Returns resolve platform landings. */
  #resolvePlatformLandings(movableObjects, deltaTimeSeconds) {
    const platforms = this.#getGroup(WORLD_ENTITY_GROUPS.PLATFORMS);
    const landings = this.#collisionManager.resolvePlatformLandings(
      movableObjects,
      platforms,
      deltaTimeSeconds,
    );
    landings.forEach((landing) => this.#reportPlatformActivation(landing));
  }

  /** Reports a mechanic activated by Byte's landing. */
  #reportPlatformActivation({ movableObject, platform, activated }) {
    if (movableObject !== this.character || !activated || !platform.mechanic) return;
    this.gameplayEvents.emit(GAMEPLAY_EVENTS.PLATFORM_ACTIVATED, {
      id: platform.id, mechanic: platform.mechanic,
    });
  }

  /** Returns resolve structure collisions. */
  #resolveStructureCollisions(deltaTimeSeconds) {
    if (!this.character) return;
    const structures = this.#getGroup(WORLD_ENTITY_GROUPS.STRUCTURES);
    this.#structureCollisionSystem.resolve(
      this.character,
      structures,
      deltaTimeSeconds,
      this.config.character,
    );
  }

  /** Returns ground movables. */
  #getGroundMovables() {
    const characters = this.#getGroup(WORLD_ENTITY_GROUPS.CHARACTERS);
    const enemies = this.#getGroup(WORLD_ENTITY_GROUPS.ENEMIES);
    const groundEnemies = enemies.filter((enemy) => enemy.isAffectedByGravity);
    return [...characters, ...groundEnemies];
  }

  /** Updates entity groups. */
  #updateEntityGroups(groupOrder, deltaTimeSeconds) {
    this.#processEntities(groupOrder, (entity) => {
      if (typeof entity.update === "function") {
        entity.update(deltaTimeSeconds, this);
      }
    });
  }

  /** Returns resolve enemy combat. */
  #resolveEnemyCombat(deltaTimeSeconds) {
    const hit = this.#enemyCombatSystem.resolve(this, deltaTimeSeconds);
    if (hit) this.#damageEvents.push(hit);
  }

  /** Returns resolve collectable pickups. */
  #resolveCollectablePickups() {
    if (!this.character) return;
    const collectables = this.#getGroup(WORLD_ENTITY_GROUPS.COLLECTABLES);
    const overlaps = collectables.filter((collectable) => {
      return collectable.isAvailable !== false &&
        this.#collisionManager.areOverlapping(this.character, collectable);
    });
    overlaps.forEach((collectable) => this.#collect(collectable));
  }

  /** Collects world entities. */
  #collect(collectable) {
    const pickup = collectable.getPickup();
    this.#collectedPickups.push(pickup);
    this.gameplayEvents.emit(GAMEPLAY_EVENTS.PICKUP, pickup);
    this.removeEntity(WORLD_ENTITY_GROUPS.COLLECTABLES, collectable);
  }

  /** Returns resolve hazard hits. */
  #resolveHazardHits() {
    if (!this.character) return;
    const hazard = this.#getDamageSources().find((candidate) => {
      return candidate.isDangerous &&
        (candidate.wasTouchedBy?.(this.character) ||
          this.#collisionManager.areOverlapping(this.character, candidate));
    });
    const hit = hazard?.createHit(this.character);
    if (hit) this.#damageEvents.push(hit);
  }

  /** Returns damage sources. */
  #getDamageSources() {
    return [
      ...this.#getGroup(WORLD_ENTITY_GROUPS.HAZARDS),
      ...this.#getDamageSourcesFrom(WORLD_ENTITY_GROUPS.STRUCTURES),
      ...this.#getDamageSourcesFrom(WORLD_ENTITY_GROUPS.PLATFORMS),
    ];
  }

  /** Returns damage sources from. */
  #getDamageSourcesFrom(groupName) {
    return this.#getGroup(groupName).filter((candidate) => {
      return typeof candidate.createHit === "function";
    });
  }

  /** Updates process entities. */
  #processEntities(groupOrder, callback) {
    this.#entityRegistry.process(groupOrder, callback);
  }

  /** Returns group. */
  #getGroup(groupName) {
    return this.#entityRegistry.getSnapshot(groupName);
  }
}
