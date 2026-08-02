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
 * Koordiniert aktive Spielobjekte und die Systeme eines Weltframes.
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

  /** @returns {boolean} Ob die Welt neu aktiviert wurde. */
  initialize() {
    if (this.isInitialized) return false;
    this.character = this.#sceneBuilder.build(this);
    this.camera.reset(this.character);
    this.#fallTracker.reset(this.character);
    this.isInitialized = true;
    return true;
  }

  /**
   * Fügt ein Spielobjekt einer geprüften Gruppe hinzu.
   * @param {string} groupName
   * @param {object} entity
   * @returns {boolean} Ob das Objekt neu vorgemerkt oder eingefügt wurde.
   */
  addEntity(groupName, entity) {
    return this.#entityRegistry.add(groupName, entity);
  }

  /**
   * Entfernt ein Spielobjekt, ohne laufende Iterationen zu verändern.
   * @param {string} groupName
   * @param {object} entity
   * @returns {boolean} Ob das Objekt vorhanden oder vorgemerkt war.
   */
  removeEntity(groupName, entity) {
    return this.#entityRegistry.remove(groupName, entity);
  }

  /** @returns {ReadonlyArray<object>} Momentaufnahme einer Entitätsgruppe. */
  getEntities(groupName) {
    return this.#entityRegistry.getSnapshot(groupName);
  }

  /**
   * Aktualisiert alle dafür geeigneten Entitäten in fester Reihenfolge.
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

  /** @returns {number} Die seit dem höchsten Punkt verlorene Höhe. */
  getHeightLossPixels() {
    return this.#fallTracker.getHeightLossPixels();
  }

  /** @returns {boolean} Ob Byte die untere Todeszone erreicht hat. */
  isCharacterInDeathZone() {
    if (!this.character) return false;
    return this.#fallTracker.hasReachedDeathZone(this.character);
  }

  /**
   * Wandelt einen neuen Fernkampfangriff in ein Projektil um.
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

  /** @returns {ReadonlyArray<Readonly<object>>} Alle neuen Funde genau einmal. */
  takeCollectedPickups() {
    const pickups = Object.freeze([...this.#collectedPickups]);
    this.#collectedPickups.length = 0;
    return pickups;
  }

  /** Übergibt besiegte Gegner genau einmal an die Laufwertung. */
  takeDefeatedEnemies() {
    return this.#enemyCombatSystem.takeDefeatedEnemies();
  }

  /** @returns {ReadonlyArray<Readonly<object>>} Neue Treffer genau einmal. */
  takeDamageEvents() {
    const events = Object.freeze([...this.#damageEvents]);
    this.#damageEvents.length = 0;
    return events;
  }

  /** Zeichnet alle Entitäten in fester Ebenenreihenfolge. */
  draw() {
    if (!this.isInitialized) return;
    this.#renderer.draw(this.#entityRegistry.getGroupsView(), this.camera, this);
  }

  /** Entfernt alle aktiven und vorgemerkten Entitäten. */
  clear() {
    this.#collectedPickups.length = 0;
    this.#damageEvents.length = 0;
    this.#entityRegistry.clear();
  }

  /** Leert und deaktiviert die Welt für einen kontrollierten Neuaufbau. */
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
      return this.#collisionManager.areOverlapping(this.character, candidate);
    });
    if (hazard) this.#damageEvents.push(hazard.createHit(this.character));
  }

  #processEntities(groupOrder, callback) {
    this.#entityRegistry.process(groupOrder, callback);
  }

  #getGroup(groupName) {
    return this.#entityRegistry.getGroupView(groupName);
  }
}
