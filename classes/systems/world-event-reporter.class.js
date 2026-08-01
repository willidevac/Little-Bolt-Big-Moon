import { GAMEPLAY_EVENTS } from "../core/gameplay-event-hub.class.js";

/**
 * Erkennt einmalige Bewegungs- und Bosswechsel zwischen zwei Weltständen.
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
  }

  /**
   * Merkt sich den kleinen Zustand vor dem Weltupdate.
   * @param {Readonly<object>|null} character
   * @param {Readonly<object>} boss
   */
  capture(character, boss) {
    this.before = Object.freeze({
      isOnGround: Boolean(character?.isOnGround),
      velocityY: character?.velocityY ?? 0,
      jumpChargePercent: character?.jumpChargePercent ?? 0,
      isJumpCharging: Boolean(character?.jumpController?.isCharging),
      bossActive: boss.isActive,
      bossPhase: boss.phase,
    });
  }

  /**
   * Meldet Sprung, Landung, Bossstart und neue Bossphasen.
   * @param {Readonly<object>|null} character
   * @param {Readonly<object>} boss
   */
  report(character, boss) {
    if (!this.before || !character) return;
    this.#reportMovement(character);
    this.#reportBoss(boss);
  }

  /**
   * Übergibt Schaden und meldet genau einen angenommenen Gegnertreffer.
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

  #reportMovement(character) {
    const jumped = this.before.velocityY >= 0 && character.velocityY < 0;
    const landed = !this.before.isOnGround && character.isOnGround;
    if (jumped) this.events.emit(GAMEPLAY_EVENTS.PLAYER_JUMP);
    if (landed) this.events.emit(GAMEPLAY_EVENTS.PLAYER_LAND);
    this.#reportJumpCharge(character);
  }

  #reportJumpCharge(character) {
    const percent = character.jumpChargePercent;
    const isCharging = character.jumpController.isCharging;
    const unchanged = percent === this.before.jumpChargePercent &&
      isCharging === this.before.isJumpCharging;
    if (unchanged) return;
    this.events.emit(GAMEPLAY_EVENTS.PLAYER_JUMP_CHARGE, { percent, isCharging });
  }

  #reportBoss(boss) {
    if (!this.before.bossActive && boss.isActive) {
      this.events.emit(GAMEPLAY_EVENTS.BOSS_ACTIVATED, { name: boss.name });
    }
    if (this.before.bossActive && boss.phase !== this.before.bossPhase) {
      this.events.emit(GAMEPLAY_EVENTS.BOSS_PHASE, { phase: boss.phase });
    }
  }
}
