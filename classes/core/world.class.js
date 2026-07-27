import { CollisionManager } from "../systems/collision-manager.class.js";
import { FallTracker } from "../systems/fall-tracker.class.js";
import { CollisionDebugRenderer } from "../systems/collision-debug-renderer.class.js";
import { ProjectileSystem } from "../systems/projectile-system.class.js";
import { Character } from "../entities/character.class.js";
import { Platform } from "../environment/platform.class.js";
import { WORLD_ENTITY_GROUPS } from "./world-entity-groups.js";
import { Camera } from "./camera.class.js";

export { WORLD_ENTITY_GROUPS } from "./world-entity-groups.js";

const FALLBACK_CHARACTER_POSITION = Object.freeze({ x: 160, y: 240 });
const FALLBACK_PLATFORM_BOUNDS = Object.freeze({
  x: 96,
  y: 560,
  width: 512,
  height: 32,
});

const ENTITY_GROUP_NAMES = Object.freeze(Object.values(WORLD_ENTITY_GROUPS));
const UPDATE_ORDER = Object.freeze([
  WORLD_ENTITY_GROUPS.PLATFORMS,
  WORLD_ENTITY_GROUPS.CHARACTERS,
  WORLD_ENTITY_GROUPS.ENEMIES,
  WORLD_ENTITY_GROUPS.PROJECTILES,
  WORLD_ENTITY_GROUPS.COLLECTABLES,
  WORLD_ENTITY_GROUPS.HAZARDS,
]);
const DRAW_ORDER = Object.freeze([
  WORLD_ENTITY_GROUPS.PLATFORMS,
  WORLD_ENTITY_GROUPS.HAZARDS,
  WORLD_ENTITY_GROUPS.COLLECTABLES,
  WORLD_ENTITY_GROUPS.ENEMIES,
  WORLD_ENTITY_GROUPS.PROJECTILES,
  WORLD_ENTITY_GROUPS.CHARACTERS,
]);

/**
 * Verwaltet aktive Spielobjekte und ihren sicheren Frame-Lebenszyklus.
 */
export class World {
  #entityGroups;
  #pendingAdditions;
  #pendingRemovals;
  #isProcessing;
  #collisionManager;
  #fallTracker;
  #collectedPickups;
  #damageEvents;
  #collisionDebugRenderer;
  #projectileSystem;

  /**
   * @param {CanvasRenderingContext2D} context
   * @param {Readonly<object>} config
   * @param {Readonly<object>|null} [input=null]
   * @param {Readonly<object>|null} [level=null]
   */
  constructor(context, config, input = null, level = null) {
    this.context = context;
    this.config = config;
    this.input = input;
    this.level = level;
    this.isInitialized = false;
    this.#entityGroups = this.#createGroupMap(Array);
    this.#pendingAdditions = this.#createGroupMap(Set);
    this.#pendingRemovals = this.#createGroupMap(Set);
    this.#isProcessing = false;
    this.#collisionManager = new CollisionManager(config.physics);
    this.#fallTracker = new FallTracker(config.world);
    this.#collectedPickups = [];
    this.#damageEvents = [];
    this.#collisionDebugRenderer = new CollisionDebugRenderer(config.debug);
    this.#projectileSystem = new ProjectileSystem(
      config.projectiles,
      this.#collisionManager,
    );
    this.character = null;
    this.camera = new Camera(config);
  }

  /**
   * Aktiviert die Welt höchstens einmal.
   * @returns {boolean} Ob die Welt neu aktiviert wurde.
   */
  initialize() {
    if (this.isInitialized) return false;
    this.#addLevelPlatforms();
    this.#addLevelCollectables();
    this.#addLevelHazards();
    this.#ensureFallbackScene();
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
    this.#validateEntity(groupName, entity);
    const entities = this.#entityGroups.get(groupName);
    const additions = this.#pendingAdditions.get(groupName);
    const removals = this.#pendingRemovals.get(groupName);
    if (removals.delete(entity)) return true;
    if (entities.includes(entity) || additions.has(entity)) return false;
    if (!this.#isProcessing) entities.push(entity);
    else additions.add(entity);
    return true;
  }

  /**
   * Entfernt ein Spielobjekt, ohne laufende Iterationen zu verändern.
   * @param {string} groupName
   * @param {object} entity
   * @returns {boolean} Ob das Objekt vorhanden oder vorgemerkt war.
   */
  removeEntity(groupName, entity) {
    this.#validateEntity(groupName, entity);
    const additions = this.#pendingAdditions.get(groupName);
    if (additions.delete(entity)) return true;
    const entities = this.#entityGroups.get(groupName);
    if (!entities.includes(entity)) return false;
    if (this.#isProcessing) return this.#queueRemoval(groupName, entity);
    else entities.splice(entities.indexOf(entity), 1);
    return true;
  }

  /**
   * Liefert eine unveränderliche Momentaufnahme einer Entitätsgruppe.
   * @param {string} groupName
   * @returns {ReadonlyArray<object>}
   */
  getEntities(groupName) {
    this.#validateGroupName(groupName);
    return Object.freeze([...this.#entityGroups.get(groupName)]);
  }

  /**
   * Aktualisiert alle dafür geeigneten Entitäten in fester Reihenfolge.
   * @param {number} deltaTimeSeconds
   */
  update(deltaTimeSeconds) {
    if (!this.isInitialized) return;
    const characters = this.#entityGroups.get(WORLD_ENTITY_GROUPS.CHARACTERS);
    this.#processEntities(UPDATE_ORDER, (entity) => {
      if (typeof entity.update === "function") entity.update(deltaTimeSeconds, this);
    });
    this.#projectileSystem.resolve(this);
    this.#collisionManager.resetGroundStates(characters);
    this.#resolvePlatformLandings(deltaTimeSeconds);
    this.#resolveCollectablePickups();
    this.#resolveHazardHits();
    this.#fallTracker.update(this.character);
    this.camera.update(this.character, deltaTimeSeconds);
  }

  /**
   * Liefert die seit dem höchsten Punkt verlorene Höhe.
   * @returns {number}
   */
  getHeightLossPixels() {
    return this.#fallTracker.getHeightLossPixels();
  }

  /**
   * Prüft, ob Byte unter die untere Todeszone gefallen ist.
   * @returns {boolean}
   */
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
    return this.#projectileSystem.spawn(attack, this);
  }

  /**
   * Übergibt alle neuen Funde genau einmal an die Laufwerte.
   * @returns {ReadonlyArray<Readonly<{type:string, amount:number}>>}
   */
  takeCollectedPickups() {
    const pickups = Object.freeze([...this.#collectedPickups]);
    this.#collectedPickups.length = 0;
    return pickups;
  }

  /**
   * Übergibt neue Treffer genau einmal an die Kampfsteuerung.
   * @returns {ReadonlyArray<Readonly<{amount:number, direction:number}>>}
   */
  takeDamageEvents() {
    const events = Object.freeze([...this.#damageEvents]);
    this.#damageEvents.length = 0;
    return events;
  }

  /**
   * Zeichnet alle dafür geeigneten Entitäten in fester Ebenenreihenfolge.
   */
  draw() {
    if (!this.isInitialized) return;
    this.context.save();
    this.context.translate(-this.camera.x, -this.camera.y);
    try {
      this.#drawEntities();
      this.#collisionDebugRenderer.draw(this.context, this.#entityGroups);
    } finally {
      this.context.restore();
    }
  }

  #drawEntities() {
    this.#processEntities(DRAW_ORDER, (entity) => {
      if (typeof entity.draw === "function") entity.draw(this.context, this);
    });
  }

  /**
   * Entfernt alle aktiven und vorgemerkten Entitäten.
   */
  clear() {
    this.#collectedPickups.length = 0;
    this.#damageEvents.length = 0;
    this.#pendingAdditions.forEach((entities) => entities.clear());
    if (!this.#isProcessing) this.#entityGroups.forEach((entities) => entities.splice(0));
    else this.#queueAllEntitiesForRemoval();
  }

  /**
   * Leert und deaktiviert die Welt für einen kontrollierten Neuaufbau.
   */
  destroy() {
    this.clear();
    this.camera.reset();
    this.isInitialized = false;
  }

  #createGroupMap(CollectionType) {
    return new Map(ENTITY_GROUP_NAMES.map((name) => [name, new CollectionType()]));
  }

  #ensureFallbackScene() {
    const characters = this.#entityGroups.get(WORLD_ENTITY_GROUPS.CHARACTERS);
    const platforms = this.#entityGroups.get(WORLD_ENTITY_GROUPS.PLATFORMS);
    if (characters.length === 0) this.#addFallbackCharacter();
    else this.character = characters[0];
    if (platforms.length === 0) this.#addFallbackPlatform();
  }

  #addLevelPlatforms() {
    if (!Array.isArray(this.level?.platforms)) return;
    this.level.platforms.forEach((platform) => {
      this.addEntity(WORLD_ENTITY_GROUPS.PLATFORMS, platform);
    });
  }

  #addLevelCollectables() {
    if (!Array.isArray(this.level?.collectables)) return;
    this.level.collectables.forEach((collectable) => {
      this.addEntity(WORLD_ENTITY_GROUPS.COLLECTABLES, collectable);
    });
  }

  #addLevelHazards() {
    if (!Array.isArray(this.level?.hazards)) return;
    this.level.hazards.forEach((hazard) => {
      this.addEntity(WORLD_ENTITY_GROUPS.HAZARDS, hazard);
    });
  }

  #addFallbackCharacter() {
    this.character = new Character();
    const startPosition = this.level?.playerStart ?? FALLBACK_CHARACTER_POSITION;
    Object.assign(this.character, startPosition);
    this.addEntity(WORLD_ENTITY_GROUPS.CHARACTERS, this.character);
  }

  #addFallbackPlatform() {
    const platform = new Platform();
    Object.assign(platform, FALLBACK_PLATFORM_BOUNDS);
    this.addEntity(WORLD_ENTITY_GROUPS.PLATFORMS, platform);
  }

  #resolvePlatformLandings(deltaTimeSeconds) {
    const characters = this.#entityGroups.get(WORLD_ENTITY_GROUPS.CHARACTERS);
    const platforms = this.#entityGroups.get(WORLD_ENTITY_GROUPS.PLATFORMS);
    this.#collisionManager.resolvePlatformLandings(characters, platforms, deltaTimeSeconds);
  }

  #resolveCollectablePickups() {
    if (!this.character) return;
    const collectables = this.#entityGroups.get(WORLD_ENTITY_GROUPS.COLLECTABLES);
    const overlaps = collectables.filter((collectable) => {
      return this.#collisionManager.areOverlapping(this.character, collectable);
    });
    overlaps.forEach((collectable) => this.#collect(collectable));
  }

  #collect(collectable) {
    this.#collectedPickups.push(collectable.getPickup());
    this.removeEntity(WORLD_ENTITY_GROUPS.COLLECTABLES, collectable);
  }

  #resolveHazardHits() {
    if (!this.character) return;
    const hazards = this.#entityGroups.get(WORLD_ENTITY_GROUPS.HAZARDS);
    const hazard = hazards.find((candidate) => {
      return this.#collisionManager.areOverlapping(this.character, candidate);
    });
    if (hazard) this.#damageEvents.push(hazard.createHit(this.character));
  }

  #processEntities(groupOrder, callback) {
    this.#isProcessing = true;
    try {
      groupOrder.forEach((name) => this.#entityGroups.get(name).forEach(callback));
    } finally {
      this.#isProcessing = false;
      this.#applyPendingChanges();
    }
  }

  #applyPendingChanges() {
    ENTITY_GROUP_NAMES.forEach((groupName) => {
      this.#applyRemovals(groupName);
      this.#applyAdditions(groupName);
    });
  }

  #applyRemovals(groupName) {
    const removals = this.#pendingRemovals.get(groupName);
    if (removals.size === 0) return;
    const remaining = this.#entityGroups.get(groupName).filter((entity) => !removals.has(entity));
    this.#entityGroups.set(groupName, remaining);
    removals.clear();
  }

  #applyAdditions(groupName) {
    const additions = this.#pendingAdditions.get(groupName);
    if (additions.size === 0) return;
    this.#entityGroups.get(groupName).push(...additions);
    additions.clear();
  }

  #queueAllEntitiesForRemoval() {
    ENTITY_GROUP_NAMES.forEach((groupName) => {
      const entities = this.#entityGroups.get(groupName);
      const removals = this.#pendingRemovals.get(groupName);
      entities.forEach((entity) => removals.add(entity));
    });
  }

  #queueRemoval(groupName, entity) {
    const removals = this.#pendingRemovals.get(groupName);
    if (removals.has(entity)) return false;
    removals.add(entity);
    return true;
  }

  #validateEntity(groupName, entity) {
    this.#validateGroupName(groupName);
    if (entity && typeof entity === "object") return;
    throw new TypeError("Eine Entität muss ein Objekt sein.");
  }

  #validateGroupName(groupName) {
    if (this.#entityGroups.has(groupName)) return;
    throw new RangeError(`Unbekannte Entitätsgruppe: ${groupName}`);
  }
}
