import { GAMEPLAY_EVENTS } from "../core/gameplay-event-hub.class.js";

/**
 * Detects one-time movement and boss changes between two world states.
 */
export class WorldEventReporter {
  /**
   * @param {import("../core/gameplay-event-hub.class.js").GameplayEventHub} events
   */
  constructor(events) {
    if (typeof events?.emit !== "function") {
      throw new TypeError("Dem Weltbericht fehlen Spielereignisse.");
    }
    this.events = events;
    this.before = null;
    this.lastMovementDirection = 0;
  }

  /**
   * Captures the minimal state before the world update.
   * @param {Readonly<object>|null} character
   * @param {Readonly<object>} boss
   */
  capture(character, boss) {
    this.before = Object.freeze({
      isOnGround: Boolean(character?.isOnGround),
      x: Number.isFinite(character?.x) ? character.x : null,
      velocityY: character?.velocityY ?? 0,
      wallImpactCount: character?.wallImpactCount ?? 0,
      jumpChargePercent: character?.jumpChargePercent ?? 0,
      isJumpCharging: Boolean(character?.isChargingJump),
      bossActive: boss.isActive,
      bossPhase: boss.phase,
    });
  }

  /**
   * Reports jumps, landings, boss activation, and new boss phases.
   * @param {Readonly<object>|null} character
   * @param {Readonly<object>} boss
   */
  report(character, boss) {
    if (!this.before || !character) return;
    this.#reportMovement(character);
    this.#reportBoss(boss);
  }

  /**
   * Applies damage and reports exactly one accepted enemy hit.
   * @param {Readonly<object>} enemy
   * @param {Readonly<object>} hit
   * @returns {boolean}
   */
  damageEnemy(enemy, hit) {
    if (typeof enemy?.receivePlayerHit !== "function") return false;
    const accepted = enemy.receivePlayerHit(hit);
    if (!accepted) return false;
    const type = enemy.isDead
      ? GAMEPLAY_EVENTS.ENEMY_DEFEATED
      : GAMEPLAY_EVENTS.ENEMY_HIT;
    this.events.emit(type, {
      id: enemy.id,
      enemyType: enemy.type,
      isBoss: Boolean(enemy.isBoss),
    });
    return true;
  }

  /** Performs the report movement operation. */
  #reportMovement(character) {
    this.#reportHorizontalMovement(character);
    const jumped = this.before.velocityY >= 0 && character.velocityY < 0;
    const landed = !this.before.isOnGround && character.isOnGround;
    if (jumped) this.events.emit(GAMEPLAY_EVENTS.PLAYER_JUMP);
    if (landed) this.events.emit(GAMEPLAY_EVENTS.PLAYER_LAND);
    this.#reportWallRebound(character);
    this.#reportJumpCharge(character);
  }

  /** Reports a newly accepted airborne wall impact exactly once. */
  #reportWallRebound(character) {
    const impactCount = character.wallImpactCount ?? 0;
    if (impactCount <= this.before.wallImpactCount) return;
    this.events.emit(GAMEPLAY_EVENTS.PLAYER_WALL_REBOUND, {
      direction: Math.sign(character.velocityX),
      facingDirection: character.facingDirection,
    });
  }

  /** Reports actual left/right movement only when its direction changes. */
  #reportHorizontalMovement(character) {
    const distance = character.x - this.before.x;
    const direction = Math.abs(distance) > 0.01 ? Math.sign(distance) : 0;
    if (direction === 0) this.lastMovementDirection = 0;
    if (direction === 0 || direction === this.lastMovementDirection) return;
    this.lastMovementDirection = direction;
    this.events.emit(GAMEPLAY_EVENTS.PLAYER_MOVE, {
      direction, facingDirection: character.facingDirection,
    });
  }

  /** Performs the report jump charge operation. */
  #reportJumpCharge(character) {
    const percent = character.jumpChargePercent;
    const isCharging = character.isChargingJump;
    const unchanged = percent === this.before.jumpChargePercent &&
      isCharging === this.before.isJumpCharging;
    if (unchanged) return;
    this.events.emit(GAMEPLAY_EVENTS.PLAYER_JUMP_CHARGE, { percent, isCharging });
  }

  /** Performs the report boss operation. */
  #reportBoss(boss) {
    if (!this.before.bossActive && boss.isActive) {
      this.events.emit(GAMEPLAY_EVENTS.BOSS_ACTIVATED, { name: boss.name });
    }
    if (this.before.bossActive && boss.phase !== this.before.bossPhase) {
      this.events.emit(GAMEPLAY_EVENTS.BOSS_PHASE, { phase: boss.phase });
    }
  }
}
