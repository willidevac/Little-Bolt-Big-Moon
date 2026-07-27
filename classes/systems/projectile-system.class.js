import { WORLD_ENTITY_GROUPS } from "../core/world-entity-groups.js";
import { BoltProjectile } from "../entities/weapons/bolt-projectile.class.js";

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
    const projectiles = world
      .getEntities(WORLD_ENTITY_GROUPS.PROJECTILES)
      .filter((projectile) => projectile.team === "player");
    const enemies = world.getEntities(WORLD_ENTITY_GROUPS.ENEMIES);
    projectiles.forEach((projectile) => {
      if (!projectile.isExpired) this.#resolveHit(projectile, enemies);
      if (projectile.isExpired) {
        world.removeEntity(WORLD_ENTITY_GROUPS.PROJECTILES, projectile);
      }
    });
  }

  #resolveHit(projectile, enemies) {
    const target = this.#findFirstTarget(projectile, enemies);
    if (!target) return;
    if (typeof target.receivePlayerHit === "function") {
      target.receivePlayerHit(projectile.createHit());
    }
    projectile.expire();
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
    const hasConfig = config?.playerBolt && typeof config.playerBolt === "object";
    const hasCollision = typeof collisionManager?.areOverlapping === "function";
    if (hasConfig && hasCollision) return;
    throw new TypeError("Das Projektilsystem ist unvollständig konfiguriert.");
  }
}
