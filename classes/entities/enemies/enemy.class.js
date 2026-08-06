import { MovableObject } from "../../base/movable-object.class.js";
import { AnimationController } from "../../systems/animation-controller.class.js";
import { EnemyCombatState } from "../../systems/enemy-combat-state.class.js";
import { getGroundedSpriteY } from "../../effects/grounded-sprite-position.js";

/**
 * Shared rendering, patrol, and coordination for regular enemies.
 */
export class Enemy extends MovableObject {
  #combatState;

  /**
   * @param {Readonly<object>} enemyData
   * @param {Readonly<object>} visualConfig
   * @param {Readonly<object>} combatConfig
   */
  constructor(enemyData, visualConfig, combatConfig) {
    super();
    this.#setVisualSize(visualConfig);
    this.#validateEnemyData(enemyData);
    this.#setEnemyData(enemyData);
    this.#combatState = new EnemyCombatState(
      combatConfig,
      visualConfig.animations,
      visualConfig.initialAttackState ?? "attack",
    );
    this.setCollisionBox(visualConfig.collisionBox);
    this.#initializeAnimation(visualConfig);
  }

  /** Initializes animation. */
  #initializeAnimation(visualConfig) {
    this.animationController = new AnimationController(visualConfig.animations);
    this.loadSprite(visualConfig.sprite);
    this.setAnimationState(visualConfig.initialState);
  }

  /** @returns {number} Current health. */
  get health() { return this.#combatState.health; }

  /** @returns {number} Maximum health. */
  get maximumHealth() { return this.#combatState.maximumHealth; }

  /** @returns {boolean} Whether the enemy was defeated. */
  get isDead() { return this.#combatState.isDead; }

  /** @returns {boolean} Whether the hurt animation currently has priority. */
  get isHurt() { return this.#combatState.isHurt; }

  /** @returns {boolean} Whether the enemy may be removed from the world. */
  get isReadyForRemoval() { return this.#combatState.isReadyForRemoval; }

  /** @returns {number} Remaining attack cooldown in seconds. */
  get attackCooldownSecondsRemaining() {
    return this.#combatState.attackCooldownSecondsRemaining;
  }

  /** @returns {number} Remaining attack animation time in seconds. */
  get attackSecondsRemaining() {
    return this.#combatState.attackSecondsRemaining;
  }

  /** @returns {number} Duration of the default attack animation. */
  get attackStateSeconds() { return this.#combatState.attackStateSeconds; }

  /**
   * Draws enemies mirrored according to their movement direction.
   * @param {CanvasRenderingContext2D} context
   */
  draw(context) {
    context.save();
    this.#applyGroundOffset(context);
    this.#applyEliteGlow(context);
    this.#drawFacingDirection(context);
    context.restore();
  }

  /** Applies ground offset. */
  #applyGroundOffset(context) {
    if (!this.groundOffsets) return;
    const drawY = getGroundedSpriteY(this, this.groundOffsets);
    context.translate(0, drawY - this.y);
  }

  /** Draws facing direction. */
  #drawFacingDirection(context) {
    if (this.facingDirection >= 0) return super.draw(context);
    context.save();
    context.translate(this.x + this.width, this.y);
    context.scale(-1, 1);
    this.drawCurrentFrame(context, 0, 0, this.width, this.height);
    context.restore();
  }

  /** Applies elite glow. */
  #applyEliteGlow(context) {
    if (!this.isElite) return;
    context.shadowColor = "#ff9b32";
    context.shadowBlur = 14;
  }

  /** Keeps the enemy within its patrol range. */
  stayInsidePatrol() {
    const maximumX = this.patrolMaxX - this.width;
    if (this.x <= this.patrolMinX) this.#turnAt(this.patrolMinX, 1);
    else if (this.x >= maximumX) this.#turnAt(maximumX, -1);
    this.facingDirection = this.direction;
  }

  /**
   * Maintains locked hurt, attack, and death states.
   * @param {number} deltaTimeSeconds
   * @param {string} movementState
   * @returns {boolean}
   */
  updateEnemyState(deltaTimeSeconds, movementState) {
    const lockedState = this.#combatState.update(deltaTimeSeconds);
    if (!lockedState) {
      this.setAnimationState(movementState);
      return true;
    }
    this.setAnimationState(lockedState);
    this.updateAnimation(deltaTimeSeconds);
    return false;
  }

  /**
   * Reduces enemy health and starts a hurt or mechanical death state.
   * @param {Readonly<{amount:number}>} hit
   * @returns {boolean}
   */
  receivePlayerHit(hit) {
    const nextState = this.#combatState.receiveHit(hit);
    if (!nextState) return false;
    if (nextState === "dead") this.#enterDeathState();
    else this.setAnimationState(nextState);
    return true;
  }

  /**
   * Creates a contact hit against Byte when the cooldown is ready.
   * @param {Readonly<object>} target
   * @returns {Readonly<{amount:number,direction:number,source:string}>|null}
   */
  attack(target) {
    if (!this.#combatState.canAttack) return null;
    this.#validateTarget(target);
    this.startAttackState(this.#combatState.defaultAttackState);
    const direction = this.#getCenterX(target) < this.#getCenterX(this) ? -1 : 1;
    return this.#combatState.createContactHit(this.id, direction);
  }

  /** @returns {boolean} Whether a biome boss was newly activated. */
  activateBoss() {
    if (!this.isBoss || this.isActive) return false;
    this.isActive = true;
    return true;
  }

  /** @returns {Readonly<object>} Shared visible boss values. */
  getBossSnapshot() {
    return Object.freeze({
      id: this.id,
      name: this.bossName,
      health: this.health,
      maximumHealth: this.maximumHealth,
      phase: this.phase,
      isActive: this.isActive,
      isDead: this.isDead,
      isFinalBoss: this.isFinalBoss,
    });
  }

  /**
   * Starts an existing attack clip with a shared cooldown.
   * @param {string} animationState
   * @returns {boolean}
   */
  startAttackState(animationState) {
    const clip = this.animationController.clips[animationState];
    if (!this.#combatState.startAttack(animationState, clip)) return false;
    this.setAnimationState(animationState);
    return true;
  }

  /** @param {number} seconds New attack cooldown in seconds. */
  setAttackCooldown(seconds) {
    this.#combatState.setAttackCooldown(seconds);
  }

  /**
   * Changes the animation state without exposing sprite knowledge to subclasses.
   * @param {string} state
   * @returns {boolean}
   */
  setAnimationState(state) {
    if (this.animationState === state) return false;
    this.animationState = state;
    this.setFrameIndex(this.animationController.setState(state));
    return true;
  }

  /** @param {number} deltaTimeSeconds Elapsed frame time. */
  updateAnimation(deltaTimeSeconds) {
    const frame = this.animationController.update(
      this.animationState,
      deltaTimeSeconds,
    );
    this.setFrameIndex(frame);
  }

  /** Applies visual size. */
  #setVisualSize(config) {
    const values = [
      config?.renderScale,
      config?.sprite?.frameWidth,
      config?.sprite?.frameHeight,
    ];
    if (!values.every((value) => Number.isFinite(value) && value > 0)) {
      throw new TypeError("Die Gegnerdarstellung ist ungültig.");
    }
    this.width = config.sprite.frameWidth * config.renderScale;
    this.height = config.sprite.frameHeight * config.renderScale;
    this.groundOffsets = this.#getGroundOffsets(config);
  }

  /** Returns ground offsets. */
  #getGroundOffsets(config) {
    if (config.groundOffsets === undefined) return null;
    const offsets = config.groundOffsets;
    const hasEveryFrame = Array.isArray(offsets) &&
      offsets.length === config.sprite.frameCount;
    const hasValidValues = hasEveryFrame && offsets.every((offset) => {
      return Number.isFinite(offset) && offset >= 0;
    });
    if (hasValidValues) return offsets;
    throw new TypeError("Die Bodenabstände der Gegnerdarstellung sind ungültig.");
  }

  /** Applies enemy data. */
  #setEnemyData(data) {
    this.id = data.id;
    this.type = data.type;
    this.x = data.x;
    this.y = data.y;
    this.patrolMinX = data.patrolMinX;
    this.patrolMaxX = data.patrolMaxX;
    this.direction = data.startDirection ?? 1;
    this.facingDirection = this.direction;
    this.team = "enemy";
    this.#setBossData(data);
    this.animationState = null;
  }

  /** Applies boss data. */
  #setBossData(data) {
    this.isElite = Boolean(data.isElite);
    this.isBoss = Boolean(data.isBoss);
    this.bossName = data.bossName ?? "";
    this.isFinalBoss = Boolean(data.isFinalBoss);
    this.isActive = false;
    this.phase = 1;
  }

  /** Performs the enter death state operation. */
  #enterDeathState() {
    this.isAffectedByGravity = false;
    this.#stopMovement();
    this.setAnimationState("dead");
  }

  /** Clears movement. */
  #stopMovement() {
    this.velocityX = 0;
    this.velocityY = 0;
    this.accelerationX = 0;
    this.accelerationY = 0;
  }

  /** Returns center x. */
  #getCenterX(target) {
    const bounds = typeof target.getCollisionBounds === "function"
      ? target.getCollisionBounds()
      : target;
    return bounds.x + bounds.width / 2;
  }

  /** Validates target. */
  #validateTarget(target) {
    const bounds = typeof target?.getCollisionBounds === "function"
      ? target.getCollisionBounds()
      : target;
    const values = [bounds?.x, bounds?.width];
    if (values.every((value) => Number.isFinite(value))) return;
    throw new TypeError("Das Angriffsziel ist ungültig.");
  }

  /** Performs the turn at operation. */
  #turnAt(x, direction) {
    this.x = x;
    this.direction = direction;
    this.velocityX = 0;
  }

  /** Validates enemy data. */
  #validateEnemyData(data) {
    if (this.#hasValidEnemyData(data)) return;
    throw new TypeError("Die Gegnerdaten sind ungültig.");
  }

  /** Checks the valid enemy data condition. */
  #hasValidEnemyData(data) {
    const textValues = [data?.id, data?.type];
    const numbers = [data?.x, data?.y, data?.patrolMinX, data?.patrolMaxX];
    const hasText = textValues.every((value) => typeof value === "string" && value);
    const hasNumbers = numbers.every((value) => Number.isFinite(value));
    const hasPatrol = data?.patrolMaxX - data?.patrolMinX >= this.width;
    const fitsPatrol = data?.x >= data?.patrolMinX &&
      data?.x + this.width <= data?.patrolMaxX;
    const validDirection = Math.abs(data?.startDirection ?? 1) === 1;
    return hasText && hasNumbers && hasPatrol && fitsPatrol &&
      validDirection && this.#hasValidBossProfile(data);
  }

  /** Checks the valid boss profile condition. */
  #hasValidBossProfile(data) {
    if (!data?.isBoss) return !data?.isFinalBoss && !data?.bossName;
    return typeof data.bossName === "string" && data.bossName.length > 0 &&
      typeof data.isFinalBoss === "boolean";
  }
}
