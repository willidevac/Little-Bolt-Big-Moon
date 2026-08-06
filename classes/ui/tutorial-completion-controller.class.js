import { onLanguageChange, translate } from
  "../../js/i18n/localization.js";
import { TUTORIAL_STATUSES } from
  "../systems/tutorial-director.class.js";

const PRIMARY_BUTTON_CLASS = "menu-button--primary";

/** Finalizes tutorial runs and reflects their saved recommendation state. */
export class TutorialCompletionController {
  #handledCompletion = false;
  #unsubscribers = [];

  /**
   * @param {import("../core/game.class.js").Game} game
   * @param {import("../systems/tutorial-director.class.js").TutorialDirector} director
   * @param {import("../systems/game-storage.class.js").GameStorage} storage
   * @param {HTMLElement} root
   */
  constructor(game, director, storage, root) {
    this.#validateDependencies(game, director, storage, root);
    Object.assign(this, { game, director, storage, root });
    this.tutorialButton = this.#getElement('[data-ui-action="tutorial"]');
    this.startButton = this.#getElement('[data-ui-action="start"]');
  }

  /** @returns {TutorialCompletionController} The initialized controller. */
  initialize() {
    if (this.#unsubscribers.length > 0) return this;
    this.#unsubscribers.push(
      this.director.onChange((snapshot) => this.handleProgress(snapshot)),
      onLanguageChange(() => this.renderRecommendation()),
    );
    this.renderRecommendation();
    this.handleProgress(this.director.getSnapshot());
    return this;
  }

  /** Releases tutorial and language subscriptions. */
  destroy() {
    this.#unsubscribers.forEach((unsubscribe) => unsubscribe());
    this.#unsubscribers.length = 0;
    this.#handledCompletion = false;
  }

  /** Saves and finishes a newly completed tutorial exactly once. */
  handleProgress(snapshot) {
    if (snapshot.status !== TUTORIAL_STATUSES.COMPLETED) {
      this.#handledCompletion = false;
      return false;
    }
    if (this.#handledCompletion) return false;
    this.#handledCompletion = true;
    this.storage.setTutorialCompleted();
    this.renderRecommendation();
    return this.game.win();
  }

  /** Renders the recommended first-run action in the active language. */
  renderRecommendation() {
    const completed = this.storage.getSnapshot().tutorialCompleted;
    const key = completed ? "home.tutorialReplay" : "home.tutorial";
    this.tutorialButton.dataset.i18n = key;
    this.tutorialButton.dataset.tutorialCompleted = String(completed);
    this.tutorialButton.textContent = translate(key);
    this.tutorialButton.classList.toggle(PRIMARY_BUTTON_CLASS, !completed);
    this.startButton.classList.toggle(PRIMARY_BUTTON_CLASS, completed);
  }

  /** Returns one required menu button. */
  #getElement(selector) {
    const element = this.root.querySelector(selector);
    if (element instanceof HTMLElement) return element;
    throw new Error(`Tutorial-Menüelement nicht gefunden: ${selector}`);
  }

  /** Validates completion, storage, and menu dependencies. */
  #validateDependencies(game, director, storage, root) {
    const hasGame = typeof game?.win === "function";
    const hasDirector = typeof director?.onChange === "function" &&
      typeof director?.getSnapshot === "function";
    const hasStorage = typeof storage?.getSnapshot === "function" &&
      typeof storage?.setTutorialCompleted === "function";
    if (hasGame && hasDirector && hasStorage && root instanceof HTMLElement) return;
    throw new TypeError("Der Tutorial-Abschluss ist unvollständig.");
  }
}
