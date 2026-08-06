import { WORLD_ENTITY_GROUPS } from "../core/world-entity-groups.js";
import { ArcProjectile } from "../entities/weapons/arc-projectile.class.js";
import { BoltProjectile } from "../entities/weapons/bolt-projectile.class.js";
import { BossProjectile } from "../entities/weapons/boss-projectile.class.js";
import { GAMEPLAY_EVENTS } from "../core/gameplay-event-hub.class.js";

/**
 * Creates player projectiles, checks hits, and removes spent bolts.
 */
export class ProjectileSystem {
  /**
   * Creates the configured system.
   * @param {Readonly<object>} config Configuration values used by the system.
   * @param {import("./collision-manager.class.js").CollisionManager} collisionManager Collision manager used while constructor.
   */
  constructor(config, collisionManager) {
    this.#validateDependencies(config, collisionManager);
    this.config = config;
    this.collisionManager = collisionManager;
  }

  /**
   * Converts only ranged attacks into a world object.
   * @param {Readonly<object>|null} attack Attack used while spawn.
   * @param {import("../core/world.class.js").World} world Active world providing entities and runtime state.
   * @returns {import("../entities/weapons/projectile.class.js").Projectile|null}
   */
  spawn(attack, world) {
    if (attack?.type !== "projectile") return null;
    const projectile = this.#createPlayerProjectile(attack);
    world.addEntity(WORLD_ENTITY_GROUPS.PROJECTILES, projectile);
    return projectile;
  }

  /**
   * Creates player projectile.
   * @param {Readonly<object>} attack Attack used while create player projectile.
   */
  #createPlayerProjectile(attack) {
    if (attack.projectileKind === "arc") {
      return new ArcProjectile(attack, this.config.playerArc);
    }
    return new BoltProjectile(attack, this.config.playerBolt);
  }

  /**
   * Checks the first enemy along the flight path and safely removes bolts.
   * @param {import("../core/world.class.js").World} world Active world providing entities and runtime state.
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

  /**
   * Returns resolve projectile.
   * @param {Readonly<object>} projectile Projectile processed by the system.
   * @param {ReadonlyArray<object>} enemies Enemy entities managed by the system.
   * @param {Readonly<object>} world Active world providing entities and runtime state.
   * @param {ReadonlyArray<object>} characterHits Character hits used while resolve projectile.
   */
  #resolveProjectile(projectile, enemies, world, characterHits) {
    if (projectile.team === "player") {
      this.#resolveEnemyHit(projectile, enemies, world);
      return;
    }
    if (projectile.team !== "enemy") return;
    const hit = this.#resolveCharacterHit(projectile, world.character);
    if (hit) characterHits.push(hit);
  }

  /**
   * Performs the spawn boss projectiles operation.
   * @param {Readonly<object>} world Active world providing entities and runtime state.
   */
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

  /**
   * Returns resolve enemy hit.
   * @param {Readonly<object>} projectile Projectile processed by the system.
   * @param {ReadonlyArray<object>} enemies Enemy entities managed by the system.
   * @param {Readonly<object>} world Active world providing entities and runtime state.
   */
  #resolveEnemyHit(projectile, enemies, world) {
    if (projectile.isExpired) return;
    const target = this.#findFirstTarget(projectile, enemies);
    if (!target) return;
    world.eventReporter.damageEnemy(target, projectile.createHit());
    this.#damageChainedTarget(projectile, target, enemies, world);
    projectile.expire();
  }

  /**
   * Performs the damage chained target operation.
   * @param {Readonly<object>} projectile Projectile processed by the system.
   * @param {Readonly<object>} firstTarget First target used while damage chained target.
   * @param {ReadonlyArray<object>} enemies Enemy entities managed by the system.
   * @param {Readonly<object>} world Active world providing entities and runtime state.
   */
  #damageChainedTarget(projectile, firstTarget, enemies, world) {
    if (typeof projectile.createSecondaryHit !== "function") return false;
    const target = this.#findChainedTarget(projectile, firstTarget, enemies);
    if (!target) return false;
    return world.eventReporter.damageEnemy(
      target,
      projectile.createSecondaryHit(),
    );
  }

  /**
   * Returns find chained target.
   * @param {Readonly<object>} projectile Projectile processed by the system.
   * @param {Readonly<object>} firstTarget First target used while find chained target.
   * @param {ReadonlyArray<object>} enemies Enemy entities managed by the system.
   */
  #findChainedTarget(projectile, firstTarget, enemies) {
    const origin = this.#getCenter(firstTarget);
    const candidates = enemies
      .filter((enemy) => enemy !== firstTarget && !enemy.isDead)
      .map((enemy) => ({ enemy, distance: this.#getDistance(origin, enemy) }))
      .filter(({ distance }) => distance <= projectile.chainRangePixels)
      .sort((first, second) => first.distance - second.distance);
    return candidates[0]?.enemy ?? null;
  }

  /**
   * Returns distance.
   * @param {Readonly<object>} origin Origin used while get distance.
   * @param {Readonly<object>} entity Entity used while get distance.
   */
  #getDistance(origin, entity) {
    const target = this.#getCenter(entity);
    return Math.hypot(target.x - origin.x, target.y - origin.y);
  }

  /**
   * Returns center.
   * @param {Readonly<object>} entity Entity used while get center.
   */
  #getCenter(entity) {
    const bounds = typeof entity.getCollisionBounds === "function"
      ? entity.getCollisionBounds()
      : entity;
    return {
      x: bounds.x + bounds.width / 2,
      y: bounds.y + bounds.height / 2,
    };
  }

  /**
   * Returns resolve character hit.
   * @param {Readonly<object>} projectile Projectile processed by the system.
   * @param {Readonly<object>} character Player character processed by the system.
   */
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

  /**
   * Clears projectile.
   * @param {Readonly<object>} projectile Projectile processed by the system.
   * @param {Readonly<object>} world Active world providing entities and runtime state.
   */
  #removeProjectile(projectile, world) {
    world.removeEntity(WORLD_ENTITY_GROUPS.PROJECTILES, projectile);
  }

  /**
   * Returns find first target.
   * @param {Readonly<object>} projectile Projectile processed by the system.
   * @param {ReadonlyArray<object>} enemies Enemy entities managed by the system.
   */
  #findFirstTarget(projectile, enemies) {
    const targets = enemies.filter((enemy) => {
      return this.#isTargetHit(projectile, enemy);
    });
    targets.sort((first, second) => {
      return projectile.direction * (this.#getX(first) - this.#getX(second));
    });
    return targets[0] ?? null;
  }

  /**
   * Checks the target hit condition.
   * @param {Readonly<object>} projectile Projectile processed by the system.
   * @param {Readonly<object>} enemy Enemy entity processed by the operation.
   */
  #isTargetHit(projectile, enemy) {
    if (enemy.isDead) return false;
    return this.collisionManager.areOverlapping(
      projectile.getTravelBounds(),
      enemy,
    );
  }

  /**
   * Returns x.
   * @param {Readonly<object>} entity Entity used while get x.
   */
  #getX(entity) {
    return typeof entity.getCollisionBounds === "function"
      ? entity.getCollisionBounds().x
      : entity.x;
  }

  /**
   * Validates dependencies.
   * @param {Readonly<object>} config Configuration values used by the system.
   * @param {Readonly<object>} collisionManager Collision manager used while validate dependencies.
   */
  #validateDependencies(config, collisionManager) {
    const hasPlayerConfig = config?.playerBolt && config?.playerArc &&
      typeof config.playerBolt === "object" &&
      typeof config.playerArc === "object";
    const hasBossConfig = config?.boss?.shockwave && config?.boss?.moonBolt &&
      config?.boss?.overseerBolt;
    const hasCollision = typeof collisionManager?.areOverlapping === "function";
    if (hasPlayerConfig && hasBossConfig && hasCollision) return;
    throw new TypeError("Das Projektilsystem ist unvollständig konfiguriert.");
  }
}
