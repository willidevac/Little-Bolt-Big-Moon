import { MovableObject } from "../../base/movable-object.class.js";
import { AnimationController } from "../../systems/animation-controller.class.js";
import { EnemyCombatState } from "../../systems/enemy-combat-state.class.js";

/**
 * Gemeinsame Darstellung, Patrouille und Koordination normaler Gegner.
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

  #initializeAnimation(visualConfig) {
    this.animationController = new AnimationController(visualConfig.animations);
    this.loadSprite(visualConfig.sprite);
    this.setAnimationState(visualConfig.initialState);
  }

  /** @returns {number} Aktuelle Lebenspunkte. */
  get health() { return this.#combatState.health; }

  /** @returns {number} Maximale Lebenspunkte. */
  get maximumHealth() { return this.#combatState.maximumHealth; }

  /** @returns {boolean} Ob der Gegner besiegt wurde. */
  get isDead() { return this.#combatState.isDead; }

  /** @returns {boolean} Ob gerade die Trefferanimation Vorrang hat. */
  get isHurt() { return this.#combatState.isHurt; }

  /** @returns {boolean} Ob der Gegner aus der Welt entfernt werden darf. */
  get isReadyForRemoval() { return this.#combatState.isReadyForRemoval; }

  /** @returns {number} Verbleibende Angriffssperre in Sekunden. */
  get attackCooldownSecondsRemaining() {
    return this.#combatState.attackCooldownSecondsRemaining;
  }

  /** @returns {number} Verbleibende Angriffsanimation in Sekunden. */
  get attackSecondsRemaining() {
    return this.#combatState.attackSecondsRemaining;
  }

  /** @returns {number} Dauer der Standardangriffsanimation. */
  get attackStateSeconds() { return this.#combatState.attackStateSeconds; }

  /**
   * Zeichnet Gegner abhängig von ihrer Laufrichtung gespiegelt.
   * @param {CanvasRenderingContext2D} context
   */
  draw(context) {
    context.save();
    this.#applyEliteGlow(context);
    this.#drawFacingDirection(context);
    context.restore();
  }

  #drawFacingDirection(context) {
    if (this.facingDirection >= 0) return super.draw(context);
    context.save();
    context.translate(this.x + this.width, this.y);
    context.scale(-1, 1);
    this.drawCurrentFrame(context, 0, 0, this.width, this.height);
    context.restore();
  }

  #applyEliteGlow(context) {
    if (!this.isElite) return;
    context.shadowColor = "#ff9b32";
    context.shadowBlur = 14;
  }

  /** Hält den Gegner innerhalb seiner Patrouille. */
  stayInsidePatrol() {
    const maximumX = this.patrolMaxX - this.width;
    if (this.x <= this.patrolMinX) this.#turnAt(this.patrolMinX, 1);
    else if (this.x >= maximumX) this.#turnAt(maximumX, -1);
    this.facingDirection = this.direction;
  }

  /**
   * Pflegt gesperrte Treffer-, Angriffs- und Todeszustände.
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
   * Zieht Gegnerleben ab und startet Treffer oder mechanischen Tod.
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
   * Erzeugt bei freiem Cooldown einen Kontakttreffer gegen Byte.
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

  /** @returns {boolean} Ob ein Zwischenboss neu aktiviert wurde. */
  activateBoss() {
    if (!this.isBoss || this.isActive) return false;
    this.isActive = true;
    return true;
  }

  /** @returns {Readonly<object>} Gemeinsame sichtbare Bosswerte. */
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
   * Startet einen vorhandenen Angriffsclip mit gemeinsamem Cooldown.
   * @param {string} animationState
   * @returns {boolean}
   */
  startAttackState(animationState) {
    const clip = this.animationController.clips[animationState];
    if (!this.#combatState.startAttack(animationState, clip)) return false;
    this.setAnimationState(animationState);
    return true;
  }

  /** @param {number} seconds Neue Angriffssperre in Sekunden. */
  setAttackCooldown(seconds) {
    this.#combatState.setAttackCooldown(seconds);
  }

  /**
   * Wechselt den Animationszustand ohne Spritewissen in Unterklassen.
   * @param {string} state
   * @returns {boolean}
   */
  setAnimationState(state) {
    if (this.animationState === state) return false;
    this.animationState = state;
    this.setFrameIndex(this.animationController.setState(state));
    return true;
  }

  /** @param {number} deltaTimeSeconds Vergangene Framezeit. */
  updateAnimation(deltaTimeSeconds) {
    const frame = this.animationController.update(
      this.animationState,
      deltaTimeSeconds,
    );
    this.setFrameIndex(frame);
  }

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
  }

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

  #setBossData(data) {
    this.isElite = Boolean(data.isElite);
    this.isBoss = Boolean(data.isBoss);
    this.bossName = data.bossName ?? "";
    this.isFinalBoss = Boolean(data.isFinalBoss);
    this.isActive = false;
    this.phase = 1;
  }

  #enterDeathState() {
    this.isAffectedByGravity = false;
    this.#stopMovement();
    this.setAnimationState("dead");
  }

  #stopMovement() {
    this.velocityX = 0;
    this.velocityY = 0;
    this.accelerationX = 0;
    this.accelerationY = 0;
  }

  #getCenterX(target) {
    const bounds = typeof target.getCollisionBounds === "function"
      ? target.getCollisionBounds()
      : target;
    return bounds.x + bounds.width / 2;
  }

  #validateTarget(target) {
    const bounds = typeof target?.getCollisionBounds === "function"
      ? target.getCollisionBounds()
      : target;
    const values = [bounds?.x, bounds?.width];
    if (values.every((value) => Number.isFinite(value))) return;
    throw new TypeError("Das Angriffsziel ist ungültig.");
  }

  #turnAt(x, direction) {
    this.x = x;
    this.direction = direction;
    this.velocityX = 0;
  }

  #validateEnemyData(data) {
    if (this.#hasValidEnemyData(data)) return;
    throw new TypeError("Die Gegnerdaten sind ungültig.");
  }

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

  #hasValidBossProfile(data) {
    if (!data?.isBoss) return !data?.isFinalBoss && !data?.bossName;
    return typeof data.bossName === "string" && data.bossName.length > 0 &&
      typeof data.isFinalBoss === "boolean";
  }
}
