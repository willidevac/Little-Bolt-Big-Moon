import { DrawableObject } from "./drawable-object.class.js";

/**
 * Foundation for objects with velocity and movement.
 */
export class MovableObject extends DrawableObject {
  /** Creates a stationary object with gravity enabled. */
  constructor() {
    super();
    this.velocityX = 0;
    this.velocityY = 0;
    this.accelerationX = 0;
    this.accelerationY = 0;
    this.isOnGround = false;
    this.groundPlatform = null;
    this.isAffectedByGravity = true;
  }

  /**
   * Updates movement over time using the central physics values.
   * @param {number} deltaTimeSeconds Elapsed simulation time in seconds.
   * @param {import("../core/world.class.js").World} world World providing physics values.
   */
  update(deltaTimeSeconds, world) {
    if (!this.#isValidDeltaTime(deltaTimeSeconds)) return;
    const physicsConfig = world.config.physics;
    this.#applyAcceleration(deltaTimeSeconds);
    this.#applyGravity(deltaTimeSeconds, physicsConfig);
    this.#limitFallSpeed(physicsConfig);
    this.#applyVelocity(deltaTimeSeconds);
  }

  /**
   * Changes the grounded state and stops an active falling motion.
   * @param {boolean} isOnGround Whether the object has stable ground contact.
   * @param {object|null} [platform=null] Platform supporting the object.
   */
  setOnGround(isOnGround, platform = null) {
    this.isOnGround = Boolean(isOnGround);
    this.groundPlatform = this.isOnGround ? platform : null;
    if (this.isOnGround) this.velocityY = 0;
  }

  /**
   * Applies a controlled upward impulse to the object.
   * @param {number} speedPixelsPerSecond Positive vertical launch speed.
   */
  applyUpwardImpulse(speedPixelsPerSecond) {
    if (!Number.isFinite(speedPixelsPerSecond) || speedPixelsPerSecond <= 0) {
      throw new TypeError("Der Aufwärtsimpuls ist ungültig.");
    }
    this.velocityY = -speedPixelsPerSecond;
    this.setOnGround(false);
  }

  /**
   * Integrates configured acceleration into velocity.
   * @param {number} deltaTimeSeconds Elapsed simulation time in seconds.
   */
  #applyAcceleration(deltaTimeSeconds) {
    this.velocityX += this.accelerationX * deltaTimeSeconds;
    this.velocityY += this.accelerationY * deltaTimeSeconds;
  }

  /**
   * Applies gravity while the object is airborne.
   * @param {number} deltaTimeSeconds Elapsed simulation time in seconds.
   * @param {object} physicsConfig Gravity and fall-speed configuration.
   */
  #applyGravity(deltaTimeSeconds, physicsConfig) {
    if (!this.isAffectedByGravity || this.isOnGround) return;
    this.velocityY += physicsConfig.gravityPixelsPerSecondSquared * deltaTimeSeconds;
  }

  /**
   * Clamps downward velocity to the configured terminal speed.
   * @param {object} physicsConfig Physics values containing terminal speed.
   */
  #limitFallSpeed(physicsConfig) {
    const maximumFallSpeed = physicsConfig.maximumFallSpeedPixelsPerSecond;
    this.velocityY = Math.min(this.velocityY, maximumFallSpeed);
  }

  /**
   * Integrates current velocity into the world position.
   * @param {number} deltaTimeSeconds Elapsed simulation time in seconds.
   */
  #applyVelocity(deltaTimeSeconds) {
    this.x += this.velocityX * deltaTimeSeconds;
    this.y += this.velocityY * deltaTimeSeconds;
  }

  /**
   * Checks whether an elapsed-time value can be simulated safely.
   * @param {number} deltaTimeSeconds Candidate elapsed time in seconds.
   */
  #isValidDeltaTime(deltaTimeSeconds) {
    return Number.isFinite(deltaTimeSeconds) && deltaTimeSeconds > 0;
  }
}
