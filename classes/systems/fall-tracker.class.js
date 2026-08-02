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
   * @param {Readonly<object>} worldConfig
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
   * @param {{y:number,isOnGround:boolean}} target
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
   * @param {{y:number,isOnGround:boolean}} target
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
   * @param {{y:number,isOnGround:boolean}} target
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

  #trackCompletedFall(target) {
    if (this.#wasOnGround && !target.isOnGround) this.#startAirborneFall();
    if (!target.isOnGround) this.#recordAirborneDepth(target.y);
    if (!this.#wasOnGround && target.isOnGround) this.#completeFall(target.y);
    if (target.isOnGround) this.#lastGroundY = target.y;
    this.#wasOnGround = target.isOnGround;
  }

  #startAirborneFall() {
    this.#departureY = this.#lastGroundY;
    this.#lowestAirborneY = this.#departureY;
  }

  #recordAirborneDepth(targetY) {
    if (this.#departureY === null) return;
    this.#lowestAirborneY = Math.max(this.#lowestAirborneY, targetY);
  }

  #completeFall(landingY) {
    if (this.#departureY === null) return;
    const lowestY = Math.max(this.#lowestAirborneY, landingY);
    const lossPixels = Math.max(0, lowestY - this.#departureY);
    this.#completedFall = this.#evaluateFall(lossPixels);
    this.#departureY = null;
  }

  #evaluateFall(lossPixels) {
    if (lossPixels < this.#fallConfig.minimumPixels) return null;
    let severity = "normal";
    if (lossPixels >= this.#fallConfig.severePixels) severity = "severe";
    else if (lossPixels >= this.#fallConfig.hardPixels) severity = "hard";
    return Object.freeze({ lossPixels: Math.round(lossPixels), severity });
  }

  #recordSafeHeight(targetY) {
    if (this.#highestSafeY === null) this.#highestSafeY = targetY;
    else this.#highestSafeY = Math.min(this.#highestSafeY, targetY);
  }

  #validateWorldConfig(config) {
    const hasHeight = Number.isFinite(config?.height) && config.height > 0;
    const hasOffset = Number.isFinite(config?.deathZoneOffsetPixels) &&
      config.deathZoneOffsetPixels >= 0;
    if (hasHeight && hasOffset && this.#hasValidFallConfig(config)) return;
    throw new TypeError("Die Todeszonen-Konfiguration ist ungültig.");
  }

  #hasValidFallConfig(config) {
    const fall = config?.fallFeedback;
    const values = [fall?.minimumPixels, fall?.hardPixels, fall?.severePixels];
    const hasNumbers = values.every((value) => Number.isFinite(value));
    return hasNumbers && values[0] > 0 && values[0] < values[1] &&
      values[1] < values[2];
  }

  #validateTarget(target) {
    const hasPosition = Number.isFinite(target?.y);
    if (hasPosition && typeof target.isOnGround === "boolean") return;
    throw new TypeError("Das Fallziel benötigt Position und Bodenstatus.");
  }
}
