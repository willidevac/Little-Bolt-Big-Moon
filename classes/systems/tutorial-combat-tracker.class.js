import { GAMEPLAY_EVENTS } from "../core/gameplay-event-hub.class.js";
import { TUTORIAL_STATUSES } from "./tutorial-director.class.js";

/** Completes the combat lesson from a real production wave completion. */
export class TutorialCombatTracker {
  #unsubscribe = null;

  /**
   * Creates the configured system.
   * @param {import("../core/game.class.js").Game} game Game used while constructor.
   * @param {import("./tutorial-director.class.js").TutorialDirector} director Director used while constructor.
   * @param {Readonly<object>} config Configuration values used by the system.
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

  /**
   * Records the configured wave throughout the active tutorial run.
   * @param {Readonly<object>} event Gameplay event handled by the system.
   */
  handleGameplayEvent(event) {
    if (this.director.getSnapshot().status !== TUTORIAL_STATUSES.ACTIVE) return;
    const matches = event.type === GAMEPLAY_EVENTS.WAVE_COMPLETE &&
      event.detail.id === this.config.zoneId;
    if (matches) this.director.recordStepCompletion(this.config.stepId);
  }

  /**
   * Validates event source, director commands, and combat identities.
   * @param {Readonly<object>} game Game used while validate dependencies.
   * @param {Readonly<object>} director Director used while validate dependencies.
   * @param {Readonly<object>} config Configuration values used by the system.
   */
  #validateDependencies(game, director, config) {
    const hasGame = typeof game?.onGameplayEvent === "function";
    const hasDirector = typeof director?.getSnapshot === "function" &&
      typeof director?.recordStepCompletion === "function";
    const values = [config?.stepId, config?.zoneId];
    const hasValues = values.every((value) => {
      return typeof value === "string" && value.length > 0;
    });
    if (hasGame && hasDirector && hasValues) return;
    throw new TypeError("Der Tutorial-Kampftracker ist unvollständig.");
  }
}
