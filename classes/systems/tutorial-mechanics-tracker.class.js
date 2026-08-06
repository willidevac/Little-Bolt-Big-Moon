import { GAMEPLAY_EVENTS } from "../core/gameplay-event-hub.class.js";

/** Completes wall-rebound and platform-mechanic tutorial lessons. */
export class TutorialMechanicsTracker {
  #activatedMechanics = new Set();
  #unsubscribers = [];

  /**
   * @param {import("../core/game.class.js").Game} game
   * @param {import("./tutorial-director.class.js").TutorialDirector} director
   * @param {Readonly<object>} config
   */
  constructor(game, director, config) {
    this.#validateDependencies(game, director, config);
    this.game = game;
    this.director = director;
    this.config = Object.freeze({
      ...config, requiredMechanics: Object.freeze([...config.requiredMechanics]),
    });
  }

  /** @returns {TutorialMechanicsTracker} The initialized tracker. */
  initialize() {
    if (this.#unsubscribers.length > 0) return this;
    this.#unsubscribers.push(
      this.game.onGameplayEvent((event) => this.handleGameplayEvent(event)),
      this.director.onChange(() => this.#activatedMechanics.clear()),
    );
    return this;
  }

  /** Releases gameplay and tutorial subscriptions. */
  destroy() {
    this.#unsubscribers.forEach((unsubscribe) => unsubscribe());
    this.#unsubscribers.length = 0;
    this.#activatedMechanics.clear();
  }

  /** Routes semantic gameplay events to the active mechanic lesson. */
  handleGameplayEvent(event) {
    const stepId = this.director.getSnapshot().stepId;
    if (stepId === this.config.wallStepId &&
      event.type === GAMEPLAY_EVENTS.PLAYER_WALL_REBOUND) {
      this.director.completeStep(stepId);
    }
    if (stepId === this.config.platformStepId &&
      event.type === GAMEPLAY_EVENTS.PLATFORM_ACTIVATED) {
      this.#recordMechanic(stepId, event.detail.mechanic);
    }
  }

  /** Records one required platform mechanic without counting duplicates. */
  #recordMechanic(stepId, mechanic) {
    if (!this.config.requiredMechanics.includes(mechanic)) return;
    this.#activatedMechanics.add(mechanic);
    const complete = this.config.requiredMechanics.every((required) => {
      return this.#activatedMechanics.has(required);
    });
    if (complete) this.director.completeStep(stepId);
  }

  /** Validates event sources, director commands, steps, and mechanic IDs. */
  #validateDependencies(game, director, config) {
    const hasGame = typeof game?.onGameplayEvent === "function";
    const hasDirector = typeof director?.onChange === "function" &&
      typeof director?.getSnapshot === "function" &&
      typeof director?.completeStep === "function";
    const stepIds = [config?.wallStepId, config?.platformStepId];
    const hasSteps = stepIds.every((id) => typeof id === "string" && id);
    const mechanics = config?.requiredMechanics;
    const hasMechanics = Array.isArray(mechanics) && mechanics.length > 0 &&
      mechanics.every((id) => typeof id === "string" && id) &&
      new Set(mechanics).size === mechanics.length;
    if (hasGame && hasDirector && hasSteps && hasMechanics) return;
    throw new TypeError("Der Tutorial-Mechaniktracker ist unvollständig.");
  }
}
