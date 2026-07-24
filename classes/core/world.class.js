import { CollisionManager } from "../systems/collision-manager.class.js";
import { Character } from "../entities/character.class.js";
import { Platform } from "../environment/platform.class.js";

const FALLBACK_CHARACTER_POSITION = Object.freeze({ x: 160, y: 240 });
const FALLBACK_PLATFORM_BOUNDS = Object.freeze({
  x: 96,
  y: 560,
  width: 512,
  height: 32,
});

export const WORLD_ENTITY_GROUPS = Object.freeze({
  CHARACTERS: "characters",
  PLATFORMS: "platforms",
  ENEMIES: "enemies",
  PROJECTILES: "projectiles",
  COLLECTABLES: "collectables",
});

const ENTITY_GROUP_NAMES = Object.freeze(Object.values(WORLD_ENTITY_GROUPS));
const UPDATE_ORDER = Object.freeze([
  WORLD_ENTITY_GROUPS.PLATFORMS,
  WORLD_ENTITY_GROUPS.CHARACTERS,
  WORLD_ENTITY_GROUPS.ENEMIES,
  WORLD_ENTITY_GROUPS.PROJECTILES,
  WORLD_ENTITY_GROUPS.COLLECTABLES,
]);
const DRAW_ORDER = Object.freeze([
  WORLD_ENTITY_GROUPS.PLATFORMS,
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

  /**
   * @param {CanvasRenderingContext2D} context
   * @param {Readonly<object>} config
   */
  constructor(context, config) {
    this.context = context;
    this.config = config;
    this.isInitialized = false;
    this.#entityGroups = this.#createGroupMap(Array);
    this.#pendingAdditions = this.#createGroupMap(Set);
    this.#pendingRemovals = this.#createGroupMap(Set);
    this.#isProcessing = false;
    this.#collisionManager = new CollisionManager(config.physics);
    this.character = null;
  }

  /**
   * Aktiviert die Welt höchstens einmal.
   * @returns {boolean} Ob die Welt neu aktiviert wurde.
   */
  initialize() {
    if (this.isInitialized) return false;
    this.#ensureFallbackScene();
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
    this.#collisionManager.resetGroundStates(characters);
    this.#processEntities(UPDATE_ORDER, (entity) => {
      if (typeof entity.update === "function") entity.update(deltaTimeSeconds, this);
    });
    this.#resolvePlatformLandings(deltaTimeSeconds);
  }

  /**
   * Zeichnet alle dafür geeigneten Entitäten in fester Ebenenreihenfolge.
   */
  draw() {
    if (!this.isInitialized) return;
    this.#processEntities(DRAW_ORDER, (entity) => {
      if (typeof entity.draw === "function") entity.draw(this.context, this);
    });
  }

  /**
   * Entfernt alle aktiven und vorgemerkten Entitäten.
   */
  clear() {
    this.#pendingAdditions.forEach((entities) => entities.clear());
    if (!this.#isProcessing) this.#entityGroups.forEach((entities) => entities.splice(0));
    else this.#queueAllEntitiesForRemoval();
  }

  /**
   * Leert und deaktiviert die Welt für einen kontrollierten Neuaufbau.
   */
  destroy() {
    this.clear();
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

  #addFallbackCharacter() {
    this.character = new Character();
    Object.assign(this.character, FALLBACK_CHARACTER_POSITION);
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
