import { Enemy } from "./enemy.class.js";
import { getAssetPath } from "../../../js/config/asset-paths.js";
import { SCRAP_CRAWLER_GROUND_OFFSETS } from "./enemy-ground-offsets.js";

const FULL_CIRCLE_RADIANS = Math.PI * 2;
const MOVEMENT_PHASES = Object.freeze({
  READY: "ready",
  TELEGRAPH: "telegraph",
  AIRBORNE: "airborne",
});
const VISUAL_CONFIG = Object.freeze({
  sprite: Object.freeze({
    source: getAssetPath("enemies", "scrap-crawler-clean-hd.png"),
    frameWidth: 96,
    frameHeight: 64,
    frameCount: 13,
  }),
  renderScale: 1,
  nativeFacingDirection: -1,
  groundOffsets: SCRAP_CRAWLER_GROUND_OFFSETS,
  collisionBox: Object.freeze({
    offsetX: 12,
    offsetY: 16,
    width: 72,
    height: 48,
  }),
  initialState: "idle",
  animations: Object.freeze({
    idle: Object.freeze({
      startFrame: 0,
      frameCount: 4,
      frameDurationSeconds: 0.16,
      loop: true,
    }),
    jump: Object.freeze({
      startFrame: 0,
      frameCount: 4,
      frameDurationSeconds: 0.08,
      loop: true,
    }),
    attack: Object.freeze({
      startFrame: 4,
      frameCount: 3,
      frameDurationSeconds: 0.16,
      loop: false,
    }),
    hurt: Object.freeze({
      startFrame: 7,
      frameCount: 2,
      frameDurationSeconds: 0.1,
      loop: false,
    }),
    dead: Object.freeze({
      startFrame: 9,
      frameCount: 4,
      frameDurationSeconds: 0.12,
      loop: false,
    }),
  }),
});

/**
 * Displays a warning and then leaps toward Byte without mid-air steering.
 */
export class SpringMine extends Enemy {
  /**
   * Creates the configured instance.
   * @param {Readonly<object>} enemyData Enemy definition used to initialize the instance.
   * @param {Readonly<object>} config Configuration values used by the operation.
   */
  constructor(enemyData, config) {
    super(enemyData, VISUAL_CONFIG, config);
    this.#validateConfig(config);
    this.#applyConfig(config);
    this.movementPhase = MOVEMENT_PHASES.READY;
    this.leapCooldownSecondsRemaining = 0;
    this.plannedDirection = this.direction;
  }

  /**
   * Waits, warns, and leaps along a predictable trajectory.
   * @param {number} deltaTimeSeconds Elapsed time since the previous frame, in seconds.
   * @param {import("../../core/world.class.js").World} world Active world providing runtime state and entities.
   */
  update(deltaTimeSeconds, world) {
    if (!Number.isFinite(deltaTimeSeconds) || deltaTimeSeconds <= 0) return;
    this.activateBoss();
    const canAct = this.updateEnemyState(deltaTimeSeconds, this.#getAnimation());
    if (this.isDead) return;
    if (canAct) this.#updateBehavior(deltaTimeSeconds, world.character);
    this.#updateMovement(deltaTimeSeconds, world, canAct);
  }

  /**
   * Draws a clearly visible warning before every leap.
   * @param {CanvasRenderingContext2D} context Canvas context used for rendering.
   */
  draw(context) {
    context.save();
    context.filter = "hue-rotate(145deg) saturate(1.25)";
    super.draw(context);
    context.restore();
    if (this.movementPhase === MOVEMENT_PHASES.TELEGRAPH) {
      this.#drawWarning(context);
    }
  }

  /**
   * Updates behavior.
   * @param {number} deltaTimeSeconds Elapsed time since the previous frame, in seconds.
   * @param {Readonly<object>} target Target affected or inspected by the operation.
   */
  #updateBehavior(deltaTimeSeconds, target) {
    if (this.movementPhase === MOVEMENT_PHASES.AIRBORNE) {
      if (this.isOnGround) this.#finishLeap();
      return;
    }
    if (this.movementPhase === MOVEMENT_PHASES.TELEGRAPH) {
      this.#launch();
      return;
    }
    this.#updateReadyState(deltaTimeSeconds, target);
  }

  /**
   * Updates ready state.
   * @param {number} deltaTimeSeconds Elapsed time since the previous frame, in seconds.
   * @param {Readonly<object>} target Target affected or inspected by the operation.
   */
  #updateReadyState(deltaTimeSeconds, target) {
    this.velocityX = 0;
    this.leapCooldownSecondsRemaining = Math.max(
      0,
      this.leapCooldownSecondsRemaining - deltaTimeSeconds,
    );
    if (this.#canPrepareLeap(target)) this.#prepareLeap(target);
  }

  /**
   * Checks whether prepare leap.
   * @param {Readonly<object>} target Target affected or inspected by the operation.
   */
  #canPrepareLeap(target) {
    if (!target || !this.isOnGround || this.leapCooldownSecondsRemaining > 0) {
      return false;
    }
    const horizontalDistance = Math.abs(this.#getTargetCenterX(target) - this.#getCenterX());
    const verticalDistance = Math.abs(this.#getTargetCenterY(target) - this.#getCenterY());
    return horizontalDistance <= this.detectionRangePixels &&
      verticalDistance <= this.detectionHeightPixels;
  }

  /**
   * Prepares leap.
   * @param {Readonly<object>} target Target affected or inspected by the operation.
   */
  #prepareLeap(target) {
    const targetDirection = this.#getTargetCenterX(target) < this.#getCenterX()
      ? -1
      : 1;
    this.plannedDirection = targetDirection;
    this.direction = targetDirection;
    this.facingDirection = targetDirection;
    this.movementPhase = MOVEMENT_PHASES.TELEGRAPH;
    this.startAttackState("attack");
  }

  /** Launches operation. */
  #launch() {
    this.movementPhase = MOVEMENT_PHASES.AIRBORNE;
    this.velocityX = this.plannedDirection * this.jumpHorizontalSpeedPixelsPerSecond;
    this.applyUpwardImpulse(this.jumpVerticalSpeedPixelsPerSecond);
    this.setAnimationState("jump");
  }

  /** Finishes leap. */
  #finishLeap() {
    this.movementPhase = MOVEMENT_PHASES.READY;
    this.velocityX = 0;
    this.leapCooldownSecondsRemaining = this.jumpCooldownSeconds;
  }

  /**
   * Updates movement.
   * @param {number} deltaTimeSeconds Elapsed time since the previous frame, in seconds.
   * @param {Readonly<object>} world Active world providing runtime state and entities.
   * @param {boolean} updateAnimation Update animation supplied to update movement.
   */
  #updateMovement(deltaTimeSeconds, world, updateAnimation) {
    super.update(deltaTimeSeconds, world);
    if (this.movementPhase === MOVEMENT_PHASES.AIRBORNE) {
      this.stayInsidePatrol();
    }
    if (updateAnimation) this.updateAnimation(deltaTimeSeconds);
  }

  /** Returns animation. */
  #getAnimation() {
    return this.movementPhase === MOVEMENT_PHASES.AIRBORNE ? "jump" : "idle";
  }

  /**
   * Draws warning.
   * @param {CanvasRenderingContext2D} context Canvas context used for rendering.
   */
  #drawWarning(context) {
    const progress = 1 - this.attackSecondsRemaining / this.attackStateSeconds;
    const centerX = this.x + this.width / 2;
    const centerY = this.y + this.height / 2;
    context.save();
    context.strokeStyle = "#ffb340";
    context.lineWidth = 4;
    context.globalAlpha = 0.55 + progress * 0.45;
    context.beginPath();
    context.arc(centerX, centerY, 34 + progress * 18, 0, FULL_CIRCLE_RADIANS);
    context.stroke();
    context.restore();
  }

  /**
   * Applies config.
   * @param {Readonly<object>} config Configuration values used by the operation.
   */
  #applyConfig(config) {
    this.jumpHorizontalSpeedPixelsPerSecond =
      config.jumpHorizontalSpeedPixelsPerSecond;
    this.jumpVerticalSpeedPixelsPerSecond = config.jumpVerticalSpeedPixelsPerSecond;
    this.jumpCooldownSeconds = config.jumpCooldownSeconds;
    this.detectionRangePixels = config.detectionRangePixels;
    this.detectionHeightPixels = config.detectionHeightPixels;
  }

  /**
   * Validates config.
   * @param {Readonly<object>} config Configuration values used by the operation.
   */
  #validateConfig(config) {
    const values = [
      config?.jumpHorizontalSpeedPixelsPerSecond,
      config?.jumpVerticalSpeedPixelsPerSecond,
      config?.jumpCooldownSeconds,
      config?.detectionRangePixels,
      config?.detectionHeightPixels,
    ];
    if (values.every((value) => Number.isFinite(value) && value > 0)) return;
    throw new TypeError("Die Bewegung der Sprungmine ist ungültig.");
  }

  /** Returns center x. */
  #getCenterX() {
    return this.x + this.width / 2;
  }

  /** Returns center y. */
  #getCenterY() {
    return this.y + this.height / 2;
  }

  /**
   * Returns target center x.
   * @param {Readonly<object>} target Target affected or inspected by the operation.
   */
  #getTargetCenterX(target) {
    return target.x + target.width / 2;
  }

  /**
   * Returns target center y.
   * @param {Readonly<object>} target Target affected or inspected by the operation.
   */
  #getTargetCenterY(target) {
    return target.y + target.height / 2;
  }
}
