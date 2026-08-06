import { TUTORIAL_STATUSES } from
  "../systems/tutorial-director.class.js";
import { onLanguageChange, translate } from
  "../../js/i18n/localization.js";

/** Renders the current tutorial lesson as an accessible compact prompt. */
export class TutorialPromptController {
  /**
   * Creates the configured instance.
   * @param {import("../systems/tutorial-director.class.js").TutorialDirector} director Tutorial director supplying lesson progress.
   * @param {HTMLElement} root Root DOM element queried or controlled by the instance.
   */
  constructor(director, root) {
    this.#validateDependencies(director, root);
    this.director = director;
    this.root = root;
    this.title = this.#getElement("[data-tutorial-title]");
    this.copy = this.#getElement("[data-tutorial-copy]");
    this.progress = this.#getElement("[data-tutorial-progress]");
    this.details = this.#getElement("[data-tutorial-details]");
    this.toggle = this.#getElement("[data-tutorial-toggle]");
    this.snapshot = director.getSnapshot();
    this.isCollapsed = false;
    this.boundToggle = () => this.handleToggle();
    this.unsubscribers = [];
  }

  /** @returns {TutorialPromptController} The initialized prompt. */
  initialize() {
    if (this.unsubscribers.length > 0) return this;
    this.toggle.addEventListener("click", this.boundToggle);
    this.unsubscribers.push(
      this.director.onChange((snapshot) => this.render(snapshot)),
      onLanguageChange(() => this.render(this.snapshot)),
    );
    this.render(this.snapshot);
    return this;
  }

  /** Removes tutorial and language subscriptions. */
  destroy() {
    this.toggle.removeEventListener("click", this.boundToggle);
    this.unsubscribers.forEach((unsubscribe) => unsubscribe());
    this.unsubscribers.length = 0;
    this.root.hidden = true;
  }

  /**
   * Displays one immutable tutorial progress snapshot.
   * @param {Readonly<object>} snapshot Snapshot supplied to render.
   */
  render(snapshot) {
    this.snapshot = snapshot;
    const isVisible = snapshot.status === TUTORIAL_STATUSES.ACTIVE;
    this.root.hidden = !isVisible;
    this.root.setAttribute("aria-hidden", String(!isVisible));
    if (!isVisible) return;
    this.#renderStep(snapshot.stepId);
    this.#renderProgress(snapshot);
    this.#renderCollapsedState();
  }

  /** Toggles the current instruction body without hiding its progress. */
  handleToggle() {
    if (this.root.hidden) return false;
    this.isCollapsed = !this.isCollapsed;
    this.#renderCollapsedState();
    return true;
  }

  /**
   * Draws the localized title and instruction of one step.
   * @param {string} stepId Step id supplied to render step.
   */
  #renderStep(stepId) {
    this.title.textContent = translate(`tutorial.step.${stepId}.title`);
    this.copy.textContent = translate(`tutorial.step.${stepId}.copy`);
  }

  /**
   * Draws lesson position without counting the terminal state.
   * @param {Readonly<object>} snapshot Snapshot supplied to render progress.
   */
  #renderProgress(snapshot) {
    const current = Math.min(snapshot.stepIndex + 1, snapshot.totalSteps);
    this.progress.textContent = translate("tutorial.progress", {
      current, total: snapshot.totalSteps,
    });
  }

  /** Synchronizes visible body, state attribute, icon, and accessible label. */
  #renderCollapsedState() {
    this.details.hidden = this.isCollapsed;
    this.root.dataset.collapsed = String(this.isCollapsed);
    this.toggle.textContent = this.isCollapsed ? "i" : "−";
    this.toggle.setAttribute("aria-expanded", String(!this.isCollapsed));
    const key = this.isCollapsed ? "tutorial.expand" : "tutorial.collapse";
    this.toggle.setAttribute("aria-label", translate(key));
  }

  /**
   * Returns a required prompt child.
   * @param {string} selector CSS selector used to find the required element.
   */
  #getElement(selector) {
    const element = this.root.querySelector(selector);
    if (element instanceof HTMLElement) return element;
    throw new Error(`Tutorial-Element nicht gefunden: ${selector}`);
  }

  /**
   * Validates the tutorial source and prompt root.
   * @param {Readonly<object>} director Tutorial director supplying lesson progress.
   * @param {HTMLElement} root Root DOM element queried or controlled by the instance.
   */
  #validateDependencies(director, root) {
    const hasDirector = typeof director?.onChange === "function" &&
      typeof director?.getSnapshot === "function";
    if (hasDirector && root instanceof HTMLElement) return;
    throw new TypeError("Die Tutorial-Anzeige ist unvollständig.");
  }
}
