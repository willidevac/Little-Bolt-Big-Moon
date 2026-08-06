import { GAME_STATES } from "../core/game-state-machine.class.js";

export const TUTORIAL_STATUSES = Object.freeze({
  INACTIVE: "inactive",
  ACTIVE: "active",
  COMPLETED: "completed",
});

/** Orchestrates the linear tutorial without changing gameplay systems. */
export class TutorialDirector {
  #completedEvidence = new Set();
  #currentIndex;
  #game;
  #levelId;
  #listeners = new Set();
  #status;
  #steps;
  #unsubscribeState = null;

  /**
   * Creates the configured system.
   * @param {import("../core/game.class.js").Game} game Game used while constructor.
   * @param {Readonly<{levelId:string, steps:ReadonlyArray<string>}>} config Configuration values used by the system.
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
   * @param {(snapshot:Readonly<object>) => void} listener Listener used while on change.
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
   * @param {string} state State used while handle game state.
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
   * @param {string} stepId Step id used while complete step.
   * @returns {boolean}
   */
  completeStep(stepId) {
    if (this.#status !== TUTORIAL_STATUSES.ACTIVE) return false;
    if (this.#steps[this.#currentIndex] !== stepId) return false;
    return this.recordStepCompletion(stepId);
  }

  /**
   * Buffers valid future lesson evidence until all earlier steps are complete.
   * @param {string} stepId Step id used while record step completion.
   * @returns {boolean} Whether new evidence was accepted.
   */
  recordStepCompletion(stepId) {
    if (!this.#isPendingStep(stepId)) return false;
    if (this.#completedEvidence.has(stepId)) return false;
    this.#completedEvidence.add(stepId);
    this.#advanceBufferedSteps();
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
    this.#completedEvidence.clear();
    this.#status = TUTORIAL_STATUSES.INACTIVE;
    this.#currentIndex = -1;
  }

  /** Advances through every consecutive lesson with recorded evidence. */
  #advanceBufferedSteps() {
    let advanced = false;
    while (this.#completedEvidence.delete(this.#steps[this.#currentIndex])) {
      this.#currentIndex += 1;
      advanced = true;
    }
    if (!advanced) return;
    if (this.#currentIndex === this.#steps.length - 1) {
      this.#status = TUTORIAL_STATUSES.COMPLETED;
    }
    this.#notifyChange();
  }

  /**
   * Checks whether evidence belongs to this run's current or future lessons.
   * @param {string} stepId Step id used while is pending step.
   */
  #isPendingStep(stepId) {
    if (this.#status !== TUTORIAL_STATUSES.ACTIVE) return false;
    const stepIndex = this.#steps.indexOf(stepId);
    return stepIndex >= this.#currentIndex && stepIndex < this.#steps.length - 1;
  }

  /** Publishes one immutable progress snapshot. */
  #notifyChange() {
    const snapshot = this.getSnapshot();
    this.#listeners.forEach((listener) => listener(snapshot));
  }

  /**
   * Validates dependencies and the complete ordered step contract.
   * @param {Readonly<object>} game Game used while validate dependencies.
   * @param {Readonly<object>} config Configuration values used by the system.
   */
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
