/**
 * Translates world coordinates into the vertical canvas view.
 */
export class Camera {
  /**
   * @param {Readonly<object>} config
   */
  constructor(config) {
    this.#validateConfig(config);
    this.x = 0;
    this.y = 0;
    this.viewportHeight = config.canvas.height;
    this.worldHeight = config.world.height;
    this.deadZoneTop = config.camera.deadZoneTopPixels;
    this.deadZoneBottom = config.camera.deadZoneBottomPixels;
    this.upwardFollowSpeed = config.camera.upwardFollowSpeedPixelsPerSecond;
    this.downwardFollowSpeed = config.camera.downwardFollowSpeedPixelsPerSecond;
    this.followSpeedMultiplier = 1;
  }

  /**
   * Resets the view to the start and immediately shows a valid target.
   * @param {{y:number, height:number}|null} [target=null]
   */
  reset(target = null) {
    this.x = 0;
    this.y = 0;
    if (this.#isValidTarget(target)) {
      this.y = this.#clampY(this.#getDesiredY(target));
    }
  }

  /**
   * Follows a target within the vertical dead zone over time.
   * @param {{y:number, height:number}} target
   * @param {number} deltaTimeSeconds
   * @returns {boolean} Whether the camera moved.
   */
  update(target, deltaTimeSeconds) {
    if (!this.#isValidTarget(target) || !this.#isValidDeltaTime(deltaTimeSeconds)) {
      return false;
    }
    const desiredY = this.#clampY(this.#getDesiredY(target));
    const speed = this.#getFollowSpeed(desiredY);
    const nextY = this.#moveTowards(this.y, desiredY, speed * deltaTimeSeconds);
    if (nextY === this.y) return false;
    this.y = nextY;
    return true;
  }

  /** Temporarily accelerates camera tracking, for example during review flight. */
  setFollowSpeedMultiplier(multiplier = 1) {
    if (!Number.isFinite(multiplier) || multiplier < 1) {
      throw new RangeError("Der Kamera-Folgefaktor muss mindestens 1 sein.");
    }
    this.followSpeedMultiplier = multiplier;
  }

  /** Returns desired y. */
  #getDesiredY(target) {
    const targetCenterY = target.y + target.height / 2;
    const screenY = targetCenterY - this.y;
    if (screenY < this.deadZoneTop) return targetCenterY - this.deadZoneTop;
    if (screenY > this.deadZoneBottom) return targetCenterY - this.deadZoneBottom;
    return this.y;
  }

  /** Returns follow speed. */
  #getFollowSpeed(desiredY) {
    const speed = desiredY < this.y
      ? this.upwardFollowSpeed
      : this.downwardFollowSpeed;
    return speed * this.followSpeedMultiplier;
  }

  /** Performs the move towards operation. */
  #moveTowards(current, target, maximumDistance) {
    if (current < target) return Math.min(current + maximumDistance, target);
    return Math.max(current - maximumDistance, target);
  }

  /** Performs the clamp y operation. */
  #clampY(y) {
    const maximumY = Math.max(0, this.worldHeight - this.viewportHeight);
    return Math.min(Math.max(0, y), maximumY);
  }

  /** Checks the valid target condition. */
  #isValidTarget(target) {
    return (
      Number.isFinite(target?.y) &&
      Number.isFinite(target?.height) &&
      target.height >= 0
    );
  }

  /** Checks the valid delta time condition. */
  #isValidDeltaTime(deltaTimeSeconds) {
    return Number.isFinite(deltaTimeSeconds) && deltaTimeSeconds > 0;
  }

  /** Validates config. */
  #validateConfig(config) {
    const hasValidWorld = Number.isFinite(config?.world?.height) &&
      Number.isFinite(config?.canvas?.height) &&
      config.world.height > 0 &&
      config.canvas.height > 0;
    if (!hasValidWorld || !this.#hasValidCameraConfig(config.camera, config.canvas.height)) {
      throw new TypeError("Die Kamera-Konfiguration ist ungültig.");
    }
  }

  /** Checks the valid camera config condition. */
  #hasValidCameraConfig(camera, viewportHeight) {
    const hasValidDeadZone = Number.isFinite(camera?.deadZoneTopPixels) &&
      Number.isFinite(camera?.deadZoneBottomPixels) &&
      camera.deadZoneTopPixels >= 0 &&
      camera.deadZoneTopPixels < camera.deadZoneBottomPixels &&
      camera.deadZoneBottomPixels <= viewportHeight;
    const hasValidSpeeds = Number.isFinite(camera?.upwardFollowSpeedPixelsPerSecond) &&
      Number.isFinite(camera?.downwardFollowSpeedPixelsPerSecond) &&
      camera.upwardFollowSpeedPixelsPerSecond > 0 &&
      camera.downwardFollowSpeedPixelsPerSecond > 0;
    return hasValidDeadZone && hasValidSpeeds;
  }
}
