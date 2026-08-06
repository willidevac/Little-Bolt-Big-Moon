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
   * Creates the configured system.
   * @param {import("../core/game.class.js").Game} game Game used while constructor.
   * @param {import("./tutorial-director.class.js").TutorialDirector} director Director used while constructor.
   * @param {Readonly<object>} config Configuration values used by the system.
   */
  constructor(game, director, config) {
    this.#validateDependencies(game, director, config);
    this.game = game;
    this.director = director;
    this.config = Object.freeze({
      ...config, checkpoints: Object.freeze({ ...config.checkpoints }),
      weaponSteps: Object.freeze([...config.weaponSteps]),
      encounterSteps: Object.freeze({ ...config.encounterSteps }),
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

  /**
   * Stores only the latest configured tutorial step and position.
   * @param {Readonly<object>} snapshot Immutable state snapshot processed by the operation.
   */
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

  /**
   * Restarts the current section for actual falls or defeats.
   * @param {Readonly<object>} event Gameplay event handled by the system.
   */
  handleGameplayEvent(event) {
    if (!RECOVERY_EVENTS.has(event.type) || !this.#checkpoint) return false;
    return this.#recover();
  }

  /** Rebuilds the world, then restores only required tutorial equipment. */
  #recover() {
    if (this.#isRecovering) return false;
    this.#isRecovering = true;
    const recovered = this.game.restartWorldAt(this.#checkpoint.position);
    if (recovered) {
      this.#restoreWeapon();
      this.#restoreEncounter();
    }
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

  /** Restores a configured deferred encounter after the fresh world exists. */
  #restoreEncounter() {
    const zoneId = this.config.encounterSteps[this.#checkpoint.stepId];
    if (!zoneId) return false;
    return this.game.world.waveManager.restoreZone(zoneId, this.game.world);
  }

  /**
   * Validates recovery commands, progress observations, and configuration.
   * @param {Readonly<object>} game Game used while validate dependencies.
   * @param {Readonly<object>} director Director used while validate dependencies.
   * @param {Readonly<object>} config Configuration values used by the system.
   */
  #validateDependencies(game, director, config) {
    const hasGame = typeof game?.onGameplayEvent === "function" &&
      typeof game?.restartWorldAt === "function" &&
      typeof game?.gameplayEvents?.emit === "function";
    const hasDirector = typeof director?.onChange === "function" &&
      typeof director?.getSnapshot === "function";
    const hasRecoveryConfig = this.#hasRecoveryConfig(config);
    const hasEncounters = this.#hasEncounterConfig(game, config);
    if (hasGame && hasDirector && hasRecoveryConfig &&
      hasEncounters) return;
    throw new TypeError("Die Tutorial-Checkpoints sind unvollständig.");
  }

  /**
   * Checks checkpoint positions and weapon recovery configuration.
   * @param {Readonly<object>} config Configuration values used by the system.
   */
  #hasRecoveryConfig(config) {
    const hasCheckpoints = config?.checkpoints &&
      Object.values(config.checkpoints).every(this.#isValidPosition);
    const hasWeapon = Array.isArray(config?.weaponSteps) &&
      typeof config?.weaponId === "string" && config.weaponId.length > 0;
    return Boolean(hasCheckpoints && hasWeapon);
  }

  /**
   * Checks encounter recovery commands and every configured zone identity.
   * @param {Readonly<object>} game Game used while has encounter config.
   * @param {Readonly<object>} config Configuration values used by the system.
   */
  #hasEncounterConfig(game, config) {
    const ids = Object.values(config?.encounterSteps ?? {});
    const hasIds = config?.encounterSteps && ids.every((id) => {
      return typeof id === "string" && id.length > 0;
    });
    return Boolean(hasIds) &&
      typeof game?.world?.waveManager?.restoreZone === "function";
  }

  /**
   * Checks whether a checkpoint position is finite.
   * @param {Readonly<object>} position Position used while is valid position.
   */
  #isValidPosition(position) {
    return [position?.x, position?.y].every(Number.isFinite);
  }
}
