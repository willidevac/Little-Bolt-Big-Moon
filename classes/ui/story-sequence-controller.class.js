import { GAME_STATES } from "../core/game-state-machine.class.js";
import { onLanguageChange, translate } from "../../js/i18n/localization.js";

const SEQUENCES = Object.freeze({
  INTRO: "intro",
  OUTRO: "outro",
});
const DEFAULT_DURATION_MILLISECONDS = 2800;
const REDUCED_DURATION_MILLISECONDS = 700;
const SKIP_KEYS = Object.freeze(["Escape", "Enter", "Space"]);

/**
 * Displays short, skippable visual sequences without depending on audio.
 */
export class StorySequenceController {
  /**
   * @param {import("../core/game.class.js").Game} game
   * @param {HTMLElement} root
   */
  constructor(game, root) {
    this.game = game;
    this.root = root;
    this.view = this.#getElement("[data-story-sequence]");
    this.skipButton = this.#getElement("[data-story-sequence-skip]");
    this.status = this.#getElement("[data-story-sequence-status]");
    this.activeSequence = null;
    this.timerId = null;
    this.unsubscribe = null;
    this.unsubscribeLanguage = null;
    this.boundSkip = this.skip.bind(this);
    this.boundKeydown = this.handleKeydown.bind(this);
  }

  /**
   * Binds state changes and skipping at most once.
   * @returns {StorySequenceController}
   */
  initialize() {
    if (this.unsubscribe) return this;
    this.skipButton.addEventListener("click", this.boundSkip);
    this.root.addEventListener("keydown", this.boundKeydown);
    this.unsubscribe = this.game.onStateChange((state) => this.handleState(state));
    this.unsubscribeLanguage = onLanguageChange(() => this.#renderText());
    return this;
  }

  /** Removes all bindings and any active sequence. */
  destroy() {
    this.#finish(false);
    this.skipButton.removeEventListener("click", this.boundSkip);
    this.root.removeEventListener("keydown", this.boundKeydown);
    this.unsubscribe?.();
    this.unsubscribeLanguage?.();
    this.unsubscribe = null;
    this.unsubscribeLanguage = null;
  }

  /**
   * Displays the wordless opening and then begins a fresh run.
   * @returns {boolean}
   */
  playIntro() {
    return this.#play(SEQUENCES.INTRO, () => this.game.reset());
  }

  /**
   * Immediately ends the active sequence.
   * @returns {boolean}
   */
  skip() {
    if (!this.activeSequence) return false;
    this.#finish(true);
    return true;
  }

  /**
   * Skips the sequence accessibly by keyboard.
   * @param {KeyboardEvent} event
   */
  handleKeydown(event) {
    if (!this.activeSequence) return;
    if (event.code === "Tab") return this.#keepFocus(event);
    if (!SKIP_KEYS.includes(event.code)) return;
    event.preventDefault();
    event.stopPropagation();
    this.skip();
  }

  /**
   * Reacts to victory and safely cancels when a new run starts.
   * @param {string} state
   */
  handleState(state) {
    if (state === GAME_STATES.WON) this.#play(SEQUENCES.OUTRO);
    else if (this.activeSequence) this.#finish(false);
  }

  #play(sequence, onComplete = null) {
    if (this.activeSequence) return false;
    this.activeSequence = Object.freeze({ name: sequence, onComplete });
    this.#show(sequence);
    this.timerId = setTimeout(() => this.#finish(true), this.#getDuration());
    return true;
  }

  #show(sequence) {
    this.view.dataset.sequence = sequence;
    this.#renderText();
    this.view.hidden = false;
    this.root.classList.add("is-story-sequence-active");
    this.skipButton.focus();
  }

  #finish(complete) {
    if (!this.activeSequence) return;
    const callback = complete ? this.activeSequence.onComplete : null;
    clearTimeout(this.timerId);
    this.timerId = null;
    this.activeSequence = null;
    this.#hide();
    callback?.();
  }

  #hide() {
    this.view.hidden = true;
    this.view.removeAttribute("data-sequence");
    this.root.classList.remove("is-story-sequence-active");
    this.status.textContent = "";
  }

  #renderText() {
    if (!this.activeSequence) return;
    const text = translate(`story.${this.activeSequence.name}`);
    this.view.setAttribute("aria-label", text);
    this.status.textContent = text;
  }

  #getDuration() {
    const view = this.root.ownerDocument?.defaultView;
    const reduced = view?.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    return reduced ? REDUCED_DURATION_MILLISECONDS : DEFAULT_DURATION_MILLISECONDS;
  }

  #keepFocus(event) {
    event.preventDefault();
    this.skipButton.focus();
  }

  #getElement(selector) {
    const element = this.root.querySelector(selector);
    if (element) return element;
    throw new Error(`Storyelement nicht gefunden: ${selector}`);
  }
}
