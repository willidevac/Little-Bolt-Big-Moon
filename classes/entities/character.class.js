import { MovableObject } from "../base/movable-object.class.js";
import { AnimationController } from "../systems/animation-controller.class.js";
import { CharacterAttackState } from "../systems/character-attack-state.class.js";
import { getAssetPath } from "../../js/config/asset-paths.js";
import { clamp } from "../../js/utils/math.js";

const BYTE_SPRITE_CONFIG = Object.freeze({
  source: getAssetPath("characters", "byte.png"),
  frameWidth: 32,
  frameHeight: 32,
  frameCount: 33,
});
const BYTE_RENDER_SCALE = 2;
const BYTE_HURTBOX = Object.freeze({
  offsetX: 12,
  offsetY: 6,
  width: 40,
  height: 58,
});
const BYTE_STOMP_BOX = Object.freeze({
  offsetX: 16,
  offsetY: 50,
  width: 32,
  height: 14,
});
const STATE_TIME_EPSILON_SECONDS = 1e-9;
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
  MELEE: "melee",
  SHOOT: "shoot",
  HURT: "hurt",
  SLEEP: "sleep",
  DEAD: "dead",
});

const createAnimationClip = (startFrame, frameCount, frameDurationSeconds, loop = true) =>
  Object.freeze({ startFrame, frameCount, frameDurationSeconds, loop });

const BYTE_ANIMATION_CLIPS = Object.freeze({
  [CHARACTER_STATES.IDLE]: createAnimationClip(0, 4, 0.18),
  [CHARACTER_STATES.RUN]: createAnimationClip(4, 6, 0.08),
  [CHARACTER_STATES.JUMP]: createAnimationClip(10, 1, 1),
  [CHARACTER_STATES.FALL]: createAnimationClip(11, 1, 1),
  [CHARACTER_STATES.MELEE]: createAnimationClip(14, 4, 0.08, false),
  [CHARACTER_STATES.SHOOT]: createAnimationClip(18, 3, 0.06, false),
  [CHARACTER_STATES.HURT]: createAnimationClip(21, 2, 0.1),
  [CHARACTER_STATES.SLEEP]: createAnimationClip(23, 4, 0.3),
  [CHARACTER_STATES.DEAD]: createAnimationClip(27, 6, 0.14, false),
});

/**
 * Spielbarer Hauptcharakter Byte.
 */
export class Character extends MovableObject {
  constructor() {
    super();
    this.width = BYTE_SPRITE_CONFIG.frameWidth * BYTE_RENDER_SCALE;
    this.height = BYTE_SPRITE_CONFIG.frameHeight * BYTE_RENDER_SCALE;
    this.setCollisionBox(BYTE_HURTBOX);
    this.coyoteTimeRemaining = 0;
    this.jumpBufferRemaining = 0;
    this.wasJumpPressed = false;
    this.state = CHARACTER_STATES.IDLE;
    this.inactivitySeconds = 0;
    this.facingDirection = 1;
    this.isHurt = false;
    this.isDead = false;
    this.hurtSecondsRemaining = 0;
    this.invulnerabilitySecondsRemaining = 0;
    this.attackState = new CharacterAttackState();
    this.animationController = new AnimationController(BYTE_ANIMATION_CLIPS);
    this.loadSprite(BYTE_SPRITE_CONFIG);
    this.setFrameIndex(this.animationController.setState(this.state));
  }

  /**
   * Zeichnet Byte nach links gespiegelt, wenn er nach links schaut.
   * @param {CanvasRenderingContext2D} context
   */
  draw(context) {
    context.save();
    context.globalAlpha = this.#getHitOpacity();
    this.#drawFacingDirection(context);
    context.restore();
  }

  #drawFacingDirection(context) {
    if (this.facingDirection >= 0) {
      super.draw(context);
      return;
    }
    context.save();
    context.translate(this.x + this.width, this.y);
    context.scale(-1, 1);
    this.drawCurrentFrame(context, 0, 0, this.width, this.height);
    context.restore();
  }

  /**
   * Übersetzt Eingaben in Bewegung und führt danach die gemeinsame Physik aus.
   * @param {number} deltaTimeSeconds
   * @param {import("../core/world.class.js").World} world
   */
  update(deltaTimeSeconds, world) {
    if (!this.#isValidDeltaTime(deltaTimeSeconds)) return;
    const input = world.input ?? NEUTRAL_INPUT;
    if (this.isDead) return this.#maintainDeadState(deltaTimeSeconds);
    this.attackState.update(deltaTimeSeconds);
    this.#updateHitTimers(deltaTimeSeconds);
    const config = world.config.character;
    const jumpStarted = this.#consumeJumpPress(input);
    this.#updateInactivity(deltaTimeSeconds, input, config);
    if (!this.isHurt) this.#handleControls(deltaTimeSeconds, input, jumpStarted, config);
    super.update(deltaTimeSeconds, world);
    this.#keepInsideWorld(world.config.world.width);
    this.#changeState(this.#resolveState(config));
    this.#updateAnimation(deltaTimeSeconds);
    this.wasJumpPressed = input.jump;
  }

  /**
   * Sperrt normale Steuerung, bis der spätere Kampfcode den Treffer beendet.
   * @returns {boolean} Ob der Trefferzustand neu begonnen hat.
   */
  enterHurtState() {
    if (this.isDead || this.isHurt) return false;
    this.attackState.clear();
    this.isHurt = true;
    this.inactivitySeconds = 0;
    this.coyoteTimeRemaining = 0;
    this.jumpBufferRemaining = 0;
    this.velocityX = 0;
    this.#changeState(CHARACTER_STATES.HURT);
    return true;
  }

  /**
   * Startet Rückstoß, Trefferanimation und die kurze Schutzzeit.
   * @param {number} direction
   * @param {Readonly<object>} combatConfig
   * @returns {boolean} Ob Byte den Treffer angenommen hat.
   */
  receiveHit(direction, combatConfig) {
    this.#validateHit(direction, combatConfig);
    if (this.isDead || this.isInvulnerable) return false;
    this.enterHurtState();
    this.hurtSecondsRemaining = combatConfig.hurtStateSeconds;
    this.invulnerabilitySecondsRemaining = combatConfig.invulnerabilitySeconds;
    this.velocityX = Math.sign(direction) *
      combatConfig.knockbackHorizontalPixelsPerSecond;
    this.velocityY = -combatConfig.knockbackVerticalPixelsPerSecond;
    this.setOnGround(false);
    return true;
  }

  /**
   * Zeigt, ob Byte gerade keinen weiteren Treffer annehmen darf.
   * @returns {boolean}
   */
  get isInvulnerable() {
    return this.invulnerabilitySecondsRemaining > 0;
  }

  /**
   * Zeigt, ob Byte gerade einen neuen Angriff beginnen darf.
   * @returns {boolean}
   */
  get canAttack() {
    return !this.isDead && !this.isHurt && !this.attackState.isActive;
  }

  /**
   * Startet ausschließlich die zur Waffe passende Animation.
   * @param {"melee"|"shoot"} animationState
   * @param {number} durationSeconds
   * @returns {boolean}
   */
  startAttack(animationState, durationSeconds) {
    if (!this.canAttack) return false;
    const started = this.attackState.start(animationState, durationSeconds);
    if (started) this.#changeState(animationState);
    return started;
  }

  /**
   * Liefert Bytes kleine Fußfläche für Treffer ausschließlich von oben.
   * @returns {Readonly<{x:number, y:number, width:number, height:number}>}
   */
  getStompBounds() {
    return Object.freeze({
      x: this.x + BYTE_STOMP_BOX.offsetX,
      y: this.y + BYTE_STOMP_BOX.offsetY,
      width: BYTE_STOMP_BOX.width,
      height: BYTE_STOMP_BOX.height,
    });
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
    this.attackState.clear();
    this.isDead = true;
    this.isHurt = false;
    this.hurtSecondsRemaining = 0;
    this.invulnerabilitySecondsRemaining = 0;
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
    if (this.attackState.isActive) return this.attackState.animationState;
    if (this.velocityY < -threshold) return CHARACTER_STATES.JUMP;
    if (!this.isOnGround || this.velocityY > threshold) return CHARACTER_STATES.FALL;
    if (Math.abs(this.velocityX) > threshold) return CHARACTER_STATES.RUN;
    if (
      this.inactivitySeconds + STATE_TIME_EPSILON_SECONDS >=
      config.sleepAfterInactivitySeconds
    ) {
      return CHARACTER_STATES.SLEEP;
    }
    return CHARACTER_STATES.IDLE;
  }

  #changeState(nextState) {
    if (this.state === nextState) return false;
    this.state = nextState;
    this.setFrameIndex(this.animationController.setState(nextState));
    return true;
  }

  #updateAnimation(deltaTimeSeconds) {
    const frameIndex = this.animationController.update(this.state, deltaTimeSeconds);
    this.setFrameIndex(frameIndex);
  }

  #maintainDeadState(deltaTimeSeconds) {
    this.#stopMovement();
    this.#changeState(CHARACTER_STATES.DEAD);
    this.#updateAnimation(deltaTimeSeconds);
  }

  #updateHitTimers(deltaTimeSeconds) {
    this.hurtSecondsRemaining = Math.max(
      0,
      this.hurtSecondsRemaining - deltaTimeSeconds,
    );
    this.invulnerabilitySecondsRemaining = Math.max(
      0,
      this.invulnerabilitySecondsRemaining - deltaTimeSeconds,
    );
    if (this.hurtSecondsRemaining === 0) this.leaveHurtState();
  }

  #getHitOpacity() {
    if (!this.isInvulnerable || this.isDead) return 1;
    const blinkFrame = Math.floor(this.invulnerabilitySecondsRemaining * 12);
    return blinkFrame % 2 === 0 ? 0.35 : 1;
  }

  #validateHit(direction, config) {
    const hasDirection = Number.isFinite(direction) && Math.sign(direction) !== 0;
    const values = [
      config?.hurtStateSeconds,
      config?.invulnerabilitySeconds,
      config?.knockbackHorizontalPixelsPerSecond,
      config?.knockbackVerticalPixelsPerSecond,
    ];
    const hasValues = values.every((value) => Number.isFinite(value) && value > 0);
    if (hasDirection && hasValues) return;
    throw new TypeError("Die Trefferreaktion ist ungültig.");
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
