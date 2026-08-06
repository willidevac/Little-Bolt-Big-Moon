import { WORLD_ENTITY_GROUPS } from "../core/world-entity-groups.js";

/**
 * Connects player attacks, stomps, and enemy contact without managing energy.
 */
export class EnemyCombatSystem {
  #defeatedEnemies;

  /**
   * @param {Readonly<object>} config
   * @param {import("./collision-manager.class.js").CollisionManager} collisionManager
   */
  constructor(config, collisionManager) {
    this.#validateDependencies(config, collisionManager);
    this.config = config;
    this.collisionManager = collisionManager;
    this.#defeatedEnemies = [];
  }

  /**
   * Applies a melee attack to every enemy it actually touches.
   * @param {Readonly<object>|null} attack
   * @param {import("../core/world.class.js").World} world
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
   * @param {import("../core/world.class.js").World} world
   * @param {number} deltaTimeSeconds
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

  /** Returns resolve character contact. */
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

  /** Returns melee targets. */
  #getMeleeTargets(hitbox, world) {
    return this.#getLivingEnemies(world).filter((enemy) => {
      return this.collisionManager.areOverlapping(hitbox, enemy);
    });
  }

  /** Creates player hit. */
  #createPlayerHit(attack) {
    return Object.freeze({
      amount: attack.damage,
      direction: attack.direction,
      source: attack.weaponId,
    });
  }

  /** Returns find stomp target. */
  #findStompTarget(character, enemies, deltaTimeSeconds) {
    return enemies.find((enemy) => {
      return this.collisionManager.isStompCollision(
        character,
        enemy,
        deltaTimeSeconds,
      );
    });
  }

  /** Returns resolve stomp. */
  #resolveStomp(character, enemy, world) {
    world.eventReporter.damageEnemy(enemy, Object.freeze({
      amount: this.config.stompDamage,
      direction: 1,
      source: "stomp",
    }));
    character.applyUpwardImpulse(this.config.stompBounceSpeedPixelsPerSecond);
    return null;
  }

  /** Returns resolve contact. */
  #resolveContact(character, enemies) {
    const attacker = enemies.find((enemy) => {
      return this.collisionManager.areOverlapping(character, enemy);
    });
    return attacker?.attack(character) ?? null;
  }

  /** Clears defeated. */
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

  /** Returns living enemies. */
  #getLivingEnemies(world) {
    return world.getEntities(WORLD_ENTITY_GROUPS.ENEMIES).filter((enemy) => {
      return !enemy.isDead;
    });
  }

  /** Validates dependencies. */
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
