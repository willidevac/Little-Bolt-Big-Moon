/**
 * Translates world coordinates into the vertical canvas view.
 */
export class Camera {
  /**
   * @param {Readonly<object>} config
   * @param {Readonly<{minimumY?:number,maximumY?:number,
   * deadZoneTopPixels?:number,deadZoneBottomPixels?:number}>} [bounds]
   */
  constructor(config, bounds = {}) {
    const cameraConfig = Object.freeze({ ...config?.camera, ...bounds });
    this.#validateConfig(config, cameraConfig);
    const cameraBounds = this.#createBounds(config, bounds);
    this.#assignState(config, cameraConfig, cameraBounds);
  }

  /** Assigns validated camera state. */
  #assignState(config, camera, bounds) {
    Object.assign(this, {
      x: 0, y: 0, viewportHeight: config.canvas.height,
      minimumY: bounds.minimumY, maximumY: bounds.maximumY,
      deadZoneTop: camera.deadZoneTopPixels,
      deadZoneBottom: camera.deadZoneBottomPixels,
      upwardFollowSpeed: camera.upwardFollowSpeedPixelsPerSecond,
      downwardFollowSpeed: camera.downwardFollowSpeedPixelsPerSecond,
      followSpeedMultiplier: 1,
    });
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
    return Math.min(Math.max(this.minimumY, y), this.maximumY);
  }

  /** Creates validated level-specific camera limits. */
  #createBounds(config, bounds) {
    const minimumY = bounds.minimumY ?? 0;
    const fallbackMaximum = Math.max(0, config.world.height - config.canvas.height);
    const maximumY = bounds.maximumY ?? fallbackMaximum;
    if (![minimumY, maximumY].every(Number.isFinite) || minimumY > maximumY) {
      throw new RangeError("Die Kameragrenzen sind ungültig.");
    }
    return Object.freeze({ minimumY, maximumY });
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
  #validateConfig(config, camera) {
    const hasValidWorld = Number.isFinite(config?.world?.height) &&
      Number.isFinite(config?.canvas?.height) &&
      config.world.height > 0 &&
      config.canvas.height > 0;
    if (!hasValidWorld || !this.#hasValidCameraConfig(camera, config.canvas.height)) {
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
