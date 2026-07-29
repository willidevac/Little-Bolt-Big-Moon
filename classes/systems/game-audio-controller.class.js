import { GAME_STATES } from "../core/game-state-machine.class.js";
import { GAMEPLAY_EVENTS } from "../core/gameplay-event-hub.class.js";

const SIMPLE_EFFECTS = Object.freeze({
  [GAMEPLAY_EVENTS.PLAYER_JUMP]: "jump",
  [GAMEPLAY_EVENTS.PLAYER_LAND]: "land",
  [GAMEPLAY_EVENTS.PLAYER_HURT]: "hurt",
  [GAMEPLAY_EVENTS.PLAYER_DEATH]: "lose",
  [GAMEPLAY_EVENTS.ENEMY_HIT]: "enemyHit",
  [GAMEPLAY_EVENTS.BOSS_ATTACK]: "bossAttack",
  [GAMEPLAY_EVENTS.BOSS_PHASE]: "bossPhase",
  [GAMEPLAY_EVENTS.WAVE_COMPLETE]: "waveComplete",
});
const ATTACK_EFFECTS = Object.freeze({
  repairWrench: "wrench",
  boltThrower: "bolt",
});
const PICKUP_EFFECTS = Object.freeze({
  gear: "pickupGear",
  energy: "pickupEnergy",
  ammo: "pickupAmmo",
  weapon: "pickupAmmo",
});

/**
 * Übersetzt Spielzustände und neutrale Spielereignisse in Audiobefehle.
 */
export class GameAudioController {
  /**
   * @param {import("../core/game.class.js").Game} game
   * @param {import("./audio-manager.class.js").AudioManager} audio
   * @param {EventTarget} eventTarget
   */
  constructor(game, audio, eventTarget) {
    this.#validateDependencies(game, audio, eventTarget);
    this.game = game;
    this.audio = audio;
    this.eventTarget = eventTarget;
    this.isBossActive = false;
    this.unsubscribers = [];
    this.boundUnlock = this.handleUnlock.bind(this);
  }

  /**
   * Bindet Nutzerfreigabe, Zustände und Gameplay höchstens einmal.
   * @returns {GameAudioController}
   */
  initialize() {
    if (this.unsubscribers.length > 0) return this;
    this.eventTarget.addEventListener("pointerdown", this.boundUnlock, true);
    this.eventTarget.addEventListener("keydown", this.boundUnlock, true);
    this.unsubscribers.push(
      this.game.onStateChange((state) => this.handleStateChange(state)),
      this.game.onGameplayEvent((event) => this.handleGameplayEvent(event)),
    );
    this.handleStateChange(this.game.state);
    return this;
  }

  /** Gibt Audio nach der ersten echten Interaktion frei. */
  handleUnlock() {
    this.audio.unlock();
    this.eventTarget.removeEventListener("pointerdown", this.boundUnlock, true);
    this.eventTarget.removeEventListener("keydown", this.boundUnlock, true);
  }

  /**
   * Steuert Musik und Endklänge über den verbindlichen Game State.
   * @param {string} state
   */
  handleStateChange(state) {
    if (state === GAME_STATES.PLAYING) return this.#playGameplayMusic();
    if (state === GAME_STATES.PAUSED || state === GAME_STATES.UPGRADING) {
      this.audio.pauseMusic();
      return;
    }
    this.audio.stopMusic();
    if (state === GAME_STATES.WON) this.audio.playEffect("win");
    if (state === GAME_STATES.HOME) this.isBossActive = false;
    if (state === GAME_STATES.WON || state === GAME_STATES.LOST) {
      this.isBossActive = false;
    }
  }

  /**
   * Ordnet ein Spielereignis genau einem kontrollierten Effekt zu.
   * @param {Readonly<{type:string, detail:Readonly<object>}>} event
   */
  handleGameplayEvent(event) {
    const effect = SIMPLE_EFFECTS[event.type];
    if (effect) return this.audio.playEffect(effect);
    return this.#handleDetailedEvent(event);
  }

  /**
   * Übernimmt die globale Einstellung und setzt Musik nur im Spiel fort.
   * @param {boolean} isMuted
   */
  setMuted(isMuted) {
    this.audio.setMuted(isMuted);
    if (!isMuted && this.game.state === GAME_STATES.PLAYING) {
      this.#playGameplayMusic();
    }
  }

  /** @param {number} volume */
  setMusicVolume(volume) {
    this.audio.setMusicVolume(volume);
  }

  /** @param {number} volume */
  setEffectsVolume(volume) {
    this.audio.setEffectsVolume(volume);
  }

  #handleDetailedEvent(event) {
    if (event.type === GAMEPLAY_EVENTS.PLAYER_ATTACK) {
      return this.#playMappedEffect(ATTACK_EFFECTS, event.detail.weaponId);
    }
    if (event.type === GAMEPLAY_EVENTS.PICKUP) {
      return this.#playMappedEffect(PICKUP_EFFECTS, event.detail.type);
    }
    if (event.type === GAMEPLAY_EVENTS.ENEMY_DEFEATED) {
      return this.#playEnemyDefeat(event.detail);
    }
    return event.type === GAMEPLAY_EVENTS.BOSS_ACTIVATED
      ? this.#activateBossAudio()
      : false;
  }

  /** Entfernt alle Verbindungen und stoppt die vorbereiteten Tracks. */
  destroy() {
    this.eventTarget.removeEventListener("pointerdown", this.boundUnlock, true);
    this.eventTarget.removeEventListener("keydown", this.boundUnlock, true);
    this.unsubscribers.forEach((unsubscribe) => unsubscribe());
    this.unsubscribers.length = 0;
    this.audio.destroy();
  }

  #playGameplayMusic() {
    this.audio.playMusic(this.isBossActive ? "boss" : "climb");
  }

  #playMappedEffect(mapping, key) {
    const effect = mapping[key];
    return effect ? this.audio.playEffect(effect) : false;
  }

  #playEnemyDefeat(detail) {
    return this.audio.playEffect(detail.isBoss ? "bossDeath" : "enemyDeath");
  }

  #activateBossAudio() {
    this.isBossActive = true;
    this.audio.playEffect("bossPhase");
    if (this.game.state === GAME_STATES.PLAYING) this.audio.playMusic("boss");
  }

  #validateDependencies(game, audio, eventTarget) {
    const hasGame = typeof game?.onStateChange === "function" &&
      typeof game?.onGameplayEvent === "function";
    const hasAudio = typeof audio?.playEffect === "function" &&
      typeof audio?.playMusic === "function" &&
      typeof audio?.setMusicVolume === "function" &&
      typeof audio?.setEffectsVolume === "function";
    const hasEvents = typeof eventTarget?.addEventListener === "function";
    if (hasGame && hasAudio && hasEvents) return;
    throw new TypeError("Der Spielaudio-Steuerung fehlen Abhängigkeiten.");
  }
}
