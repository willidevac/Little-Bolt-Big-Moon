import { GAMEPLAY_EVENTS } from "../core/gameplay-event-hub.class.js";
import { TUTORIAL_STATUSES } from "./tutorial-director.class.js";

/** Completes weapon pickup and practice-target defeat tutorial lessons. */
export class TutorialCombatBasicsTracker {
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

  /** @returns {TutorialCombatBasicsTracker} The initialized tracker. */
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
   * Records matching combat evidence throughout the active tutorial run.
   * @param {Readonly<object>} event Gameplay event handled by the system.
   */
  handleGameplayEvent(event) {
    if (this.director.getSnapshot().status !== TUTORIAL_STATUSES.ACTIVE) return;
    this.#handlePickup(event);
    this.#handleTargetHit(event);
  }

  /**
   * Accepts only the configured production weapon pickup.
   * @param {Readonly<object>} event Gameplay event handled by the system.
   */
  #handlePickup(event) {
    const matches = event.type === GAMEPLAY_EVENTS.PICKUP &&
      event.detail.type === "weapon" &&
      event.detail.weaponId === this.config.weaponId;
    if (matches) this.director.recordStepCompletion(this.config.weaponStepId);
  }

  /**
   * Accepts only a real configured-weapon defeat of the practice target.
   * @param {Readonly<object>} event Gameplay event handled by the system.
   */
  #handleTargetHit(event) {
    const matches = event.type === GAMEPLAY_EVENTS.ENEMY_DEFEATED &&
      event.detail.id === this.config.targetId &&
      event.detail.source === this.config.weaponId;
    if (matches) this.director.recordStepCompletion(this.config.targetStepId);
  }

  /**
   * Validates event source, director commands, and lesson identities.
   * @param {Readonly<object>} game Game used while validate dependencies.
   * @param {Readonly<object>} director Director used while validate dependencies.
   * @param {Readonly<object>} config Configuration values used by the system.
   */
  #validateDependencies(game, director, config) {
    const hasGame = typeof game?.onGameplayEvent === "function";
    const hasDirector = typeof director?.getSnapshot === "function" &&
      typeof director?.recordStepCompletion === "function";
    const values = [config?.weaponStepId, config?.targetStepId,
      config?.weaponId, config?.targetId];
    const hasValues = values.every((value) => {
      return typeof value === "string" && value.length > 0;
    });
    if (hasGame && hasDirector && hasValues) return;
    throw new TypeError("Der Tutorial-Kampfgrundlagentracker ist unvollständig.");
  }
}
