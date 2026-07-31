import { GAME_STATES } from "../core/game-state-machine.class.js";
import { formatScore, formatTime } from "../../js/utils/format.js";
import { onLanguageChange, translate } from "../../js/i18n/localization.js";

const SELECTORS = Object.freeze({
  mute: '[data-ui-action="mute"]',
  score: "[data-record-score]",
  height: "[data-record-height]",
  time: "[data-record-time]",
  volumeControls: "[data-volume-control]",
  volumeOutputs: "[data-volume-output]",
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
    this.unsubscribeLanguage = null;
    this.boundMuteClick = this.handleMuteClick.bind(this);
    this.boundVolumeInput = this.handleVolumeInput.bind(this);
  }

  #assignElements() {
    this.muteButton = this.#getRequiredElement(SELECTORS.mute);
    this.scoreElement = this.#getRequiredElement(SELECTORS.score);
    this.heightElement = this.#getRequiredElement(SELECTORS.height);
    this.timeElement = this.#getRequiredElement(SELECTORS.time);
    this.volumeControls = [...this.root.querySelectorAll(SELECTORS.volumeControls)];
    this.volumeOutputs = [...this.root.querySelectorAll(SELECTORS.volumeOutputs)];
  }

  /**
   * Bindet die Oberfläche genau einmal an Speicherung und Spielende.
   * @returns {StorageController}
   */
  initialize() {
    if (this.unsubscribe) return this;
    this.#bindControls();
    this.#bindObservers();
    const records = this.storage.getSnapshot();
    this.#applyAudioSettings(records);
    this.render(records);
    return this;
  }

  #bindControls() {
    this.muteButton.addEventListener("click", this.boundMuteClick);
    this.volumeControls.forEach((control) => {
      control.addEventListener("input", this.boundVolumeInput);
    });
  }

  #bindObservers() {
    this.unsubscribe = this.game.onStateChange((state) => {
      this.handleStateChange(state);
    });
    this.unsubscribeLanguage = onLanguageChange(() => {
      this.render(this.storage.getSnapshot());
    });
  }

  /**
   * Entfernt alle von diesem Controller gesetzten Verbindungen.
   */
  destroy() {
    this.muteButton.removeEventListener("click", this.boundMuteClick);
    this.volumeControls.forEach((control) => {
      control.removeEventListener("input", this.boundVolumeInput);
    });
    this.unsubscribe?.();
    this.unsubscribeLanguage?.();
    this.unsubscribe = null;
    this.unsubscribeLanguage = null;
  }

  /**
   * Schaltet den gemerkten Tonstatus um.
   */
  handleMuteClick() {
    const current = this.storage.getSnapshot();
    const records = this.storage.setMuted(!current.isMuted);
    this.#applyAudioSettings(records);
    this.render(records);
  }

  /**
   * Übernimmt einen Lautstärkeregler sofort und speichert ihn.
   * @param {Event} event
   */
  handleVolumeInput(event) {
    const control = event.target;
    if (!(control instanceof HTMLInputElement)) return;
    const records = this.storage.setVolume(
      control.dataset.volumeControl,
      Number(control.value),
    );
    this.#applyAudioSettings(records);
    this.render(records);
  }

  /**
   * Speichert Rekorde nur nach einem vollständig beendeten Lauf.
   * @param {string} state
   */
  handleStateChange(state) {
    if (this.game.canvas.dataset.reviewMode === "true") return;
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
    this.#renderMute(records.isMuted);
    this.#renderVolume("music", records.musicVolume);
    this.#renderVolume("effects", records.effectsVolume);
  }

  #renderMute(isMuted) {
    this.muteButton.textContent = translate(
      isMuted ? "audio.muted" : "audio.active",
    );
    this.muteButton.setAttribute("aria-pressed", String(isMuted));
    this.muteButton.setAttribute(
      "aria-label",
      translate(isMuted ? "audio.enable" : "audio.disable"),
    );
  }

  #getRequiredElement(selector) {
    const element = this.root.querySelector(selector);
    if (element instanceof HTMLElement) return element;
    throw new Error(`Speicheranzeige nicht gefunden: ${selector}`);
  }

  #applyAudioSettings(records) {
    this.audio.setMusicVolume(records.musicVolume / 100);
    this.audio.setEffectsVolume(records.effectsVolume / 100);
    this.audio.setMuted(records.isMuted);
  }

  #validateAudio(audio) {
    const isValid = typeof audio?.setMuted === "function" &&
      typeof audio?.setMusicVolume === "function" &&
      typeof audio?.setEffectsVolume === "function";
    if (isValid) return;
    throw new TypeError("Der Speichersteuerung fehlt die Audiosteuerung.");
  }

  #renderVolume(group, value) {
    const control = this.volumeControls.find((element) => {
      return element.dataset.volumeControl === group;
    });
    const output = this.volumeOutputs.find((element) => {
      return element.dataset.volumeOutput === group;
    });
    if (control instanceof HTMLInputElement) control.value = String(value);
    if (output instanceof HTMLOutputElement) output.textContent = `${value} %`;
  }
}
