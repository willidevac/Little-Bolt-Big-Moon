import { WORLD_ENTITY_GROUPS } from "../core/world-entity-groups.js";

/**
 * Verbindet Spielerangriffe, Stomp und Gegnerkontakt ohne eigene Energieverwaltung.
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
   * Übergibt einen Nahkampfangriff an alle tatsächlich berührten Gegner.
   * @param {Readonly<object>|null} attack
   * @param {import("../core/world.class.js").World} world
   * @returns {number} Anzahl getroffener Gegner.
   */
  resolvePlayerAttack(attack, world) {
    if (attack?.type !== "melee" || !attack.hitbox) return 0;
    const targets = this.#getMeleeTargets(attack.hitbox, world);
    const hit = this.#createPlayerHit(attack);
    targets.forEach((enemy) => world.eventReporter.damageEnemy(enemy, hit));
    return targets.length;
  }

  /**
   * Prüft Stomp vor schädlichem Seitenkontakt und räumt besiegte Gegner auf.
   * @param {import("../core/world.class.js").World} world
   * @param {number} deltaTimeSeconds
   * @returns {Readonly<object>|null} Möglicher Kontakttreffer gegen Byte.
   */
  resolve(world, deltaTimeSeconds) {
    if (!world.character || world.character.isDead) {
      this.#removeDefeated(world);
      return null;
    }
    const enemies = this.#getLivingEnemies(world);
    const stompTarget = this.#findStompTarget(
      world.character,
      enemies,
      deltaTimeSeconds,
    );
    const hit = stompTarget
      ? this.#resolveStomp(world.character, stompTarget, world)
      : this.#resolveContact(world.character, enemies);
    this.#removeDefeated(world);
    return hit;
  }

  /**
   * Übergibt besiegte Gegner genau einmal an die zentrale Laufwertung.
   * @returns {ReadonlyArray<Readonly<{id:string,type:string}>>}
   */
  takeDefeatedEnemies() {
    const enemies = Object.freeze([...this.#defeatedEnemies]);
    this.#defeatedEnemies.length = 0;
    return enemies;
  }

  #getMeleeTargets(hitbox, world) {
    return this.#getLivingEnemies(world).filter((enemy) => {
      return this.collisionManager.areOverlapping(hitbox, enemy);
    });
  }

  #createPlayerHit(attack) {
    return Object.freeze({
      amount: attack.damage,
      direction: attack.direction,
      source: attack.weaponId,
    });
  }

  #findStompTarget(character, enemies, deltaTimeSeconds) {
    return enemies.find((enemy) => {
      return this.collisionManager.isStompCollision(
        character,
        enemy,
        deltaTimeSeconds,
      );
    });
  }

  #resolveStomp(character, enemy, world) {
    world.eventReporter.damageEnemy(enemy, Object.freeze({
      amount: this.config.stompDamage,
      direction: 1,
      source: "stomp",
    }));
    character.applyUpwardImpulse(this.config.stompBounceSpeedPixelsPerSecond);
    return null;
  }

  #resolveContact(character, enemies) {
    const attacker = enemies.find((enemy) => {
      return this.collisionManager.areOverlapping(character, enemy);
    });
    return attacker?.attack(character) ?? null;
  }

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

  #getLivingEnemies(world) {
    return world.getEntities(WORLD_ENTITY_GROUPS.ENEMIES).filter((enemy) => {
      return !enemy.isDead;
    });
  }

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
