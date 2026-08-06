import { GAMEPLAY_EVENTS } from "../core/gameplay-event-hub.class.js";
import { TUTORIAL_STATUSES } from "./tutorial-director.class.js";

/** Completes the final lesson only after the configured tutorial boss dies. */
export class TutorialBossTracker {
  #unsubscribe = null;

  /**
   * Creates the configured system.
   * @param {import("../core/game.class.js").Game} game Game used while constructor.
   * @param {import("./tutorial-director.class.js").TutorialDirector} director Director used while constructor.
   * @param {Readonly<{stepId:string,bossId:string}>} config Configuration values used by the system.
   */
  constructor(game, director, config) {
    this.#validateDependencies(game, director, config);
    this.game = game;
    this.director = director;
    this.config = Object.freeze({ ...config });
  }

  /** @returns {TutorialBossTracker} The initialized tracker. */
  initialize() {
    if (this.#unsubscribe) return this;
    this.#unsubscribe = this.game.onGameplayEvent((event) => {
      this.handleGameplayEvent(event);
    });
    return this;
  }

  /** Releases the gameplay event subscription. */
  destroy() {
    this.#unsubscribe?.();
    this.#unsubscribe = null;
  }

  /**
   * Records only the real configured boss defeat during the tutorial.
   * @param {Readonly<object>} event Gameplay event handled by the system.
   */
  handleGameplayEvent(event) {
    if (this.director.getSnapshot().status !== TUTORIAL_STATUSES.ACTIVE) {
      return false;
    }
    const matches = event.type === GAMEPLAY_EVENTS.ENEMY_DEFEATED &&
      event.detail.id === this.config.bossId && event.detail.isBoss === true;
    if (!matches) return false;
    return this.director.recordStepCompletion(this.config.stepId);
  }

  /**
   * Validates event source, director command, and tutorial identities.
   * @param {Readonly<object>} game Game used while validate dependencies.
   * @param {Readonly<object>} director Director used while validate dependencies.
   * @param {Readonly<object>} config Configuration values used by the system.
   */
  #validateDependencies(game, director, config) {
    const hasGame = typeof game?.onGameplayEvent === "function";
    const hasDirector = typeof director?.getSnapshot === "function" &&
      typeof director?.recordStepCompletion === "function";
    const values = [config?.stepId, config?.bossId];
    const hasValues = values.every((value) => {
      return typeof value === "string" && value.length > 0;
    });
    if (hasGame && hasDirector && hasValues) return;
    throw new TypeError("Der Tutorial-Bosstracker ist unvollständig.");
  }
}
