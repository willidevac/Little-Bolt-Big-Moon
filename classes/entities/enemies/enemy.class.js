import { MovableObject } from "../../base/movable-object.class.js";
import { AnimationController } from "../../systems/animation-controller.class.js";

const STATE_TIMER_PROPERTIES = Object.freeze({
  hurt: "hurtSecondsRemaining",
  attack: "attackSecondsRemaining",
  dead: "deathSecondsRemaining",
});

/**
 * Gemeinsame Darstellung, Patrouille und Animation normaler Gegner.
 */
export class Enemy extends MovableObject {
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
    this.#setCombatData(
      combatConfig,
      visualConfig.animations,
      visualConfig.initialAttackState ?? "attack",
    );
    this.setCollisionBox(visualConfig.collisionBox);
    this.animationController = new AnimationController(visualConfig.animations);
    this.loadSprite(visualConfig.sprite);
    this.setAnimationState(visualConfig.initialState);
  }

  /**
   * Zeichnet Gegner abhängig von ihrer Laufrichtung gespiegelt.
   * @param {CanvasRenderingContext2D} context
   */
  draw(context) {
    if (this.facingDirection >= 0) return super.draw(context);
    context.save();
    context.translate(this.x + this.width, this.y);
    context.scale(-1, 1);
    this.drawCurrentFrame(context, 0, 0, this.width, this.height);
    context.restore();
  }

  /**
   * Hält den Gegner innerhalb seiner Patrouille und dreht ihn an den Kanten um.
   */
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
   * @returns {boolean} Ob das normale Bewegungsmuster ausgeführt werden darf.
   */
  updateEnemyState(deltaTimeSeconds, movementState) {
    this.attackCooldownSecondsRemaining = Math.max(
      0,
      this.attackCooldownSecondsRemaining - deltaTimeSeconds,
    );
    const lockedState = this.#getLockedState();
    if (lockedState) return this.#maintainTimedState(
      lockedState,
      this.#getTimerProperty(lockedState),
      deltaTimeSeconds,
    );
    this.setAnimationState(movementState);
    return true;
  }

  /**
   * Zieht Gegnerleben ab und startet Treffer oder mechanischen Tod.
   * @param {Readonly<{amount:number}>} hit
   * @returns {boolean} Ob der Gegner den Treffer angenommen hat.
   */
  receivePlayerHit(hit) {
    if (this.isDead) return false;
    this.#validateHit(hit);
    this.health = Math.max(0, this.health - hit.amount);
    if (this.health === 0) this.#die();
    else {
      this.hurtSecondsRemaining = this.hurtStateSeconds;
      this.setAnimationState("hurt");
    }
    return true;
  }

  /**
   * Erzeugt bei freiem Cooldown einen Kontakttreffer gegen Byte.
   * @param {Readonly<object>} target
   * @returns {Readonly<{amount:number,direction:number,source:string}>|null}
   */
  attack(target) {
    if (!this.#canAttack()) return null;
    this.#validateTarget(target);
    this.startAttackState(this.defaultAttackState);
    const direction = this.#getCenterX(target) < this.#getCenterX(this) ? -1 : 1;
    return this.#createContactHit(direction);
  }

  /**
   * Aktiviert einen Zwischenboss genau einmal nach seinem Zonenspawn.
   * @returns {boolean}
   */
  activateBoss() {
    if (!this.isBoss || this.isActive) return false;
    this.isActive = true;
    return true;
  }

  /**
   * Liefert die gemeinsamen Werte aller Zwischen- und Endbosse.
   * @returns {Readonly<object>}
   */
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
    if (!this.#canAttack()) return false;
    const clip = this.animationController.clips[animationState];
    this.attackSecondsRemaining = this.#getAnimationDuration(clip);
    this.attackCooldownSecondsRemaining = this.attackCooldownSeconds;
    this.attackAnimationState = animationState;
    this.setAnimationState(animationState);
    return true;
  }

  /**
   * Zeigt, ob die Todesanimation beendet und das Objekt entfernbar ist.
   * @returns {boolean}
   */
  get isReadyForRemoval() {
    return this.isDead && this.deathSecondsRemaining === 0;
  }

  /**
   * Zeigt, ob gerade die Trefferanimation Vorrang hat.
   * @returns {boolean}
   */
  get isHurt() {
    return this.hurtSecondsRemaining > 0;
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

  /**
   * Aktualisiert den aktuellen Animationsclip zeitbasiert.
   * @param {number} deltaTimeSeconds
   */
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
    this.isDead = false;
    this.animationState = null;
  }

  #setBossData(data) {
    this.isBoss = Boolean(data.isBoss);
    this.bossName = data.bossName ?? "";
    this.isFinalBoss = Boolean(data.isFinalBoss);
    this.isActive = false;
    this.phase = 1;
  }

  #setCombatData(config, animations, defaultAttackState) {
    this.#validateCombatConfig(config);
    if (!animations?.[defaultAttackState]) {
      throw new RangeError(`Unbekannter Standardangriff: ${defaultAttackState}`);
    }
    this.maximumHealth = config.maximumHealth;
    this.health = this.maximumHealth;
    this.contactDamage = config.contactDamage;
    this.attackCooldownSeconds = config.attackCooldownSeconds;
    this.defaultAttackState = defaultAttackState;
    this.#setStateDurations(animations, defaultAttackState);
    this.#resetCombatTimers();
  }

  #validateCombatConfig(config) {
    const values = [
      config?.maximumHealth,
      config?.contactDamage,
      config?.attackCooldownSeconds,
    ];
    if (!values.every((value) => Number.isFinite(value) && value > 0)) {
      throw new TypeError("Die Kampfwerte des Gegners sind ungültig.");
    }
  }

  #setStateDurations(animations, defaultAttackState) {
    this.hurtStateSeconds = this.#getAnimationDuration(animations?.hurt);
    this.attackStateSeconds = this.#getAnimationDuration(
      animations?.[defaultAttackState],
    );
    this.deathStateSeconds = this.#getAnimationDuration(animations?.dead);
  }

  #resetCombatTimers() {
    this.hurtSecondsRemaining = 0;
    this.attackSecondsRemaining = 0;
    this.deathSecondsRemaining = 0;
    this.attackCooldownSecondsRemaining = 0;
    this.attackAnimationState = this.defaultAttackState;
  }

  #getLockedState() {
    if (this.isDead) return "dead";
    if (this.isHurt) return "hurt";
    if (this.attackSecondsRemaining > 0) return this.attackAnimationState;
    return null;
  }

  #getTimerProperty(state) {
    if (state === this.attackAnimationState) return "attackSecondsRemaining";
    return STATE_TIMER_PROPERTIES[state];
  }

  #maintainTimedState(state, timerProperty, deltaTimeSeconds) {
    this[timerProperty] = Math.max(
      0,
      this[timerProperty] - deltaTimeSeconds,
    );
    this.setAnimationState(state);
    this.updateAnimation(deltaTimeSeconds);
    return false;
  }

  #die() {
    this.isDead = true;
    this.hurtSecondsRemaining = 0;
    this.attackSecondsRemaining = 0;
    this.deathSecondsRemaining = this.deathStateSeconds;
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

  #getAnimationDuration(clip) {
    const values = [clip?.frameCount, clip?.frameDurationSeconds];
    if (!values.every((value) => Number.isFinite(value) && value > 0)) {
      throw new TypeError("Der Gegner-Kampfzustand hat keine gültige Animation.");
    }
    return clip.frameCount * clip.frameDurationSeconds;
  }

  #getCenterX(target) {
    const bounds = typeof target.getCollisionBounds === "function"
      ? target.getCollisionBounds()
      : target;
    return bounds.x + bounds.width / 2;
  }

  #canAttack() {
    return !this.isDead &&
      !this.isHurt &&
      this.attackCooldownSecondsRemaining === 0;
  }

  #createContactHit(direction) {
    return Object.freeze({
      amount: this.contactDamage,
      direction,
      source: this.id,
    });
  }

  #validateHit(hit) {
    if (Number.isFinite(hit?.amount) && hit.amount > 0) return;
    throw new TypeError("Der Gegnertreffer ist ungültig.");
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
    const textValues = [data?.id, data?.type];
    const numberValues = [data?.x, data?.y, data?.patrolMinX, data?.patrolMaxX];
    const hasText = textValues.every((value) => typeof value === "string" && value);
    const hasNumbers = numberValues.every((value) => Number.isFinite(value));
    const hasPatrol = data?.patrolMaxX - data?.patrolMinX >= this.width;
    const fitsPatrol = data?.x >= data?.patrolMinX &&
      data?.x + this.width <= data?.patrolMaxX;
    const direction = data?.startDirection ?? 1;
    const validDirection = Math.abs(direction) === 1;
    const validBoss = this.#hasValidBossProfile(data);
    if (hasText && hasNumbers && hasPatrol && fitsPatrol &&
      validDirection && validBoss) return;
    throw new TypeError("Die Gegnerdaten sind ungültig.");
  }

  #hasValidBossProfile(data) {
    if (!data?.isBoss) return !data?.isFinalBoss && !data?.bossName;
    return typeof data.bossName === "string" &&
      data.bossName.length > 0 &&
      typeof data.isFinalBoss === "boolean";
  }
}
