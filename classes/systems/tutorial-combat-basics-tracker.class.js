import { GAMEPLAY_EVENTS } from "../core/gameplay-event-hub.class.js";

/** Completes weapon pickup and practice-target defeat tutorial lessons. */
export class TutorialCombatBasicsTracker {
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

  /** Routes pickup and defeat evidence to their currently active lesson. */
  handleGameplayEvent(event) {
    const stepId = this.director.getSnapshot().stepId;
    if (stepId === this.config.weaponStepId) this.#handlePickup(event, stepId);
    if (stepId === this.config.targetStepId) this.#handleTargetHit(event, stepId);
  }

  /** Accepts only the configured production weapon pickup. */
  #handlePickup(event, stepId) {
    const matches = event.type === GAMEPLAY_EVENTS.PICKUP &&
      event.detail.type === "weapon" &&
      event.detail.weaponId === this.config.weaponId;
    if (matches) this.director.completeStep(stepId);
  }

  /** Accepts only a real configured-weapon defeat of the practice target. */
  #handleTargetHit(event, stepId) {
    const matches = event.type === GAMEPLAY_EVENTS.ENEMY_DEFEATED &&
      event.detail.id === this.config.targetId &&
      event.detail.source === this.config.weaponId;
    if (matches) this.director.completeStep(stepId);
  }

  /** Validates event source, director commands, and lesson identities. */
  #validateDependencies(game, director, config) {
    const hasGame = typeof game?.onGameplayEvent === "function";
    const hasDirector = typeof director?.getSnapshot === "function" &&
      typeof director?.completeStep === "function";
    const values = [config?.weaponStepId, config?.targetStepId,
      config?.weaponId, config?.targetId];
    const hasValues = values.every((value) => {
      return typeof value === "string" && value.length > 0;
    });
    if (hasGame && hasDirector && hasValues) return;
    throw new TypeError("Der Tutorial-Kampfgrundlagentracker ist unvollständig.");
  }
}
