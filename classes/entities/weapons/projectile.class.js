import { MovableObject } from "../../base/movable-object.class.js";

const LIFETIME_EPSILON_SECONDS = 1e-9;

/**
 * Shared movement, animation, and swept-path checks for all projectiles.
 */
export class Projectile extends MovableObject {
  /**
   * Creates the configured instance.
   * @param {Readonly<object>} projectileData Projectile event data used to initialize the instance.
   * @param {Readonly<object>} runtimeConfig Runtime projectile configuration.
   * @param {Readonly<object>} visualConfig Visual configuration used for rendering.
   */
  constructor(projectileData, runtimeConfig, visualConfig) {
    super();
    this.#validateInputs(projectileData, runtimeConfig, visualConfig);
    this.#setVisualData(visualConfig);
    this.#setRuntimeData(projectileData, runtimeConfig);
    this.#setStartPosition(projectileData.origin, visualConfig.originOffsetY);
    this.loadSprite(visualConfig.sprite);
    this.setFrameIndex(visualConfig.animationStartFrame);
  }

  /**
   * Moves and animates the projectile independently of the frame rate.
   * @param {number} deltaTimeSeconds Elapsed time since the previous frame, in seconds.
   * @param {import("../../core/world.class.js").World} world Active world providing runtime state and entities.
   */
  update(deltaTimeSeconds, world) {
    if (this.isExpired || !this.#isValidDeltaTime(deltaTimeSeconds)) return;
    this.previousX = this.x;
    this.previousY = this.y;
    super.update(deltaTimeSeconds, world);
    this.#updateLifetime(deltaTimeSeconds);
    this.#updateAnimation(deltaTimeSeconds);
    if (this.#isOutsideWorld(world.config.world)) this.expire();
  }

  /**
   * Mirrors a projectile that is flying to the left.
   * @param {CanvasRenderingContext2D} context Canvas context used for rendering.
   */
  draw(context) {
    if (this.velocityX >= 0) return super.draw(context);
    context.save();
    context.translate(this.x + this.width, this.y);
    context.scale(-1, 1);
    this.drawCurrentFrame(context, 0, 0, this.width, this.height);
    context.restore();
  }

  /**
   * Returns the complete swept path since the previous frame.
   * @returns {Readonly<{x:number,y:number,width:number,height:number}>}
   */
  getTravelBounds() {
    const current = this.getCollisionBounds();
    const previous = this.#getPreviousBounds(current);
    const x = Math.min(previous.x, current.x);
    const y = Math.min(previous.y, current.y);
    return Object.freeze({
      x,
      y,
      width: Math.max(previous.x + previous.width, current.x + current.width) - x,
      height: Math.max(previous.y + previous.height, current.y + current.height) - y,
    });
  }

  /**
   * Creates an immutable hit payload.
   * @returns {Readonly<{amount:number,direction:number,source:string}>}
   */
  createHit() {
    return Object.freeze({
      amount: this.damage,
      direction: Math.sign(this.velocityX) || 1,
      source: this.source,
    });
  }

  /**
   * Marks the projectile for removal exactly once.
   * @returns {boolean}
   */
  expire() {
    if (this.isExpired) return false;
    this.isExpired = true;
    return true;
  }

  /**
   * Applies visual data.
   * @param {Readonly<object>} config Configuration values used by the operation.
   */
  #setVisualData(config) {
    this.width = config.sprite.frameWidth * config.renderScale;
    this.height = config.sprite.frameHeight * config.renderScale;
    this.setCollisionBox(config.collisionBox);
    this.animationStartFrame = config.animationStartFrame;
    this.animationFrameCount = config.animationFrameCount;
  }

  /**
   * Applies runtime data.
   * @param {Readonly<object>} data Source data used to configure the instance.
   * @param {Readonly<object>} config Configuration values used by the operation.
   */
  #setRuntimeData(data, config) {
    const direction = this.#normalizeDirection(data.direction);
    this.team = data.team;
    this.source = data.source;
    this.damage = data.damage;
    this.velocityX = direction.x * config.speedPixelsPerSecond;
    this.velocityY = direction.y * config.speedPixelsPerSecond;
    this.isAffectedByGravity = false;
    this.lifetimeSecondsRemaining = config.lifetimeSeconds;
    this.worldPaddingPixels = config.worldPaddingPixels;
    this.animationFrameDurationSeconds = config.animationFrameDurationSeconds;
    this.animationSeconds = 0;
    this.isExpired = false;
  }

  /**
   * Applies start position.
   * @param {Readonly<object>} origin World-space origin used by the operation.
   * @param {number} originOffsetY Origin offset y supplied to set start position.
   */
  #setStartPosition(origin, originOffsetY) {
    this.x = this.velocityX >= 0 ? origin.x : origin.x - this.width;
    this.y = origin.y - this.height * originOffsetY;
    this.previousX = this.x;
    this.previousY = this.y;
  }

  /**
   * Updates animation.
   * @param {number} deltaTimeSeconds Elapsed time since the previous frame, in seconds.
   */
  #updateAnimation(deltaTimeSeconds) {
    this.animationSeconds += deltaTimeSeconds;
    const offset = Math.floor(
      this.animationSeconds / this.animationFrameDurationSeconds,
    ) % this.animationFrameCount;
    this.setFrameIndex(this.animationStartFrame + offset);
  }

  /**
   * Updates lifetime.
   * @param {number} deltaTimeSeconds Elapsed time since the previous frame, in seconds.
   */
  #updateLifetime(deltaTimeSeconds) {
    const hasElapsed = deltaTimeSeconds + LIFETIME_EPSILON_SECONDS >=
      this.lifetimeSecondsRemaining;
    this.lifetimeSecondsRemaining = hasElapsed
      ? 0
      : this.lifetimeSecondsRemaining - deltaTimeSeconds;
  }

  /**
   * Checks the outside world condition.
   * @param {Readonly<object>} worldConfig World boundaries used by the operation.
   */
  #isOutsideWorld(worldConfig) {
    if (this.lifetimeSecondsRemaining <= 0) return true;
    const padding = this.worldPaddingPixels;
    const outsideX = this.x + this.width < -padding ||
      this.x > worldConfig.width + padding;
    const outsideY = this.y + this.height < -padding ||
      this.y > worldConfig.height + padding;
    return outsideX || outsideY;
  }

  /**
   * Returns previous bounds.
   * @param {number} current Current supplied to get previous bounds.
   */
  #getPreviousBounds(current) {
    return {
      x: this.previousX + (current.x - this.x),
      y: this.previousY + (current.y - this.y),
      width: current.width,
      height: current.height,
    };
  }

  /**
   * Performs the normalize direction operation.
   * @param {string} direction Direction applied to the movement or impact.
   */
  #normalizeDirection(direction) {
    const length = Math.hypot(direction.x, direction.y);
    return Object.freeze({
      x: direction.x / length,
      y: direction.y / length,
    });
  }

  /**
   * Validates inputs.
   * @param {Readonly<object>} data Source data used to configure the instance.
   * @param {Readonly<object>} runtime Runtime supplied to validate inputs.
   * @param {Readonly<object>} visual Visual supplied to validate inputs.
   */
  #validateInputs(data, runtime, visual) {
    const dataNumbers = [data?.damage, data?.origin?.x, data?.origin?.y,
      data?.direction?.x, data?.direction?.y];
    const runtimeNumbers = [runtime?.speedPixelsPerSecond, runtime?.lifetimeSeconds,
      runtime?.worldPaddingPixels, runtime?.animationFrameDurationSeconds];
    const hasData = ["player", "enemy"].includes(data?.team) &&
      typeof data?.source === "string" && data.source.length > 0 &&
      dataNumbers.every(Number.isFinite) &&
      data.damage > 0 &&
      Math.hypot(data.direction.x, data.direction.y) > 0;
    if (hasData && this.#hasValidRuntime(runtimeNumbers) &&
      this.#hasValidVisual(visual)) return;
    throw new TypeError("Die Projektilkonfiguration ist unvollständig.");
  }

  /**
   * Checks the valid runtime condition.
   * @param {ReadonlyArray<number>} values Values supplied to has valid runtime.
   */
  #hasValidRuntime(values) {
    return values.every((value) => Number.isFinite(value) && value > 0);
  }

  /**
   * Checks the valid visual condition.
   * @param {Readonly<object>} config Configuration values used by the operation.
   */
  #hasValidVisual(config) {
    const values = [config?.renderScale, config?.originOffsetY,
      config?.animationStartFrame, config?.animationFrameCount];
    const hasValues = values.every(Number.isFinite) &&
      config.renderScale > 0 &&
      config.originOffsetY >= 0 && config.originOffsetY <= 1 &&
      Number.isInteger(config.animationStartFrame) &&
      config.animationStartFrame >= 0 &&
      Number.isInteger(config.animationFrameCount) &&
      config.animationFrameCount > 0 &&
      config.animationStartFrame + config.animationFrameCount <=
        config.sprite?.frameCount;
    return hasValues && config?.sprite && config?.collisionBox;
  }

  /**
   * Checks the valid delta time condition.
   * @param {number} deltaTimeSeconds Elapsed time since the previous frame, in seconds.
   */
  #isValidDeltaTime(deltaTimeSeconds) {
    return Number.isFinite(deltaTimeSeconds) && deltaTimeSeconds > 0;
  }
}
