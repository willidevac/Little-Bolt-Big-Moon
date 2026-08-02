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
import { WORLD_ENTITY_GROUPS } from "./world-entity-groups.js";
import { Camera } from "./camera.class.js";
import { GameplayEventHub, GAMEPLAY_EVENTS } from "./gameplay-event-hub.class.js";
import { WorldEntityRegistry } from "./world-entity-registry.class.js";
import { WorldSceneBuilder } from "./world-scene-builder.class.js";

export { WORLD_ENTITY_GROUPS } from "./world-entity-groups.js";
const UPDATE_ORDER = Object.freeze([
  WORLD_ENTITY_GROUPS.PLATFORMS,
  WORLD_ENTITY_GROUPS.DECORATIONS,
  WORLD_ENTITY_GROUPS.CHARACTERS,
  WORLD_ENTITY_GROUPS.ENEMIES,
  WORLD_ENTITY_GROUPS.PROJECTILES,
  WORLD_ENTITY_GROUPS.COLLECTABLES,
  WORLD_ENTITY_GROUPS.HAZARDS,
]);
const NON_PLATFORM_UPDATE_ORDER = Object.freeze(UPDATE_ORDER.slice(1));

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

  #initializeEntityState() {
    this.#entityRegistry = new WorldEntityRegistry(
      Object.values(WORLD_ENTITY_GROUPS),
    );
    this.#sceneBuilder = new WorldSceneBuilder(this.level);
    this.#collectedPickups = [];
    this.#damageEvents = [];
  }

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

  #updateMovingEntities(movableObjects, deltaTimeSeconds) {
    this.#updateEntityGroups([WORLD_ENTITY_GROUPS.PLATFORMS], deltaTimeSeconds);
    this.#platformMotionSystem.carryGroundMovables(movableObjects);
    this.#updateEntityGroups(NON_PLATFORM_UPDATE_ORDER, deltaTimeSeconds);
  }

  #resolveInteractions(movableObjects, deltaTimeSeconds) {
    this.#damageEvents.push(...this.#projectileSystem.resolve(this));
    this.#resolveEnemyCombat(deltaTimeSeconds);
    this.#collisionManager.resetGroundStates(movableObjects);
    this.#resolvePlatformLandings(movableObjects, deltaTimeSeconds);
    this.#resolveCollectablePickups();
    this.#resolveHazardHits();
  }

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
    this.#renderer.draw(this.#entityRegistry.getGroupsView(), this.camera, this);
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

  #resolvePlatformLandings(movableObjects, deltaTimeSeconds) {
    const platforms = this.#getGroup(WORLD_ENTITY_GROUPS.PLATFORMS);
    this.#collisionManager.resolvePlatformLandings(
      movableObjects,
      platforms,
      deltaTimeSeconds,
    );
  }

  #getGroundMovables() {
    const characters = this.#getGroup(WORLD_ENTITY_GROUPS.CHARACTERS);
    const enemies = this.#getGroup(WORLD_ENTITY_GROUPS.ENEMIES);
    const groundEnemies = enemies.filter((enemy) => enemy.isAffectedByGravity);
    return [...characters, ...groundEnemies];
  }

  #updateEntityGroups(groupOrder, deltaTimeSeconds) {
    this.#processEntities(groupOrder, (entity) => {
      if (typeof entity.update === "function") {
        entity.update(deltaTimeSeconds, this);
      }
    });
  }

  #resolveEnemyCombat(deltaTimeSeconds) {
    const hit = this.#enemyCombatSystem.resolve(this, deltaTimeSeconds);
    if (hit) this.#damageEvents.push(hit);
  }

  #resolveCollectablePickups() {
    if (!this.character) return;
    const collectables = this.#getGroup(WORLD_ENTITY_GROUPS.COLLECTABLES);
    const overlaps = collectables.filter((collectable) => {
      return collectable.isAvailable !== false &&
        this.#collisionManager.areOverlapping(this.character, collectable);
    });
    overlaps.forEach((collectable) => this.#collect(collectable));
  }

  #collect(collectable) {
    const pickup = collectable.getPickup();
    this.#collectedPickups.push(pickup);
    this.gameplayEvents.emit(GAMEPLAY_EVENTS.PICKUP, pickup);
    this.removeEntity(WORLD_ENTITY_GROUPS.COLLECTABLES, collectable);
  }

  #resolveHazardHits() {
    if (!this.character) return;
    const hazards = this.#getGroup(WORLD_ENTITY_GROUPS.HAZARDS);
    const hazard = hazards.find((candidate) => {
      return candidate.isDangerous &&
        this.#collisionManager.areOverlapping(this.character, candidate);
    });
    const hit = hazard?.createHit(this.character);
    if (hit) this.#damageEvents.push(hit);
  }

  #processEntities(groupOrder, callback) {
    this.#entityRegistry.process(groupOrder, callback);
  }

  #getGroup(groupName) {
    return this.#entityRegistry.getGroupView(groupName);
  }
}
