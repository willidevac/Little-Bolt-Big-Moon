import { GAME_STATES } from "../core/game-state-machine.class.js";

export const TUTORIAL_STATUSES = Object.freeze({
  INACTIVE: "inactive",
  ACTIVE: "active",
  COMPLETED: "completed",
});

/** Orchestrates the linear tutorial without changing gameplay systems. */
export class TutorialDirector {
  #currentIndex;
  #game;
  #levelId;
  #listeners = new Set();
  #status;
  #steps;
  #unsubscribeState = null;

  /**
   * @param {import("../core/game.class.js").Game} game
   * @param {Readonly<{levelId:string, steps:ReadonlyArray<string>}>} config
   */
  constructor(game, config) {
    this.#validateDependencies(game, config);
    this.#game = game;
    this.#levelId = config.levelId;
    this.#steps = Object.freeze([...config.steps]);
    this.#resetState();
  }

  /** @returns {TutorialDirector} The initialized director. */
  initialize() {
    if (this.#unsubscribeState) return this;
    this.#unsubscribeState = this.#game.onStateChange((state) => {
      this.handleGameState(state);
    });
    this.handleGameState(this.#game.state);
    return this;
  }

  /** Releases every subscription and observer. */
  destroy() {
    this.#unsubscribeState?.();
    this.#unsubscribeState = null;
    this.#listeners.clear();
    this.#resetState();
  }

  /**
   * Observes tutorial progress snapshots.
   * @param {(snapshot:Readonly<object>) => void} listener
   * @returns {() => void}
   */
  onChange(listener) {
    if (typeof listener !== "function") {
      throw new TypeError("Der Tutorial-Beobachter muss eine Funktion sein.");
    }
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  /** @returns {Readonly<object>} The immutable current tutorial progress. */
  getSnapshot() {
    return Object.freeze({
      status: this.#status,
      stepId: this.#currentIndex < 0 ? null : this.#steps[this.#currentIndex],
      stepIndex: this.#currentIndex,
      completedSteps: Math.max(0, this.#currentIndex),
      totalSteps: this.#steps.length - 1,
    });
  }

  /**
   * Starts or resets progress when the surrounding game state changes.
   * @param {string} state
   * @returns {boolean}
   */
  handleGameState(state) {
    if (state === GAME_STATES.HOME) return this.reset();
    if (state !== GAME_STATES.PLAYING) return false;
    if (this.#game.levelId !== this.#levelId) return this.reset();
    return this.start();
  }

  /** @returns {boolean} Whether a new tutorial run began. */
  start() {
    if (this.#status !== TUTORIAL_STATUSES.INACTIVE) return false;
    this.#status = TUTORIAL_STATUSES.ACTIVE;
    this.#currentIndex = 0;
    this.#notifyChange();
    return true;
  }

  /**
   * Completes exactly the currently active step.
   * @param {string} stepId
   * @returns {boolean}
   */
  completeStep(stepId) {
    if (this.#status !== TUTORIAL_STATUSES.ACTIVE) return false;
    if (this.#steps[this.#currentIndex] !== stepId) return false;
    this.#currentIndex += 1;
    if (this.#currentIndex === this.#steps.length - 1) {
      this.#status = TUTORIAL_STATUSES.COMPLETED;
    }
    this.#notifyChange();
    return true;
  }

  /** @returns {boolean} Whether active progress was cleared. */
  reset() {
    if (this.#status === TUTORIAL_STATUSES.INACTIVE) return false;
    this.#resetState();
    this.#notifyChange();
    return true;
  }

  /** Applies the inactive state without notifying observers. */
  #resetState() {
    this.#status = TUTORIAL_STATUSES.INACTIVE;
    this.#currentIndex = -1;
  }

  /** Publishes one immutable progress snapshot. */
  #notifyChange() {
    const snapshot = this.getSnapshot();
    this.#listeners.forEach((listener) => listener(snapshot));
  }

  /** Validates dependencies and the complete ordered step contract. */
  #validateDependencies(game, config) {
    const hasGame = typeof game?.onStateChange === "function" &&
      typeof game?.state === "string";
    const steps = config?.steps;
    const hasSteps = Array.isArray(steps) && steps.length >= 2 &&
      steps.every((step) => typeof step === "string" && step.length > 0) &&
      new Set(steps).size === steps.length;
    const hasLevel = typeof config?.levelId === "string" && config.levelId;
    if (hasGame && hasSteps && hasLevel) return;
    throw new TypeError("Die Tutorial-Steuerung ist unvollständig konfiguriert.");
  }
}
