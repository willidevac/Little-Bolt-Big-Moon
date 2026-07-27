import { MovableObject } from "../../base/movable-object.class.js";
import { AnimationController } from "../../systems/animation-controller.class.js";

/**
 * Gemeinsame Darstellung, Patrouille und Animation normaler Gegner.
 */
export class Enemy extends MovableObject {
  /**
   * @param {Readonly<object>} enemyData
   * @param {Readonly<object>} visualConfig
   */
  constructor(enemyData, visualConfig) {
    super();
    this.#setVisualSize(visualConfig);
    this.#validateEnemyData(enemyData);
    this.#setEnemyData(enemyData);
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
    this.isDead = false;
    this.animationState = null;
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
    if (hasText && hasNumbers && hasPatrol && fitsPatrol && validDirection) return;
    throw new TypeError("Die Gegnerdaten sind ungültig.");
  }
}
