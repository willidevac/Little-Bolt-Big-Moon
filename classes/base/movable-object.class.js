import { DrawableObject } from "./drawable-object.class.js";

/**
 * Grundlage für Objekte mit Geschwindigkeit und Bewegung.
 */
export class MovableObject extends DrawableObject {
  constructor() {
    super();
    this.velocityX = 0;
    this.velocityY = 0;
    this.accelerationX = 0;
    this.accelerationY = 0;
    this.isOnGround = false;
    this.isAffectedByGravity = true;
  }

  /**
   * Aktualisiert die Bewegung zeitbasiert mit den zentralen Physikwerten.
   * @param {number} deltaTimeSeconds
   * @param {import("../core/world.class.js").World} world
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
   * Ändert den Bodenstatus und stoppt eine laufende Fallbewegung.
   * @param {boolean} isOnGround
   */
  setOnGround(isOnGround) {
    this.isOnGround = Boolean(isOnGround);
    if (this.isOnGround) this.velocityY = 0;
  }

  /**
   * Gibt dem Objekt einen kontrollierten Impuls nach oben.
   * @param {number} speedPixelsPerSecond
   */
  applyUpwardImpulse(speedPixelsPerSecond) {
    if (!Number.isFinite(speedPixelsPerSecond) || speedPixelsPerSecond <= 0) {
      throw new TypeError("Der Aufwärtsimpuls ist ungültig.");
    }
    this.velocityY = -speedPixelsPerSecond;
    this.setOnGround(false);
  }

  #applyAcceleration(deltaTimeSeconds) {
    this.velocityX += this.accelerationX * deltaTimeSeconds;
    this.velocityY += this.accelerationY * deltaTimeSeconds;
  }

  #applyGravity(deltaTimeSeconds, physicsConfig) {
    if (!this.isAffectedByGravity || this.isOnGround) return;
    this.velocityY += physicsConfig.gravityPixelsPerSecondSquared * deltaTimeSeconds;
  }

  #limitFallSpeed(physicsConfig) {
    const maximumFallSpeed = physicsConfig.maximumFallSpeedPixelsPerSecond;
    this.velocityY = Math.min(this.velocityY, maximumFallSpeed);
  }

  #applyVelocity(deltaTimeSeconds) {
    this.x += this.velocityX * deltaTimeSeconds;
    this.y += this.velocityY * deltaTimeSeconds;
  }

  #isValidDeltaTime(deltaTimeSeconds) {
    return Number.isFinite(deltaTimeSeconds) && deltaTimeSeconds > 0;
  }
}
