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
const ACTIVITY_ACTIONS = Object.freeze([
  "left",
  "right",
  "jump",
  "attack",
  "weaponSwitch",
]);

export const CHARACTER_STATES = Object.freeze({
  IDLE: "idle",
  RUN: "run",
  JUMP: "jump",
  FALL: "fall",
  HURT: "hurt",
  SLEEP: "sleep",
  DEAD: "dead",
});

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
    this.state = CHARACTER_STATES.IDLE;
    this.inactivitySeconds = 0;
    this.facingDirection = 1;
    this.isHurt = false;
    this.isDead = false;
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
    if (this.isDead) return this.#maintainDeadState();
    const config = world.config.character;
    const jumpStarted = this.#consumeJumpPress(input);
    this.#updateInactivity(deltaTimeSeconds, input, config);
    if (!this.isHurt) this.#handleControls(deltaTimeSeconds, input, jumpStarted, config);
    super.update(deltaTimeSeconds, world);
    this.#keepInsideWorld(world.config.world.width);
    this.#changeState(this.#resolveState(config));
    this.wasJumpPressed = input.jump;
  }

  /**
   * Sperrt normale Steuerung, bis der spätere Kampfcode den Treffer beendet.
   * @returns {boolean} Ob der Trefferzustand neu begonnen hat.
   */
  enterHurtState() {
    if (this.isDead || this.isHurt) return false;
    this.isHurt = true;
    this.inactivitySeconds = 0;
    this.coyoteTimeRemaining = 0;
    this.jumpBufferRemaining = 0;
    this.velocityX = 0;
    this.#changeState(CHARACTER_STATES.HURT);
    return true;
  }

  /**
   * Gibt Byte nach einem Treffer wieder für normale Zustände frei.
   * @returns {boolean} Ob der Trefferzustand beendet wurde.
   */
  leaveHurtState() {
    if (!this.isHurt || this.isDead) return false;
    this.isHurt = false;
    return true;
  }

  /**
   * Schaltet Byte dauerhaft aus und stoppt seine Bewegung.
   * @returns {boolean} Ob Byte neu ausgeschaltet wurde.
   */
  die() {
    if (this.isDead) return false;
    this.isDead = true;
    this.isHurt = false;
    this.isAffectedByGravity = false;
    this.#stopMovement();
    this.#changeState(CHARACTER_STATES.DEAD);
    return true;
  }

  #handleControls(deltaTimeSeconds, input, jumpStarted, config) {
    this.#updateJumpTimers(deltaTimeSeconds, jumpStarted, config);
    this.#applyHorizontalMovement(deltaTimeSeconds, input, config);
    this.#tryBufferedJump(config);
    this.#shortenReleasedJump(input, jumpStarted, config);
  }

  #applyHorizontalMovement(deltaTimeSeconds, input, config) {
    const direction = Number(input.right) - Number(input.left);
    if (direction === 0) return this.#applyHorizontalBraking(deltaTimeSeconds, config);
    this.facingDirection = direction;
    this.#accelerateHorizontally(deltaTimeSeconds, direction, config);
  }

  #accelerateHorizontally(deltaTimeSeconds, direction, config) {
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

  #updateInactivity(deltaTimeSeconds, input, config) {
    if (this.#hasActivity(input, config)) {
      this.inactivitySeconds = 0;
      return;
    }
    this.inactivitySeconds += deltaTimeSeconds;
  }

  #hasActivity(input, config) {
    const hasInput = ACTIVITY_ACTIONS.some((action) => Boolean(input[action]));
    const threshold = config.movementStateThresholdPixelsPerSecond;
    const isMoving = Math.abs(this.velocityX) > threshold || !this.isOnGround;
    return hasInput || isMoving || this.isHurt;
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

  #resolveState(config) {
    const threshold = config.movementStateThresholdPixelsPerSecond;
    if (this.isDead) return CHARACTER_STATES.DEAD;
    if (this.isHurt) return CHARACTER_STATES.HURT;
    if (this.velocityY < -threshold) return CHARACTER_STATES.JUMP;
    if (!this.isOnGround || this.velocityY > threshold) return CHARACTER_STATES.FALL;
    if (Math.abs(this.velocityX) > threshold) return CHARACTER_STATES.RUN;
    if (this.inactivitySeconds >= config.sleepAfterInactivitySeconds) {
      return CHARACTER_STATES.SLEEP;
    }
    return CHARACTER_STATES.IDLE;
  }

  #changeState(nextState) {
    if (this.state === nextState) return false;
    this.state = nextState;
    return true;
  }

  #maintainDeadState() {
    this.#stopMovement();
    this.#changeState(CHARACTER_STATES.DEAD);
  }

  #stopMovement() {
    this.velocityX = 0;
    this.velocityY = 0;
    this.accelerationX = 0;
    this.accelerationY = 0;
  }

  #isValidDeltaTime(deltaTimeSeconds) {
    return Number.isFinite(deltaTimeSeconds) && deltaTimeSeconds > 0;
  }
}
