import { WORLD_ENTITY_GROUPS } from "../core/world-entity-groups.js";
import { BoltProjectile } from "../entities/weapons/bolt-projectile.class.js";
import { BossProjectile } from "../entities/weapons/boss-projectile.class.js";

/**
 * Erzeugt Spielerprojektile, prüft Treffer und entfernt verbrauchte Bolzen.
 */
export class ProjectileSystem {
  /**
   * @param {Readonly<object>} config
   * @param {import("./collision-manager.class.js").CollisionManager} collisionManager
   */
  constructor(config, collisionManager) {
    this.#validateDependencies(config, collisionManager);
    this.config = config;
    this.collisionManager = collisionManager;
  }

  /**
   * Wandelt ausschließlich Fernkampfangriffe in ein Weltobjekt um.
   * @param {Readonly<object>|null} attack
   * @param {import("../core/world.class.js").World} world
   * @returns {BoltProjectile|null}
   */
  spawn(attack, world) {
    if (attack?.type !== "projectile") return null;
    const projectile = new BoltProjectile(attack, this.config.playerBolt);
    world.addEntity(WORLD_ENTITY_GROUPS.PROJECTILES, projectile);
    return projectile;
  }

  /**
   * Prüft den ersten Gegner auf der Flugstrecke und räumt Bolzen sicher auf.
   * @param {import("../core/world.class.js").World} world
   */
  resolve(world) {
    this.#spawnBossProjectiles(world);
    const projectiles = world.getEntities(WORLD_ENTITY_GROUPS.PROJECTILES);
    const enemies = world.getEntities(WORLD_ENTITY_GROUPS.ENEMIES);
    const characterHits = [];
    projectiles.forEach((projectile) => {
      this.#resolveProjectile(projectile, enemies, world.character, characterHits);
      if (projectile.isExpired) this.#removeProjectile(projectile, world);
    });
    return Object.freeze(characterHits);
  }

  #resolveProjectile(projectile, enemies, character, characterHits) {
    if (projectile.team === "player") {
      this.#resolveEnemyHit(projectile, enemies);
      return;
    }
    if (projectile.team !== "enemy") return;
    const hit = this.#resolveCharacterHit(projectile, character);
    if (hit) characterHits.push(hit);
  }

  #spawnBossProjectiles(world) {
    const enemies = world.getEntities(WORLD_ENTITY_GROUPS.ENEMIES);
    enemies.forEach((enemy) => {
      if (typeof enemy.takeAttackEvents !== "function") return;
      enemy.takeAttackEvents().forEach((event) => {
        const projectile = new BossProjectile(event, this.config.boss);
        world.addEntity(WORLD_ENTITY_GROUPS.PROJECTILES, projectile);
      });
    });
  }

  #resolveEnemyHit(projectile, enemies) {
    if (projectile.isExpired) return;
    const target = this.#findFirstTarget(projectile, enemies);
    if (!target) return;
    if (typeof target.receivePlayerHit === "function") {
      target.receivePlayerHit(projectile.createHit());
    }
    projectile.expire();
  }

  #resolveCharacterHit(projectile, character) {
    if (projectile.isExpired || !character || character.isDead) return null;
    const wasHit = this.collisionManager.areOverlapping(
      projectile.getTravelBounds(),
      character,
    );
    if (!wasHit) return null;
    projectile.expire();
    return projectile.createHit();
  }

  #removeProjectile(projectile, world) {
    world.removeEntity(WORLD_ENTITY_GROUPS.PROJECTILES, projectile);
  }

  #findFirstTarget(projectile, enemies) {
    const targets = enemies.filter((enemy) => {
      return this.#isTargetHit(projectile, enemy);
    });
    targets.sort((first, second) => {
      return projectile.direction * (this.#getX(first) - this.#getX(second));
    });
    return targets[0] ?? null;
  }

  #isTargetHit(projectile, enemy) {
    if (enemy.isDead) return false;
    return this.collisionManager.areOverlapping(
      projectile.getTravelBounds(),
      enemy,
    );
  }

  #getX(entity) {
    return typeof entity.getCollisionBounds === "function"
      ? entity.getCollisionBounds().x
      : entity.x;
  }

  #validateDependencies(config, collisionManager) {
    const hasPlayerConfig = config?.playerBolt &&
      typeof config.playerBolt === "object";
    const hasBossConfig = config?.boss?.shockwave && config?.boss?.moonBolt;
    const hasCollision = typeof collisionManager?.areOverlapping === "function";
    if (hasPlayerConfig && hasBossConfig && hasCollision) return;
    throw new TypeError("Das Projektilsystem ist unvollständig konfiguriert.");
  }
}
