import { WORLD_ENTITY_GROUPS } from "../core/world-entity-groups.js";
import { ArcProjectile } from "../entities/weapons/arc-projectile.class.js";
import { BoltProjectile } from "../entities/weapons/bolt-projectile.class.js";
import { BossProjectile } from "../entities/weapons/boss-projectile.class.js";
import { GAMEPLAY_EVENTS } from "../core/gameplay-event-hub.class.js";

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
   * @returns {import("../entities/weapons/projectile.class.js").Projectile|null}
   */
  spawn(attack, world) {
    if (attack?.type !== "projectile") return null;
    const projectile = this.#createPlayerProjectile(attack);
    world.addEntity(WORLD_ENTITY_GROUPS.PROJECTILES, projectile);
    return projectile;
  }

  #createPlayerProjectile(attack) {
    if (attack.projectileKind === "arc") {
      return new ArcProjectile(attack, this.config.playerArc);
    }
    return new BoltProjectile(attack, this.config.playerBolt);
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
      this.#resolveProjectile(projectile, enemies, world, characterHits);
      if (projectile.isExpired) this.#removeProjectile(projectile, world);
    });
    return Object.freeze(characterHits);
  }

  #resolveProjectile(projectile, enemies, world, characterHits) {
    if (projectile.team === "player") {
      this.#resolveEnemyHit(projectile, enemies, world);
      return;
    }
    if (projectile.team !== "enemy") return;
    const hit = this.#resolveCharacterHit(projectile, world.character);
    if (hit) characterHits.push(hit);
  }

  #spawnBossProjectiles(world) {
    const enemies = world.getEntities(WORLD_ENTITY_GROUPS.ENEMIES);
    enemies.forEach((enemy) => {
      if (typeof enemy.takeAttackEvents !== "function") return;
      enemy.takeAttackEvents().forEach((event) => {
        world.gameplayEvents.emit(GAMEPLAY_EVENTS.BOSS_ATTACK, {
          kind: event.kind,
        });
        const projectile = new BossProjectile(event, this.config.boss);
        world.addEntity(WORLD_ENTITY_GROUPS.PROJECTILES, projectile);
      });
    });
  }

  #resolveEnemyHit(projectile, enemies, world) {
    if (projectile.isExpired) return;
    const target = this.#findFirstTarget(projectile, enemies);
    if (!target) return;
    world.eventReporter.damageEnemy(target, projectile.createHit());
    this.#damageChainedTarget(projectile, target, enemies, world);
    projectile.expire();
  }

  #damageChainedTarget(projectile, firstTarget, enemies, world) {
    if (typeof projectile.createSecondaryHit !== "function") return false;
    const target = this.#findChainedTarget(projectile, firstTarget, enemies);
    if (!target) return false;
    return world.eventReporter.damageEnemy(
      target,
      projectile.createSecondaryHit(),
    );
  }

  #findChainedTarget(projectile, firstTarget, enemies) {
    const origin = this.#getCenter(firstTarget);
    const candidates = enemies
      .filter((enemy) => enemy !== firstTarget && !enemy.isDead)
      .map((enemy) => ({ enemy, distance: this.#getDistance(origin, enemy) }))
      .filter(({ distance }) => distance <= projectile.chainRangePixels)
      .sort((first, second) => first.distance - second.distance);
    return candidates[0]?.enemy ?? null;
  }

  #getDistance(origin, entity) {
    const target = this.#getCenter(entity);
    return Math.hypot(target.x - origin.x, target.y - origin.y);
  }

  #getCenter(entity) {
    const bounds = typeof entity.getCollisionBounds === "function"
      ? entity.getCollisionBounds()
      : entity;
    return {
      x: bounds.x + bounds.width / 2,
      y: bounds.y + bounds.height / 2,
    };
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
    const hasPlayerConfig = config?.playerBolt && config?.playerArc &&
      typeof config.playerBolt === "object" &&
      typeof config.playerArc === "object";
    const hasBossConfig = config?.boss?.shockwave && config?.boss?.moonBolt;
    const hasCollision = typeof collisionManager?.areOverlapping === "function";
    if (hasPlayerConfig && hasBossConfig && hasCollision) return;
    throw new TypeError("Das Projektilsystem ist unvollständig konfiguriert.");
  }
}
