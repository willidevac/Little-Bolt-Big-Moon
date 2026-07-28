import { GAME_STATES } from "../core/game-state-machine.class.js";
import { formatScore, formatTime } from "../../js/utils/format.js";

const SELECTORS = Object.freeze({
  mute: '[data-ui-action="mute"]',
  score: "[data-record-score]",
  height: "[data-record-height]",
  time: "[data-record-time]",
});

/**
 * Verbindet gespeicherte Rekorde und Einstellungen mit der Oberfläche.
 */
export class StorageController {
  /**
   * @param {import("../core/game.class.js").Game} game
   * @param {import("../systems/game-storage.class.js").GameStorage} storage
   * @param {import("../systems/game-audio-controller.class.js").GameAudioController} audio
  * @param {HTMLElement} root
  */
  constructor(game, storage, audio, root) {
    this.#validateAudio(audio);
    this.game = game;
    this.storage = storage;
    this.audio = audio;
    this.root = root;
    this.#assignElements();
    this.unsubscribe = null;
    this.boundMuteClick = this.handleMuteClick.bind(this);
  }

  #assignElements() {
    this.muteButton = this.#getRequiredElement(SELECTORS.mute);
    this.scoreElement = this.#getRequiredElement(SELECTORS.score);
    this.heightElement = this.#getRequiredElement(SELECTORS.height);
    this.timeElement = this.#getRequiredElement(SELECTORS.time);
  }

  /**
   * Bindet die Oberfläche genau einmal an Speicherung und Spielende.
   * @returns {StorageController}
   */
  initialize() {
    if (this.unsubscribe) return this;
    this.muteButton.addEventListener("click", this.boundMuteClick);
    this.unsubscribe = this.game.onStateChange((state) => {
      this.handleStateChange(state);
    });
    const records = this.storage.getSnapshot();
    this.#applyMute(records);
    this.render(records);
    return this;
  }

  /**
   * Entfernt alle von diesem Controller gesetzten Verbindungen.
   */
  destroy() {
    this.muteButton.removeEventListener("click", this.boundMuteClick);
    this.unsubscribe?.();
    this.unsubscribe = null;
  }

  /**
   * Schaltet den gemerkten Tonstatus um.
   */
  handleMuteClick() {
    const current = this.storage.getSnapshot();
    const records = this.storage.setMuted(!current.isMuted);
    this.#applyMute(records);
    this.render(records);
  }

  /**
   * Speichert Rekorde nur nach einem vollständig beendeten Lauf.
   * @param {string} state
   */
  handleStateChange(state) {
    const isVictory = state === GAME_STATES.WON;
    if (!isVictory && state !== GAME_STATES.LOST) return;
    const records = this.storage.recordRun(this.game.getHudSnapshot(), isVictory);
    this.render(records);
  }

  /**
   * Zeigt Rekorde und Mute-Status barrierefrei an.
   * @param {Readonly<object>} records
   */
  render(records) {
    this.scoreElement.textContent = formatScore(records.bestScore);
    this.heightElement.textContent = `${records.maximumHeight} m`;
    this.timeElement.textContent = formatTime(records.bestTimeSeconds);
    this.muteButton.textContent = records.isMuted ? "Ton: aus" : "Ton: an";
    this.muteButton.setAttribute("aria-pressed", String(records.isMuted));
    this.muteButton.setAttribute(
      "aria-label",
      records.isMuted ? "Ton einschalten" : "Ton stummschalten",
    );
  }

  #getRequiredElement(selector) {
    const element = this.root.querySelector(selector);
    if (element instanceof HTMLElement) return element;
    throw new Error(`Speicheranzeige nicht gefunden: ${selector}`);
  }

  #applyMute(records) {
    this.audio.setMuted(records.isMuted);
  }

  #validateAudio(audio) {
    if (typeof audio?.setMuted === "function") return;
    throw new TypeError("Der Speichersteuerung fehlt die Audiosteuerung.");
  }
}
