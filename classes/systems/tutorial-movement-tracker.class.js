import { GAMEPLAY_EVENTS } from "../core/gameplay-event-hub.class.js";
import { TUTORIAL_STATUSES } from "./tutorial-director.class.js";

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
      this.director.onChange((snapshot) => this.#handleProgress(snapshot)),
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

  /** Records movement evidence throughout the active tutorial run. */
  handleGameplayEvent(event) {
    if (this.director.getSnapshot().status !== TUTORIAL_STATUSES.ACTIVE) return;
    if (event.type === GAMEPLAY_EVENTS.PLAYER_MOVE) {
      this.#handleMovement(event.detail);
    }
    if (event.type === GAMEPLAY_EVENTS.PLAYER_JUMP_CHARGE) {
      this.#handleCharge(event.detail);
    }
    if (event.type === GAMEPLAY_EVENTS.PLAYER_JUMP) this.#handleJump();
    if (event.type === GAMEPLAY_EVENTS.PLAYER_LAND) this.#handleLanding();
  }

  /** Records a movement only when Byte visibly faces its direction. */
  #handleMovement(movement) {
    const { direction, facingDirection } = movement;
    if (![-1, 1].includes(direction) || facingDirection !== direction) return;
    this.#directions.add(direction);
    if (this.#directions.size === 2) {
      this.director.recordStepCompletion(this.config.movementStepId);
    }
  }

  /** Remembers the greatest visible charge of the current jump. */
  #handleCharge(charge) {
    if (!Number.isFinite(charge.percent)) return;
    this.#maximumChargePercent = Math.max(
      this.#maximumChargePercent, charge.percent,
    );
  }

  /** Evaluates a released jump against the active lesson threshold. */
  #handleJump() {
    const chargePercent = this.#maximumChargePercent;
    this.#maximumChargePercent = 0;
    this.#pendingJumpStepId = this.#getJumpStepId(chargePercent);
  }

  /** Completes a valid jump only after Byte lands safely. */
  #handleLanding() {
    const stepId = this.#pendingJumpStepId;
    this.#pendingJumpStepId = null;
    if (stepId) this.director.recordStepCompletion(stepId);
  }

  /** Maps one measured jump charge to its matching lesson. */
  #getJumpStepId(chargePercent) {
    if (chargePercent <= this.config.shortMaximumPercent) {
      return this.config.shortJumpStepId;
    }
    if (chargePercent >= this.config.chargedMinimumPercent) {
      return this.config.chargedJumpStepId;
    }
    return null;
  }

  /** Clears run evidence only when the tutorial becomes inactive. */
  #handleProgress(snapshot) {
    if (snapshot.status === TUTORIAL_STATUSES.INACTIVE) {
      this.#resetObservations();
    }
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
      typeof director?.recordStepCompletion === "function";
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
