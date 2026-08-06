import { MovableObject } from "../base/movable-object.class.js";
import { AnimationController } from "../systems/animation-controller.class.js";
import { CharacterAttackState } from "../systems/character-attack-state.class.js";
import { CharacterHitState } from "../systems/character-hit-state.class.js";
import { CharacterMovementController } from
  "../systems/character-movement-controller.class.js";
import { PrecisionJumpController } from "../systems/precision-jump-controller.class.js";
import {
  BYTE_ANIMATION_CLIPS,
  BYTE_CONTRAST_SHADOW,
  BYTE_HURTBOX,
  BYTE_RENDER_SCALE,
  BYTE_SPRITE_CONFIG,
  BYTE_STOMP_BOX,
  CHARACTER_STATES,
} from "../../js/config/character-visual-config.js";
import { resolveCharacterState } from "../../js/utils/character-state.js";

const NEUTRAL_INPUT = Object.freeze({ left: false, right: false, jump: false });
const ACTIVITY_ACTIONS = Object.freeze(
  ["left", "right", "jump", "attack", "weaponSwitch"],
);

export { CHARACTER_STATES } from "../../js/config/character-visual-config.js";

/**
 * Playable main character Byte.
 */
export class Character extends MovableObject {
  #hitState;
  #movementController;

  /** Creates Byte in his neutral starting state. */
  constructor() {
    super();
    this.width = BYTE_SPRITE_CONFIG.frameWidth * BYTE_RENDER_SCALE;
    this.height = BYTE_SPRITE_CONFIG.frameHeight * BYTE_RENDER_SCALE;
    this.setCollisionBox(BYTE_HURTBOX);
    this.#initializeState();
    this.#initializeControllers();
    this.loadSprite(BYTE_SPRITE_CONFIG);
    this.setFrameIndex(this.animationController.setState(this.state));
  }

  /** Initializes state. */
  #initializeState() {
    this.jumpChargePercent = 0;
    this.state = CHARACTER_STATES.IDLE;
    this.inactivitySeconds = 0;
    this.facingDirection = 1;
    this.wallImpactCount = 0;
    this.wallReboundControlSeconds = 0;
    this.wallReboundInput = Object.seal({
      left: false, right: false, jump: false, down: false,
    });
  }

  /** Initializes controllers. */
  #initializeControllers() {
    this.jumpController = new PrecisionJumpController();
    this.attackState = new CharacterAttackState();
    this.#hitState = new CharacterHitState();
    this.#movementController = new CharacterMovementController(this);
    this.animationController = new AnimationController(BYTE_ANIMATION_CLIPS);
  }

  /** @returns {boolean} Whether Byte is hurt. */
  get isHurt() { return this.#hitState.isHurt; }

  /** @returns {boolean} Whether Byte is disabled. */
  get isDead() { return this.#hitState.isDead; }

  /** @returns {number} Remaining hurt duration. */
  get hurtSecondsRemaining() { return this.#hitState.hurtSecondsRemaining; }

  /** @returns {number} Remaining invulnerability duration. */
  get invulnerabilitySecondsRemaining() {
    return this.#hitState.invulnerabilitySecondsRemaining;
  }

  /** @returns {boolean} Whether Byte is currently charging a jump. */
  get isChargingJump() { return this.jumpController.isCharging; }

  /**
   * Draws Byte mirrored when he is facing left.
   * @param {CanvasRenderingContext2D} context Canvas context used for rendering.
   */
  draw(context) {
    context.save();
    context.globalAlpha = this.#getHitOpacity();
    this.#applyContrastShadow(context);
    this.#drawFacingDirection(context);
    context.restore();
  }

  /**
   * Adds a stable dark silhouette against every biome background.
   * @param {CanvasRenderingContext2D} context Canvas context used for rendering.
   */
  #applyContrastShadow(context) {
    context.shadowColor = BYTE_CONTRAST_SHADOW.color;
    context.shadowBlur = BYTE_CONTRAST_SHADOW.blurPixels;
    context.shadowOffsetX = BYTE_CONTRAST_SHADOW.offsetXPixels;
    context.shadowOffsetY = BYTE_CONTRAST_SHADOW.offsetYPixels;
  }

  /**
   * Draws facing direction.
   * @param {CanvasRenderingContext2D} context Canvas context used for rendering.
   */
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
   * Translates input into movement and then applies the shared physics.
   * @param {number} deltaTimeSeconds Elapsed time since the previous frame, in seconds.
   * @param {import("../core/world.class.js").World} world Active world providing runtime state and entities.
   */
  update(deltaTimeSeconds, world) {
    if (!this.#isValidDeltaTime(deltaTimeSeconds)) return;
    const input = world.input ?? NEUTRAL_INPUT;
    if (this.isDead) return this.#maintainDeadState(deltaTimeSeconds);
    this.#updateStateTimers(deltaTimeSeconds);
    const config = world.config.character;
    this.#updateInactivity(deltaTimeSeconds, input, config);
    if (!this.isHurt) this.#handleControls(deltaTimeSeconds, input, config);
    this.#updateJumpCharge(config);
    super.update(deltaTimeSeconds, world);
    this.#movementController.keepInsideWorld(world.config.world.width, config);
    this.#changeState(resolveCharacterState(this, config, CHARACTER_STATES));
    this.#updateAnimation(deltaTimeSeconds);
  }

  /**
   * Updates state timers.
   * @param {number} deltaTimeSeconds Elapsed time since the previous frame, in seconds.
   */
  #updateStateTimers(deltaTimeSeconds) {
    this.attackState.update(deltaTimeSeconds);
    this.#hitState.update(deltaTimeSeconds);
    this.wallReboundControlSeconds = Math.max(
      0, this.wallReboundControlSeconds - deltaTimeSeconds,
    );
  }

  /**
   * Locks normal controls until the combat code finishes the hit reaction.
   * @returns {boolean} Whether the hit state started anew.
   */
  enterHurtState() {
    if (!this.#hitState.enterHurt()) return false;
    this.#prepareHurtState();
    return true;
  }

  /**
   * Starts knockback, the hurt animation, and brief invulnerability.
   * @param {number} direction Direction applied to the movement or impact.
   * @param {Readonly<object>} combatConfig Combat configuration used to resolve the action.
   * @returns {boolean} Whether Byte accepted the hit.
   */
  receiveHit(direction, combatConfig) {
    this.#validateKnockback(direction, combatConfig);
    const accepted = this.#hitState.receiveHit(
      combatConfig.hurtStateSeconds,
      combatConfig.invulnerabilitySeconds,
    );
    if (!accepted) return false;
    this.#prepareHurtState();
    this.#applyKnockback(direction, combatConfig);
    return true;
  }

  /**
   * Indicates whether Byte is currently unable to accept another hit.
   * @returns {boolean}
   */
  get isInvulnerable() {
    return this.#hitState.isInvulnerable;
  }

  /**
   * Runs set invulnerability with validated inputs.
   * @param {number} seconds Finite or permanent invulnerability duration.
   */
  setInvulnerability(seconds) {
    this.#hitState.setInvulnerability(seconds);
  }

  /**
   * Indicates whether Byte may currently begin a new attack.
   * @returns {boolean}
   */
  get canAttack() {
    return !this.isDead && !this.isHurt && !this.attackState.isActive;
  }

  /**
   * Starts only the animation associated with the weapon.
   * @param {"melee"|"shoot"} animationState Animation state activated for the action.
   * @param {number} durationSeconds Duration of the action, in seconds.
   * @returns {boolean}
   */
  startAttack(animationState, durationSeconds) {
    if (!this.canAttack) return false;
    const started = this.attackState.start(animationState, durationSeconds);
    if (started) this.#changeState(animationState);
    return started;
  }

  /**
   * Returns Byte's small foot area used exclusively for hits from above.
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
   * Reflects a collision with a solid environment wall.
   * @param {string} direction Direction applied to the movement or impact.
   * @param {Readonly<object>} config Configuration values used by the operation.
   */
  handleWallImpact(direction, config) {
    this.#movementController.reflectWallImpact(direction, config);
  }

  /**
   * Starts one player-controlled rebound from a shaft's inner wall face.
   * @param {Readonly<object>} rebound Controlled rebound values applied to the character.
   */
  beginControlledWallRebound(rebound) {
    this.#validateControlledRebound(rebound);
    const verticalRatio = this.#getReboundVerticalRatio(rebound);
    this.velocityX = rebound.direction * rebound.horizontalSpeedPixelsPerSecond;
    this.facingDirection = rebound.direction;
    this.wallReboundControlSeconds = rebound.controlSeconds;
    this.applyUpwardImpulse(rebound.verticalSpeedPixelsPerSecond * verticalRatio);
  }

  /**
   * Validates controlled rebound.
   * @param {Readonly<object>} rebound Controlled rebound values applied to the character.
   */
  #validateControlledRebound(rebound) {
    const values = [
      rebound?.horizontalSpeedPixelsPerSecond,
      rebound?.verticalSpeedPixelsPerSecond,
      rebound?.controlSeconds,
      rebound?.releasedVerticalRatio,
      rebound?.dropVerticalRatio,
    ];
    if (![-1, 1].includes(rebound?.direction) ||
      !values.every((value) => Number.isFinite(value) && value > 0)) {
      throw new TypeError("Der steuerbare Wandabprall ist ungültig.");
    }
  }

  /**
   * Returns rebound vertical ratio.
   * @param {Readonly<object>} rebound Controlled rebound values applied to the character.
   */
  #getReboundVerticalRatio(rebound) {
    return rebound.forceFullVertical
      ? 1
      : this.wallReboundInput.down
        ? rebound.dropVerticalRatio
        : this.wallReboundInput.jump ? 1 : rebound.releasedVerticalRatio;
  }

  /**
   * Extends coyote time and the jump buffer for the current run.
   * @param {number} amountSeconds Duration added to the current control window, in seconds.
   */
  increaseJumpControl(amountSeconds) {
    if (!Number.isFinite(amountSeconds) || amountSeconds <= 0) {
      throw new TypeError("Die zusätzliche Sprungkontrolle ist ungültig.");
    }
    this.jumpController.increaseControl(amountSeconds);
  }

  /**
   * Releases Byte back to normal states after a hit.
   * @returns {boolean} Whether the hit state ended.
   */
  leaveHurtState() {
    return this.#hitState.leaveHurt();
  }

  /**
   * Permanently disables Byte and stops his movement.
   * @returns {boolean} Whether Byte was newly disabled.
   */
  die() {
    if (!this.#hitState.die()) return false;
    this.attackState.clear();
    this.isAffectedByGravity = false;
    this.#stopMovement();
    this.#changeState(CHARACTER_STATES.DEAD);
    return true;
  }

  /**
   * Handles controls.
   * @param {number} deltaTimeSeconds Elapsed time since the previous frame, in seconds.
   * @param {Readonly<object>} input Current input source used by the simulation.
   * @param {Readonly<object>} config Configuration values used by the operation.
   */
  #handleControls(deltaTimeSeconds, input, config) {
    this.#syncWallReboundInput(input);
    this.#updateWallReboundControl(deltaTimeSeconds, input, config);
    if (this.isOnGround) this.#movementController.updateFacingDirection(input);
    const launch = this.jumpController.update(
      deltaTimeSeconds, input, this.isOnGround, config,
    );
    if (launch) return this.#launch(launch);
    if (this.jumpController.isCharging) return this.#stopGroundMovement();
    if (this.isOnGround) {
      this.#movementController.updateGroundMovement(deltaTimeSeconds, input, config);
    }
  }

  /**
   * Updates wall rebound control.
   * @param {number} deltaTimeSeconds Elapsed time since the previous frame, in seconds.
   * @param {Readonly<object>} input Current input source used by the simulation.
   * @param {Readonly<object>} config Configuration values used by the operation.
   */
  #updateWallReboundControl(deltaTimeSeconds, input, config) {
    if (this.isOnGround || this.wallReboundControlSeconds <= 0) return;
    this.#movementController.updateWallReboundControl(
      deltaTimeSeconds, input, config,
    );
  }

  /**
   * Collects wall rebound input.
   * @param {Readonly<object>} input Current input source used by the simulation.
   */
  #syncWallReboundInput(input) {
    this.wallReboundInput.left = Boolean(input.left);
    this.wallReboundInput.right = Boolean(input.right);
    this.wallReboundInput.jump = Boolean(input.jump);
    this.wallReboundInput.down = Boolean(input.down);
    if (this.isOnGround) this.wallReboundControlSeconds = 0;
  }

  /** Initializes hurt state. */
  #prepareHurtState() {
    this.attackState.clear();
    this.inactivitySeconds = 0;
    this.jumpController.reset();
    this.velocityX = 0;
    this.#changeState(CHARACTER_STATES.HURT);
  }

  /**
   * Applies knockback.
   * @param {string} direction Direction applied to the movement or impact.
   * @param {Readonly<object>} config Configuration values used by the operation.
   */
  #applyKnockback(direction, config) {
    this.velocityX = Math.sign(direction) *
      config.knockbackHorizontalPixelsPerSecond;
    this.velocityY = -config.knockbackVerticalPixelsPerSecond;
    this.setOnGround(false);
  }

  /**
   * Performs the launch operation.
   * @param {Readonly<object>} launch Launch supplied to launch.
   */
  #launch(launch) {
    this.velocityX = launch.velocityX;
    this.velocityY = launch.velocityY;
    this.setOnGround(false);
  }

  /** Clears ground movement. */
  #stopGroundMovement() {
    this.velocityX = 0;
  }

  /**
   * Updates inactivity.
   * @param {number} deltaTimeSeconds Elapsed time since the previous frame, in seconds.
   * @param {Readonly<object>} input Current input source used by the simulation.
   * @param {Readonly<object>} config Configuration values used by the operation.
   */
  #updateInactivity(deltaTimeSeconds, input, config) {
    if (this.#hasActivity(input, config)) {
      this.inactivitySeconds = 0;
      return;
    }
    this.inactivitySeconds += deltaTimeSeconds;
  }

  /**
   * Checks the activity condition.
   * @param {Readonly<object>} input Current input source used by the simulation.
   * @param {Readonly<object>} config Configuration values used by the operation.
   */
  #hasActivity(input, config) {
    const hasInput = ACTIVITY_ACTIONS.some((action) => Boolean(input[action]));
    const threshold = config.movementStateThresholdPixelsPerSecond;
    const isMoving = Math.abs(this.velocityX) > threshold || !this.isOnGround;
    return hasInput || isMoving || this.isHurt;
  }

  /**
   * Updates jump charge.
   * @param {Readonly<object>} config Configuration values used by the operation.
   */
  #updateJumpCharge(config) {
    const ratio = this.jumpController.getChargeRatio(config);
    this.jumpChargePercent = Math.round(ratio * 100);
  }

  /**
   * Performs the change state operation.
   * @param {string} nextState State requested for the next transition.
   */
  #changeState(nextState) {
    if (this.state === nextState) return false;
    this.state = nextState;
    this.setFrameIndex(this.animationController.setState(nextState));
    return true;
  }

  /**
   * Updates animation.
   * @param {number} deltaTimeSeconds Elapsed time since the previous frame, in seconds.
   */
  #updateAnimation(deltaTimeSeconds) {
    const frameIndex = this.animationController.update(this.state, deltaTimeSeconds);
    this.setFrameIndex(frameIndex);
  }

  /**
   * Performs the maintain dead state operation.
   * @param {number} deltaTimeSeconds Elapsed time since the previous frame, in seconds.
   */
  #maintainDeadState(deltaTimeSeconds) {
    this.#stopMovement();
    this.#changeState(CHARACTER_STATES.DEAD);
    this.#updateAnimation(deltaTimeSeconds);
  }

  /** Returns hit opacity. */
  #getHitOpacity() {
    if (!this.isInvulnerable || this.isDead) return 1;
    const blinkFrame = Math.floor(this.invulnerabilitySecondsRemaining * 12);
    return blinkFrame % 2 === 0 ? 0.35 : 1;
  }

  /**
   * Validates knockback.
   * @param {string} direction Direction applied to the movement or impact.
   * @param {Readonly<object>} config Configuration values used by the operation.
   */
  #validateKnockback(direction, config) {
    const hasDirection = Number.isFinite(direction) && Math.sign(direction) !== 0;
    const values = [
      config?.knockbackHorizontalPixelsPerSecond,
      config?.knockbackVerticalPixelsPerSecond,
    ];
    const hasValues = values.every((value) => Number.isFinite(value) && value > 0);
    if (hasDirection && hasValues) return;
    throw new TypeError("Die Trefferreaktion ist ungültig.");
  }

  /** Clears movement. */
  #stopMovement() {
    this.jumpController.reset();
    this.velocityX = 0;
    this.velocityY = 0;
    this.accelerationX = 0;
    this.accelerationY = 0;
  }

  /**
   * Checks the valid delta time condition.
   * @param {number} deltaTimeSeconds Elapsed time since the previous frame, in seconds.
   */
  #isValidDeltaTime(deltaTimeSeconds) {
    return Number.isFinite(deltaTimeSeconds) && deltaTimeSeconds > 0;
  }
}
