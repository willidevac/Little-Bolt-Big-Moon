import { WORLD_ENTITY_GROUPS } from "../core/world-entity-groups.js";

/**
 * Connects player attacks, stomps, and enemy contact without managing energy.
 */
export class EnemyCombatSystem {
  #defeatedEnemies;

  /**
   * Creates the configured system.
   * @param {Readonly<object>} config Configuration values used by the system.
   * @param {import("./collision-manager.class.js").CollisionManager} collisionManager Collision manager used while constructor.
   */
  constructor(config, collisionManager) {
    this.#validateDependencies(config, collisionManager);
    this.config = config;
    this.collisionManager = collisionManager;
    this.#defeatedEnemies = [];
  }

  /**
   * Applies a melee attack to every enemy it actually touches.
   * @param {Readonly<object>|null} attack Attack used while resolve player attack.
   * @param {import("../core/world.class.js").World} world Active world providing entities and runtime state.
   * @returns {number} Number of enemies hit.
   */
  resolvePlayerAttack(attack, world) {
    if (attack?.type !== "melee" || !attack.hitbox) return 0;
    const targets = this.#getMeleeTargets(attack.hitbox, world);
    const hit = this.#createPlayerHit(attack);
    targets.forEach((enemy) => world.eventReporter.damageEnemy(enemy, hit));
    return targets.length;
  }

  /**
   * Checks for a stomp before harmful side contact and cleans up defeated enemies.
   * @param {import("../core/world.class.js").World} world Active world providing entities and runtime state.
   * @param {number} deltaTimeSeconds Elapsed time since the previous frame, in seconds.
   * @returns {Readonly<object>|null} Possible contact hit against Byte.
   */
  resolve(world, deltaTimeSeconds) {
    if (!world.character || world.character.isDead) {
      this.#removeDefeated(world);
      return null;
    }
    const hit = this.#resolveCharacterContact(world, deltaTimeSeconds);
    this.#removeDefeated(world);
    return hit;
  }

  /**
   * Returns resolve character contact.
   * @param {Readonly<object>} world Active world providing entities and runtime state.
   * @param {number} deltaTimeSeconds Elapsed time since the previous frame, in seconds.
   */
  #resolveCharacterContact(world, deltaTimeSeconds) {
    const enemies = this.#getLivingEnemies(world);
    const stompTarget = this.#findStompTarget(
      world.character,
      enemies,
      deltaTimeSeconds,
    );
    return stompTarget
      ? this.#resolveStomp(world.character, stompTarget, world)
      : this.#resolveContact(world.character, enemies);
  }

  /**
   * Passes defeated enemies to the central run score exactly once.
   * @returns {ReadonlyArray<Readonly<{id:string,type:string}>>}
   */
  takeDefeatedEnemies() {
    const enemies = Object.freeze([...this.#defeatedEnemies]);
    this.#defeatedEnemies.length = 0;
    return enemies;
  }

  /**
   * Returns melee targets.
   * @param {Readonly<object>} hitbox Hitbox used while get melee targets.
   * @param {Readonly<object>} world Active world providing entities and runtime state.
   */
  #getMeleeTargets(hitbox, world) {
    return this.#getLivingEnemies(world).filter((enemy) => {
      return this.collisionManager.areOverlapping(hitbox, enemy);
    });
  }

  /**
   * Creates player hit.
   * @param {Readonly<object>} attack Attack used while create player hit.
   */
  #createPlayerHit(attack) {
    return Object.freeze({
      amount: attack.damage,
      direction: attack.direction,
      source: attack.weaponId,
    });
  }

  /**
   * Returns find stomp target.
   * @param {Readonly<object>} character Player character processed by the system.
   * @param {ReadonlyArray<object>} enemies Enemy entities managed by the system.
   * @param {number} deltaTimeSeconds Elapsed time since the previous frame, in seconds.
   */
  #findStompTarget(character, enemies, deltaTimeSeconds) {
    return enemies.find((enemy) => {
      return this.collisionManager.isStompCollision(
        character,
        enemy,
        deltaTimeSeconds,
      );
    });
  }

  /**
   * Returns resolve stomp.
   * @param {Readonly<object>} character Player character processed by the system.
   * @param {Readonly<object>} enemy Enemy entity processed by the operation.
   * @param {Readonly<object>} world Active world providing entities and runtime state.
   */
  #resolveStomp(character, enemy, world) {
    world.eventReporter.damageEnemy(enemy, Object.freeze({
      amount: this.config.stompDamage,
      direction: 1,
      source: "stomp",
    }));
    character.applyUpwardImpulse(this.config.stompBounceSpeedPixelsPerSecond);
    return null;
  }

  /**
   * Returns resolve contact.
   * @param {Readonly<object>} character Player character processed by the system.
   * @param {ReadonlyArray<object>} enemies Enemy entities managed by the system.
   */
  #resolveContact(character, enemies) {
    const attacker = enemies.find((enemy) => {
      return this.collisionManager.areOverlapping(character, enemy);
    });
    return attacker?.attack(character) ?? null;
  }

  /**
   * Clears defeated.
   * @param {Readonly<object>} world Active world providing entities and runtime state.
   */
  #removeDefeated(world) {
    const enemies = world.getEntities(WORLD_ENTITY_GROUPS.ENEMIES);
    enemies.filter((enemy) => enemy.isReadyForRemoval).forEach((enemy) => {
      this.#defeatedEnemies.push(Object.freeze({
        id: enemy.id,
        type: enemy.type,
      }));
      world.removeEntity(WORLD_ENTITY_GROUPS.ENEMIES, enemy);
    });
  }

  /**
   * Returns living enemies.
   * @param {Readonly<object>} world Active world providing entities and runtime state.
   */
  #getLivingEnemies(world) {
    return world.getEntities(WORLD_ENTITY_GROUPS.ENEMIES).filter((enemy) => {
      return !enemy.isDead;
    });
  }

  /**
   * Validates dependencies.
   * @param {Readonly<object>} config Configuration values used by the system.
   * @param {Readonly<object>} collisionManager Collision manager used while validate dependencies.
   */
  #validateDependencies(config, collisionManager) {
    const values = [
      config?.stompDamage,
      config?.stompBounceSpeedPixelsPerSecond,
    ];
    const hasConfig = values.every((value) => Number.isFinite(value) && value > 0);
    const hasCollision = typeof collisionManager?.areOverlapping === "function" &&
      typeof collisionManager?.isStompCollision === "function";
    if (hasConfig && hasCollision) return;
    throw new TypeError("Das Gegner-Kampfsystem ist unvollständig konfiguriert.");
  }
}
