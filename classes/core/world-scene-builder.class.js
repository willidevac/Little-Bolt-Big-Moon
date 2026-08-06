import { Character } from "../entities/character.class.js";
import { Platform } from "../environment/platform.class.js";
import { WORLD_ENTITY_GROUPS } from "./world-entity-groups.js";

const FALLBACK_CHARACTER_POSITION = Object.freeze({ x: 160, y: 240 });
const FALLBACK_PLATFORM_BOUNDS = Object.freeze({
  x: 96, y: 560, width: 512, height: 32,
});

/** Populates a new world with level objects and a safe starting scene. */
export class WorldSceneBuilder {
  /**
   * Creates the configured instance.
   * @param {Readonly<object>|null} level Level definition to populate.
   */
  constructor(level) {
    this.level = level;
  }

  /**
   * Adds all starting objects in the required order.
   * @param {import("./world.class.js").World} world Active world providing runtime state and entities.
   * @returns {Character|object}
   */
  build(world) {
    this.#addLevelEntities(world, WORLD_ENTITY_GROUPS.STRUCTURES, "structures");
    this.#addLevelEntities(world, WORLD_ENTITY_GROUPS.PLATFORMS, "platforms");
    this.#addLevelEntities(world, WORLD_ENTITY_GROUPS.DECORATIONS, "storyProps");
    world.waveManager.initialize(world);
    this.#addLevelEntities(world, WORLD_ENTITY_GROUPS.COLLECTABLES, "collectables");
    this.#addLevelEntities(world, WORLD_ENTITY_GROUPS.HAZARDS, "hazards");
    const character = this.#ensureCharacter(world);
    this.#ensurePlatform(world);
    return character;
  }

  /**
   * Applies level entities.
   * @param {Readonly<object>} world Active world providing runtime state and entities.
   * @param {string} groupName Entity group addressed by the operation.
   * @param {string} propertyName Property name supplied to add level entities.
   */
  #addLevelEntities(world, groupName, propertyName) {
    const entities = this.level?.[propertyName];
    if (!Array.isArray(entities)) return;
    entities.forEach((entity) => world.addEntity(groupName, entity));
  }

  /**
   * Performs the ensure character operation.
   * @param {Readonly<object>} world Active world providing runtime state and entities.
   */
  #ensureCharacter(world) {
    const characters = world.getEntities(WORLD_ENTITY_GROUPS.CHARACTERS);
    if (characters.length > 0) return characters[0];
    const character = new Character();
    const startPosition = this.level?.playerStart ?? FALLBACK_CHARACTER_POSITION;
    Object.assign(character, startPosition);
    world.addEntity(WORLD_ENTITY_GROUPS.CHARACTERS, character);
    return character;
  }

  /**
   * Performs the ensure platform operation.
   * @param {Readonly<object>} world Active world providing runtime state and entities.
   */
  #ensurePlatform(world) {
    const platforms = world.getEntities(WORLD_ENTITY_GROUPS.PLATFORMS);
    const structures = world.getEntities(WORLD_ENTITY_GROUPS.STRUCTURES);
    if (platforms.length > 0 || structures.length > 0 || this.level) return;
    const platform = new Platform();
    Object.assign(platform, FALLBACK_PLATFORM_BOUNDS);
    world.addEntity(WORLD_ENTITY_GROUPS.PLATFORMS, platform);
  }
}
