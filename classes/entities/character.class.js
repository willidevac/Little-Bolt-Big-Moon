import { MovableObject } from "../base/movable-object.class.js";
import { getAssetPath } from "../../js/config/asset-paths.js";
import { clamp } from "../../js/utils/math.js";

const BYTE_SPRITE_CONFIG = Object.freeze({
  source: getAssetPath("characters", "byte.png"),
  frameWidth: 32,
  frameHeight: 32,
  frameCount: 33,
});
const BYTE_RENDER_SCALE = 2;
const NEUTRAL_INPUT = Object.freeze({ left: false, right: false, jump: false });

/**
 * Spielbarer Hauptcharakter Byte.
 */
export class Character extends MovableObject {
  constructor() {
    super();
    this.width = BYTE_SPRITE_CONFIG.frameWidth * BYTE_RENDER_SCALE;
    this.height = BYTE_SPRITE_CONFIG.frameHeight * BYTE_RENDER_SCALE;
    this.coyoteTimeRemaining = 0;
    this.jumpBufferRemaining = 0;
    this.wasJumpPressed = false;
    this.loadSprite(BYTE_SPRITE_CONFIG);
  }

  /**
   * Übersetzt Eingaben in Bewegung und führt danach die gemeinsame Physik aus.
   * @param {number} deltaTimeSeconds
   * @param {import("../core/world.class.js").World} world
   */
  update(deltaTimeSeconds, world) {
    if (!this.#isValidDeltaTime(deltaTimeSeconds)) return;
    const input = world.input ?? NEUTRAL_INPUT;
    const config = world.config.character;
    const jumpStarted = this.#consumeJumpPress(input);
    this.#updateJumpTimers(deltaTimeSeconds, jumpStarted, config);
    this.#applyHorizontalMovement(deltaTimeSeconds, input, config);
    this.#tryBufferedJump(config);
    this.#shortenReleasedJump(input, jumpStarted, config);
    super.update(deltaTimeSeconds, world);
    this.#keepInsideWorld(world.config.world.width);
    this.wasJumpPressed = input.jump;
  }

  #applyHorizontalMovement(deltaTimeSeconds, input, config) {
    const direction = Number(input.right) - Number(input.left);
    if (direction === 0) {
      this.#applyHorizontalBraking(deltaTimeSeconds, config);
      return;
    }
    const acceleration = config.horizontalAccelerationPixelsPerSecondSquared;
    const maximumSpeed = config.maximumHorizontalSpeedPixelsPerSecond;
    this.velocityX = clamp(
      this.velocityX + direction * acceleration * deltaTimeSeconds,
      -maximumSpeed,
      maximumSpeed,
    );
  }

  #applyHorizontalBraking(deltaTimeSeconds, config) {
    const braking = config.horizontalBrakingPixelsPerSecondSquared * deltaTimeSeconds;
    if (Math.abs(this.velocityX) <= braking) {
      this.velocityX = 0;
      return;
    }
    this.velocityX -= Math.sign(this.velocityX) * braking;
  }

  #updateJumpTimers(deltaTimeSeconds, jumpStarted, config) {
    this.coyoteTimeRemaining = this.isOnGround
      ? config.coyoteTimeSeconds
      : Math.max(0, this.coyoteTimeRemaining - deltaTimeSeconds);
    this.jumpBufferRemaining = jumpStarted
      ? config.jumpBufferSeconds
      : Math.max(0, this.jumpBufferRemaining - deltaTimeSeconds);
  }

  #consumeJumpPress(input) {
    if (typeof input.consumePress === "function") return input.consumePress("jump");
    return input.jump && !this.wasJumpPressed;
  }

  #tryBufferedJump(config) {
    if (this.coyoteTimeRemaining <= 0 || this.jumpBufferRemaining <= 0) return;
    this.velocityY = -config.jumpSpeedPixelsPerSecond;
    this.setOnGround(false);
    this.coyoteTimeRemaining = 0;
    this.jumpBufferRemaining = 0;
  }

  #shortenReleasedJump(input, jumpStarted, config) {
    const wasReleased = this.wasJumpPressed && !input.jump;
    const wasQuickTap = jumpStarted && !input.jump;
    if (!wasReleased && !wasQuickTap) return;
    const releaseSpeed = config.jumpReleaseSpeedPixelsPerSecond;
    if (this.velocityY < -releaseSpeed) this.velocityY = -releaseSpeed;
  }

  #keepInsideWorld(worldWidth) {
    const previousX = this.x;
    this.x = clamp(this.x, 0, worldWidth - this.width);
    if (this.x !== previousX) this.velocityX = 0;
  }

  #isValidDeltaTime(deltaTimeSeconds) {
    return Number.isFinite(deltaTimeSeconds) && deltaTimeSeconds > 0;
  }
}
