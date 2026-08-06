export const GAMEPLAY_EVENTS = Object.freeze({
  PLAYER_MOVE: "playerMove",
  PLAYER_JUMP: "playerJump",
  PLAYER_JUMP_CHARGE: "playerJumpCharge",
  PLAYER_LAND: "playerLand",
  PLAYER_ATTACK: "playerAttack",
  PLAYER_HURT: "playerHurt",
  PLAYER_DEATH: "playerDeath",
  PLAYER_FALL: "playerFall",
  PICKUP: "pickup",
  WEAPON_CHANGED: "weaponChanged",
  ENEMY_HIT: "enemyHit",
  ENEMY_DEFEATED: "enemyDefeated",
  BOSS_ATTACK: "bossAttack",
  BOSS_ACTIVATED: "bossActivated",
  BOSS_PHASE: "bossPhase",
  WAVE_COMPLETE: "waveComplete",
});

/** @typedef {typeof GAMEPLAY_EVENTS[keyof typeof GAMEPLAY_EVENTS]} GameplayEventType */
/** @typedef {Readonly<Record<string, unknown>>} GameplayEventDetail */
/** @typedef {Readonly<{type:GameplayEventType, detail:GameplayEventDetail}>} GameplayEvent */

/** @type {Set<GameplayEventType>} */
const KNOWN_EVENTS = new Set(Object.values(GAMEPLAY_EVENTS));

/**
 * Distributes immutable gameplay events without audio or UI knowledge.
 */
export class GameplayEventHub {
  /** @type {Set<(event:GameplayEvent) => void>} */
  #listeners = new Set();

  /**
   * Registers an observer and returns its unsubscribe function.
   * @param {(event:GameplayEvent) => void} listener
   * @returns {() => void}
   */
  on(listener) {
    if (typeof listener !== "function") {
      throw new TypeError("Der Spielereignis-Beobachter muss eine Funktion sein.");
    }
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  /**
   * Distributes a known event with an immutable copy of its details.
   * @param {GameplayEventType} type
   * @param {GameplayEventDetail} [detail={}]
   */
  emit(type, detail = {}) {
    if (!KNOWN_EVENTS.has(type) || !detail || typeof detail !== "object") {
      throw new TypeError("Das Spielereignis ist ungültig.");
    }
    const event = Object.freeze({ type, detail: Object.freeze({ ...detail }) });
    this.#listeners.forEach((listener) => listener(event));
  }
}
