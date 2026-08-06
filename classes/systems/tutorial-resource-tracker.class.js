import { GAMEPLAY_EVENTS } from "../core/gameplay-event-hub.class.js";
import { TUTORIAL_STATUSES } from "./tutorial-director.class.js";

/** Completes the resource lesson after both production pickup types. */
export class TutorialResourceTracker {
  #collectedTypes = new Set();
  #unsubscribers = [];

  /**
   * @param {import("../core/game.class.js").Game} game
   * @param {import("./tutorial-director.class.js").TutorialDirector} director
   * @param {Readonly<{stepId:string,requiredTypes:ReadonlyArray<string>}>} config
   */
  constructor(game, director, config) {
    this.#validateDependencies(game, director, config);
    this.game = game;
    this.director = director;
    this.config = Object.freeze({
      stepId: config.stepId,
      requiredTypes: Object.freeze([...config.requiredTypes]),
    });
  }

  /** @returns {TutorialResourceTracker} The initialized tracker. */
  initialize() {
    if (this.#unsubscribers.length > 0) return this;
    this.#unsubscribers.push(
      this.game.onGameplayEvent((event) => this.handleGameplayEvent(event)),
      this.director.onChange((snapshot) => this.handleProgress(snapshot)),
    );
    return this;
  }

  /** Releases observers and run-specific pickup evidence. */
  destroy() {
    this.#unsubscribers.forEach((unsubscribe) => unsubscribe());
    this.#unsubscribers.length = 0;
    this.#collectedTypes.clear();
  }

  /** Clears pickup evidence when the current tutorial run ends. */
  handleProgress(snapshot) {
    if (snapshot.status !== TUTORIAL_STATUSES.INACTIVE) return false;
    const hadEvidence = this.#collectedTypes.size > 0;
    this.#collectedTypes.clear();
    return hadEvidence;
  }

  /** Records only required production pickups during an active tutorial. */
  handleGameplayEvent(event) {
    if (this.director.getSnapshot().status !== TUTORIAL_STATUSES.ACTIVE) {
      return false;
    }
    const type = event.type === GAMEPLAY_EVENTS.PICKUP
      ? event.detail?.type
      : null;
    if (!this.config.requiredTypes.includes(type)) return false;
    return this.#recordPickupType(type);
  }

  /** Stores one required type and completes the lesson once the set is full. */
  #recordPickupType(type) {
    const previousSize = this.#collectedTypes.size;
    this.#collectedTypes.add(type);
    if (this.#collectedTypes.size === this.config.requiredTypes.length) {
      this.director.recordStepCompletion(this.config.stepId);
    }
    return this.#collectedTypes.size > previousSize;
  }

  /** Validates event sources, director commands, and lesson configuration. */
  #validateDependencies(game, director, config) {
    const hasGame = typeof game?.onGameplayEvent === "function";
    const hasDirector = typeof director?.onChange === "function" &&
      typeof director?.getSnapshot === "function" &&
      typeof director?.recordStepCompletion === "function";
    const types = config?.requiredTypes;
    const hasTypes = Array.isArray(types) && types.length >= 2 &&
      types.every((type) => typeof type === "string" && type.length > 0) &&
      new Set(types).size === types.length;
    const hasStep = typeof config?.stepId === "string" && config.stepId.length > 0;
    if (hasGame && hasDirector && hasTypes && hasStep) return;
    throw new TypeError("Der Tutorial-Ressourcentracker ist unvollständig.");
  }
}
