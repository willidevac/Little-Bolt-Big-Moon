import { GAMEPLAY_EVENTS } from "../core/gameplay-event-hub.class.js";

const RECOVERY_EVENTS = new Set([
  GAMEPLAY_EVENTS.PLAYER_DEATH,
  GAMEPLAY_EVENTS.PLAYER_FALL,
]);

/** Restarts failed tutorial sections at their latest safe position. */
export class TutorialCheckpointController {
  #checkpoint = null;
  #isRecovering = false;
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
      ...config, checkpoints: Object.freeze({ ...config.checkpoints }),
      weaponSteps: Object.freeze([...config.weaponSteps]),
    });
  }

  /** @returns {TutorialCheckpointController} The initialized controller. */
  initialize() {
    if (this.#unsubscribers.length > 0) return this;
    this.#unsubscribers.push(
      this.game.onGameplayEvent((event) => this.handleGameplayEvent(event)),
      this.director.onChange((snapshot) => this.handleProgress(snapshot)),
    );
    this.handleProgress(this.director.getSnapshot());
    return this;
  }

  /** Releases gameplay and tutorial subscriptions. */
  destroy() {
    this.#unsubscribers.forEach((unsubscribe) => unsubscribe());
    this.#unsubscribers.length = 0;
    this.#checkpoint = null;
    this.#isRecovering = false;
  }

  /** Stores only the latest configured tutorial step and position. */
  handleProgress(snapshot) {
    if (snapshot.status === "inactive") {
      this.#checkpoint = null;
      return;
    }
    const position = this.config.checkpoints[snapshot.stepId];
    if (!position) return;
    this.#checkpoint = Object.freeze({
      stepId: snapshot.stepId,
      position: Object.freeze({ ...position }),
    });
  }

  /** Restarts the current section for actual falls or defeats. */
  handleGameplayEvent(event) {
    if (!RECOVERY_EVENTS.has(event.type) || !this.#checkpoint) return false;
    return this.#recover();
  }

  /** Rebuilds the world, then restores only required tutorial equipment. */
  #recover() {
    if (this.#isRecovering) return false;
    this.#isRecovering = true;
    const recovered = this.game.restartWorldAt(this.#checkpoint.position);
    if (recovered) this.#restoreWeapon();
    this.#isRecovering = false;
    return recovered;
  }

  /** Restores the required weapon after checkpoints beyond its pickup. */
  #restoreWeapon() {
    if (!this.config.weaponSteps.includes(this.#checkpoint.stepId)) return;
    this.game.gameplayEvents.emit(GAMEPLAY_EVENTS.PICKUP, {
      type: "weapon", weaponId: this.config.weaponId, amount: 1,
    });
  }

  /** Validates recovery commands, progress observations, and configuration. */
  #validateDependencies(game, director, config) {
    const hasGame = typeof game?.onGameplayEvent === "function" &&
      typeof game?.restartWorldAt === "function" &&
      typeof game?.gameplayEvents?.emit === "function";
    const hasDirector = typeof director?.onChange === "function" &&
      typeof director?.getSnapshot === "function";
    const hasCheckpoints = config?.checkpoints &&
      Object.values(config.checkpoints).every(this.#isValidPosition);
    const hasWeapon = Array.isArray(config?.weaponSteps) &&
      typeof config?.weaponId === "string" && config.weaponId.length > 0;
    if (hasGame && hasDirector && hasCheckpoints && hasWeapon) return;
    throw new TypeError("Die Tutorial-Checkpoints sind unvollständig.");
  }

  /** Checks whether a checkpoint position is finite. */
  #isValidPosition(position) {
    return [position?.x, position?.y].every(Number.isFinite);
  }
}
