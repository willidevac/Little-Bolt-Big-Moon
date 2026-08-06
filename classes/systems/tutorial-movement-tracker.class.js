import { GAMEPLAY_EVENTS } from "../core/gameplay-event-hub.class.js";

/** Completes the movement and jump lessons from semantic gameplay events. */
export class TutorialMovementTracker {
  #directions = new Set();
  #maximumChargePercent = 0;
  #pendingJumpStepId = null;
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
    this.config = Object.freeze({ ...config });
  }

  /** @returns {TutorialMovementTracker} The initialized tracker. */
  initialize() {
    if (this.#unsubscribers.length > 0) return this;
    this.#unsubscribers.push(
      this.game.onGameplayEvent((event) => this.handleGameplayEvent(event)),
      this.director.onChange(() => this.#resetObservations()),
    );
    this.#resetObservations();
    return this;
  }

  /** Releases gameplay and tutorial subscriptions. */
  destroy() {
    this.#unsubscribers.forEach((unsubscribe) => unsubscribe());
    this.#unsubscribers.length = 0;
    this.#resetObservations();
  }

  /** Routes one gameplay event to the currently active lesson. */
  handleGameplayEvent(event) {
    const stepId = this.director.getSnapshot().stepId;
    if (event.type === GAMEPLAY_EVENTS.PLAYER_MOVE) {
      this.#handleMovement(stepId, event.detail);
    }
    if (event.type === GAMEPLAY_EVENTS.PLAYER_JUMP_CHARGE) {
      this.#handleCharge(stepId, event.detail);
    }
    if (event.type === GAMEPLAY_EVENTS.PLAYER_JUMP) this.#handleJump(stepId);
    if (event.type === GAMEPLAY_EVENTS.PLAYER_LAND) this.#handleLanding(stepId);
  }

  /** Records a movement only when Byte visibly faces its direction. */
  #handleMovement(stepId, movement) {
    if (stepId !== this.config.movementStepId) return;
    const { direction, facingDirection } = movement;
    if (![-1, 1].includes(direction) || facingDirection !== direction) return;
    this.#directions.add(direction);
    if (this.#directions.size === 2) this.director.completeStep(stepId);
  }

  /** Remembers the greatest visible charge of the current jump. */
  #handleCharge(stepId, charge) {
    if (!this.#isJumpStep(stepId) || !Number.isFinite(charge.percent)) return;
    this.#maximumChargePercent = Math.max(
      this.#maximumChargePercent, charge.percent,
    );
  }

  /** Evaluates a released jump against the active lesson threshold. */
  #handleJump(stepId) {
    if (!this.#isJumpStep(stepId)) return;
    const chargePercent = this.#maximumChargePercent;
    this.#maximumChargePercent = 0;
    if (stepId === this.config.shortJumpStepId &&
      chargePercent <= this.config.shortMaximumPercent) {
      this.#pendingJumpStepId = stepId;
    }
    if (stepId === this.config.chargedJumpStepId &&
      chargePercent >= this.config.chargedMinimumPercent) {
      this.#pendingJumpStepId = stepId;
    }
  }

  /** Completes a valid jump only after Byte lands safely. */
  #handleLanding(stepId) {
    if (this.#pendingJumpStepId !== stepId) return;
    this.director.completeStep(stepId);
  }

  /** Checks whether the current step evaluates jump charge. */
  #isJumpStep(stepId) {
    return [this.config.shortJumpStepId, this.config.chargedJumpStepId]
      .includes(stepId);
  }

  /** Clears partial evidence when a lesson or run changes. */
  #resetObservations() {
    this.#directions.clear();
    this.#maximumChargePercent = 0;
    this.#pendingJumpStepId = null;
  }

  /** Validates event sources, director commands, and thresholds. */
  #validateDependencies(game, director, config) {
    const hasGame = typeof game?.onGameplayEvent === "function";
    const hasDirector = typeof director?.onChange === "function" &&
      typeof director?.getSnapshot === "function" &&
      typeof director?.completeStep === "function";
    const values = [config?.shortMaximumPercent, config?.chargedMinimumPercent];
    const hasThresholds = values.every(Number.isFinite) &&
      values[0] >= 0 && values[0] < values[1] && values[1] <= 100;
    const ids = [config?.movementStepId, config?.shortJumpStepId,
      config?.chargedJumpStepId];
    const hasIds = ids.every((id) => typeof id === "string" && id.length > 0);
    if (hasGame && hasDirector && hasThresholds && hasIds) return;
    throw new TypeError("Der Tutorial-Bewegungstracker ist unvollständig.");
  }
}
