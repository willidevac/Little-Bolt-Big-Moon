/**
 * Measures height loss and detects the death zone below the world.
 */
export class FallTracker {
  #deathZoneY;
  #highestSafeY;
  #heightLossPixels;
  #fallConfig;
  #wasOnGround;
  #lastGroundY;
  #departureY;
  #lowestAirborneY;
  #completedFall;

  /**
   * Creates the configured system.
   * @param {Readonly<object>} worldConfig World and fall thresholds used by the tracker.
   */
  constructor(worldConfig) {
    this.#validateWorldConfig(worldConfig);
    this.#deathZoneY = worldConfig.height + worldConfig.deathZoneOffsetPixels;
    this.#fallConfig = worldConfig.fallFeedback;
    this.#highestSafeY = null;
    this.#heightLossPixels = 0;
  }

  /**
   * Restarts measurement at a character's current position.
   * @param {{y:number,isOnGround:boolean}} target Target inspected or updated by the system.
   */
  reset(target) {
    this.#validateTarget(target);
    this.#highestSafeY = target.isOnGround ? target.y : null;
    this.#heightLossPixels = 0;
    this.#wasOnGround = target.isOnGround;
    this.#lastGroundY = target.isOnGround ? target.y : null;
    this.#departureY = null;
    this.#lowestAirborneY = target.y;
    this.#completedFall = null;
  }

  /**
   * Updates the highest safe position and current height loss.
   * @param {{y:number,isOnGround:boolean}} target Target inspected or updated by the system.
   * @returns {number} Current height loss in world pixels.
   */
  update(target) {
    this.#validateTarget(target);
    this.#trackCompletedFall(target);
    if (target.isOnGround) this.#recordSafeHeight(target.y);
    if (this.#highestSafeY === null) return 0;
    this.#heightLossPixels = Math.max(0, target.y - this.#highestSafeY);
    return this.#heightLossPixels;
  }

  /**
   * Checks whether a character has fallen completely below the safe world.
   * @param {{y:number,isOnGround:boolean}} target Target inspected or updated by the system.
   * @returns {boolean}
   */
  hasReachedDeathZone(target) {
    this.#validateTarget(target);
    return target.y >= this.#deathZoneY;
  }

  /**
   * Returns the current height loss.
   * @returns {number}
   */
  getHeightLossPixels() {
    return this.#heightLossPixels;
  }

  /** Returns a completed fall exactly once. */
  takeCompletedFall() {
    const fall = this.#completedFall;
    this.#completedFall = null;
    return fall;
  }

  /**
   * Performs the track completed fall operation.
   * @param {Readonly<object>} target Target inspected or updated by the system.
   */
  #trackCompletedFall(target) {
    if (this.#wasOnGround && !target.isOnGround) this.#startAirborneFall();
    if (!target.isOnGround) this.#recordAirborneDepth(target.y);
    if (!this.#wasOnGround && target.isOnGround) this.#completeFall(target.y);
    if (target.isOnGround) this.#lastGroundY = target.y;
    this.#wasOnGround = target.isOnGround;
  }

  /** Performs the start airborne fall operation. */
  #startAirborneFall() {
    this.#departureY = this.#lastGroundY;
    this.#lowestAirborneY = this.#departureY;
  }

  /**
   * Performs the record airborne depth operation.
   * @param {number} targetY Target y used by record airborne depth.
   */
  #recordAirborneDepth(targetY) {
    if (this.#departureY === null) return;
    this.#lowestAirborneY = Math.max(this.#lowestAirborneY, targetY);
  }

  /**
   * Performs the complete fall operation.
   * @param {number} landingY Landing y used by complete fall.
   */
  #completeFall(landingY) {
    if (this.#departureY === null) return;
    const lowestY = Math.max(this.#lowestAirborneY, landingY);
    const lossPixels = Math.max(0, lowestY - this.#departureY);
    this.#completedFall = this.#evaluateFall(lossPixels);
    this.#departureY = null;
  }

  /**
   * Performs the evaluate fall operation.
   * @param {Readonly<object>} lossPixels Loss pixels used by evaluate fall.
   */
  #evaluateFall(lossPixels) {
    if (lossPixels < this.#fallConfig.minimumPixels) return null;
    let severity = "normal";
    if (lossPixels >= this.#fallConfig.severePixels) severity = "severe";
    else if (lossPixels >= this.#fallConfig.hardPixels) severity = "hard";
    return Object.freeze({ lossPixels: Math.round(lossPixels), severity });
  }

  /**
   * Performs the record safe height operation.
   * @param {number} targetY Target y used by record safe height.
   */
  #recordSafeHeight(targetY) {
    if (this.#highestSafeY === null) this.#highestSafeY = targetY;
    else this.#highestSafeY = Math.min(this.#highestSafeY, targetY);
  }

  /**
   * Validates world config.
   * @param {Readonly<object>} config Configuration values used by the system.
   */
  #validateWorldConfig(config) {
    const hasHeight = Number.isFinite(config?.height) && config.height > 0;
    const hasOffset = Number.isFinite(config?.deathZoneOffsetPixels) &&
      config.deathZoneOffsetPixels >= 0;
    if (hasHeight && hasOffset && this.#hasValidFallConfig(config)) return;
    throw new TypeError("Die Todeszonen-Konfiguration ist ungültig.");
  }

  /**
   * Checks the valid fall config condition.
   * @param {Readonly<object>} config Configuration values used by the system.
   */
  #hasValidFallConfig(config) {
    const fall = config?.fallFeedback;
    const values = [fall?.minimumPixels, fall?.hardPixels, fall?.severePixels];
    const hasNumbers = values.every((value) => Number.isFinite(value));
    return hasNumbers && values[0] > 0 && values[0] < values[1] &&
      values[1] < values[2];
  }

  /**
   * Validates target.
   * @param {Readonly<object>} target Target inspected or updated by the system.
   */
  #validateTarget(target) {
    const hasPosition = Number.isFinite(target?.y);
    if (hasPosition && typeof target.isOnGround === "boolean") return;
    throw new TypeError("Das Fallziel benötigt Position und Bodenstatus.");
  }
}
