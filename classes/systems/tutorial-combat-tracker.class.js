import { GAMEPLAY_EVENTS } from "../core/gameplay-event-hub.class.js";

/** Completes the combat lesson from a real production wave completion. */
export class TutorialCombatTracker {
  #unsubscribe = null;

  /**
   * @param {import("../core/game.class.js").Game} game
   * @param {import("./tutorial-director.class.js").TutorialDirector} director
   * @param {Readonly<object>} config
   */
  constructor(game, director, config) {
    this.#validateDependencies(game, director, config);
    this.game = game;
    this.director = director;
    this.config = Object.freeze({ ...config });
  }

  /** @returns {TutorialCombatTracker} The initialized tracker. */
  initialize() {
    if (this.#unsubscribe) return this;
    this.#unsubscribe = this.game.onGameplayEvent((event) => {
      this.handleGameplayEvent(event);
    });
    return this;
  }

  /** Releases the gameplay subscription. */
  destroy() {
    this.#unsubscribe?.();
    this.#unsubscribe = null;
  }

  /** Completes only the active combat lesson for its configured wave. */
  handleGameplayEvent(event) {
    const stepId = this.director.getSnapshot().stepId;
    const matches = stepId === this.config.stepId &&
      event.type === GAMEPLAY_EVENTS.WAVE_COMPLETE &&
      event.detail.id === this.config.zoneId;
    if (matches) this.director.completeStep(stepId);
  }

  /** Validates event source, director commands, and combat identities. */
  #validateDependencies(game, director, config) {
    const hasGame = typeof game?.onGameplayEvent === "function";
    const hasDirector = typeof director?.getSnapshot === "function" &&
      typeof director?.completeStep === "function";
    const values = [config?.stepId, config?.zoneId];
    const hasValues = values.every((value) => {
      return typeof value === "string" && value.length > 0;
    });
    if (hasGame && hasDirector && hasValues) return;
    throw new TypeError("Der Tutorial-Kampftracker ist unvollständig.");
  }
}
