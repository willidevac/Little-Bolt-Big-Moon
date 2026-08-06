import { GAME_STATES } from "../core/game-state-machine.class.js";
import { formatScore, formatTime } from "../../js/utils/format.js";
import { onLanguageChange, translate } from "../../js/i18n/localization.js";
import { GAME_LEVEL_IDS } from "../../js/config/level-config.js";

const SELECTORS = Object.freeze({
  mute: '[data-ui-action="mute"]',
  score: "[data-record-score]",
  height: "[data-record-height]",
  time: "[data-record-time]",
  volumeControls: "[data-volume-control]",
  volumeOutputs: "[data-volume-output]",
});

/**
 * Connects saved records and settings to the interface.
 */
export class StorageController {
  /**
   * Creates the configured instance.
   * @param {import("../core/game.class.js").Game} game Game instance controlled by the view.
   * @param {import("../systems/game-storage.class.js").GameStorage} storage Storage service used to persist local data.
   * @param {import("../systems/game-audio-controller.class.js").GameAudioController} audio Audio supplied to constructor.
   * @param {HTMLElement} root Root DOM element queried or controlled by the instance.
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

  /** Applies elements. */
  #assignElements() {
    this.muteButton = this.#getRequiredElement(SELECTORS.mute);
    this.scoreElement = this.#getRequiredElement(SELECTORS.score);
    this.heightElement = this.#getRequiredElement(SELECTORS.height);
    this.timeElement = this.#getRequiredElement(SELECTORS.time);
    this.volumeControls = [...this.root.querySelectorAll(SELECTORS.volumeControls)];
    this.volumeOutputs = [...this.root.querySelectorAll(SELECTORS.volumeOutputs)];
  }

  /**
   * Binds the interface to storage and game completion exactly once.
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

  /** Performs the bind controls operation. */
  #bindControls() {
    this.muteButton.addEventListener("click", this.boundMuteClick);
    this.volumeControls.forEach((control) => {
      control.addEventListener("input", this.boundVolumeInput);
    });
  }

  /** Performs the bind observers operation. */
  #bindObservers() {
    this.unsubscribe = this.game.onStateChange((state) => {
      this.handleStateChange(state);
    });
    this.unsubscribeLanguage = onLanguageChange(() => {
      this.render(this.storage.getSnapshot());
    });
  }

  /**
   * Removes all bindings created by this controller.
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
   * Toggles the stored mute state.
   */
  handleMuteClick() {
    const current = this.storage.getSnapshot();
    const records = this.storage.setMuted(!current.isMuted);
    this.#applyAudioSettings(records);
    this.render(records);
  }

  /**
   * Applies a volume control immediately and stores it.
   * @param {Event} event Input or gameplay event handled by the operation.
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
   * Stores records only after a fully completed run.
   * @param {string} state State value processed by the operation.
   */
  handleStateChange(state) {
    if (this.game.canvas.dataset.reviewMode === "true") return;
    const isVictory = state === GAME_STATES.WON;
    if (!isVictory && state !== GAME_STATES.LOST) return;
    if (this.game.levelId === GAME_LEVEL_IDS.TUTORIAL) {
      this.render(this.storage.getSnapshot());
      return;
    }
    const records = this.storage.recordRun(this.game.getHudSnapshot(), isVictory);
    this.render(records);
  }

  /**
   * Displays records and mute state accessibly.
   * @param {Readonly<object>} records Persisted settings and records rendered by the view.
   */
  render(records) {
    this.scoreElement.textContent = formatScore(records.bestScore);
    this.heightElement.textContent = `${records.maximumHeight} m`;
    this.timeElement.textContent = formatTime(records.bestTimeSeconds);
    this.#renderMute(records.isMuted);
    this.#renderVolume("music", records.musicVolume);
    this.#renderVolume("effects", records.effectsVolume);
  }

  /**
   * Draws render mute.
   * @param {boolean} isMuted Whether audio is currently muted.
   */
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

  /**
   * Returns required element.
   * @param {string} selector CSS selector used to find the required element.
   */
  #getRequiredElement(selector) {
    const element = this.root.querySelector(selector);
    if (element instanceof HTMLElement) return element;
    throw new Error(`Speicheranzeige nicht gefunden: ${selector}`);
  }

  /**
   * Applies audio settings.
   * @param {Readonly<object>} records Persisted settings and records rendered by the view.
   */
  #applyAudioSettings(records) {
    this.audio.setMusicVolume(records.musicVolume / 100);
    this.audio.setEffectsVolume(records.effectsVolume / 100);
    this.audio.setMuted(records.isMuted);
  }

  /**
   * Validates audio.
   * @param {Readonly<object>} audio Audio supplied to validate audio.
   */
  #validateAudio(audio) {
    const isValid = typeof audio?.setMuted === "function" &&
      typeof audio?.setMusicVolume === "function" &&
      typeof audio?.setEffectsVolume === "function";
    if (isValid) return;
    throw new TypeError("Der Speichersteuerung fehlt die Audiosteuerung.");
  }

  /**
   * Draws render volume.
   * @param {HTMLElement} group Group supplied to render volume.
   * @param {string} value Value read, validated, or rendered by the operation.
   */
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
