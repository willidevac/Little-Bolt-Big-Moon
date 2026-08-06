import { TUTORIAL_STATUSES } from
  "../systems/tutorial-director.class.js";
import { onLanguageChange, translate } from
  "../../js/i18n/localization.js";

/** Renders the current tutorial lesson as an accessible compact prompt. */
export class TutorialPromptController {
  /**
   * @param {import("../systems/tutorial-director.class.js").TutorialDirector} director
   * @param {HTMLElement} root
   */
  constructor(director, root) {
    this.#validateDependencies(director, root);
    this.director = director;
    this.root = root;
    this.title = this.#getElement("[data-tutorial-title]");
    this.copy = this.#getElement("[data-tutorial-copy]");
    this.progress = this.#getElement("[data-tutorial-progress]");
    this.snapshot = director.getSnapshot();
    this.unsubscribers = [];
  }

  /** @returns {TutorialPromptController} The initialized prompt. */
  initialize() {
    if (this.unsubscribers.length > 0) return this;
    this.unsubscribers.push(
      this.director.onChange((snapshot) => this.render(snapshot)),
      onLanguageChange(() => this.render(this.snapshot)),
    );
    this.render(this.snapshot);
    return this;
  }

  /** Removes tutorial and language subscriptions. */
  destroy() {
    this.unsubscribers.forEach((unsubscribe) => unsubscribe());
    this.unsubscribers.length = 0;
    this.root.hidden = true;
  }

  /** Displays one immutable tutorial progress snapshot. */
  render(snapshot) {
    this.snapshot = snapshot;
    const isVisible = snapshot.status === TUTORIAL_STATUSES.ACTIVE;
    this.root.hidden = !isVisible;
    this.root.setAttribute("aria-hidden", String(!isVisible));
    if (!isVisible) return;
    this.#renderStep(snapshot.stepId);
    this.#renderProgress(snapshot);
  }

  /** Draws the localized title and instruction of one step. */
  #renderStep(stepId) {
    this.title.textContent = translate(`tutorial.step.${stepId}.title`);
    this.copy.textContent = translate(`tutorial.step.${stepId}.copy`);
  }

  /** Draws lesson position without counting the terminal state. */
  #renderProgress(snapshot) {
    const current = Math.min(snapshot.stepIndex + 1, snapshot.totalSteps);
    this.progress.textContent = translate("tutorial.progress", {
      current, total: snapshot.totalSteps,
    });
  }

  /** Returns a required prompt child. */
  #getElement(selector) {
    const element = this.root.querySelector(selector);
    if (element instanceof HTMLElement) return element;
    throw new Error(`Tutorial-Element nicht gefunden: ${selector}`);
  }

  /** Validates the tutorial source and prompt root. */
  #validateDependencies(director, root) {
    const hasDirector = typeof director?.onChange === "function" &&
      typeof director?.getSnapshot === "function";
    if (hasDirector && root instanceof HTMLElement) return;
    throw new TypeError("Die Tutorial-Anzeige ist unvollständig.");
  }
}
