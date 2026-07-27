import { DrawableObject } from "../base/drawable-object.class.js";
import { AnimationController } from "../systems/animation-controller.class.js";
import { getAssetPath } from "../../js/config/asset-paths.js";
import { clamp } from "../../js/utils/math.js";

const GATE_SPRITE_CONFIG = Object.freeze({
  source: getAssetPath("effects", "gameplay-effects.png"),
  frameWidth: 32,
  frameHeight: 32,
  frameCount: 23,
});
const GATE_RENDER_SCALE = 2;
const GATE_TILE_SIZE = GATE_SPRITE_CONFIG.frameWidth * GATE_RENDER_SCALE;
const GATE_ANIMATION = Object.freeze({
  active: Object.freeze({
    startFrame: 11,
    frameCount: 6,
    frameDurationSeconds: 0.1,
    loop: true,
  }),
});

export const COMBAT_ZONE_STATES = Object.freeze({
  WAITING: "waiting",
  ACTIVE: "active",
  COMPLETED: "completed",
});

/**
 * Sichtbarer rechteckiger Arenabereich mit einem kleinen Zustandsautomaten.
 */
export class CombatZone extends DrawableObject {
  #state;

  /**
   * @param {Readonly<object>} zoneData
   */
  constructor(zoneData) {
    super();
    this.#validateData(zoneData);
    this.id = zoneData.id;
    this.x = zoneData.x;
    this.y = zoneData.y;
    this.width = zoneData.width;
    this.height = zoneData.height;
    this.enemyIds = Object.freeze([...zoneData.enemyIds]);
    this.#state = COMBAT_ZONE_STATES.WAITING;
    this.animationController = new AnimationController(GATE_ANIMATION);
    this.loadSprite(GATE_SPRITE_CONFIG);
    this.setFrameIndex(this.animationController.setState("active"));
  }

  /**
   * Startet die Arena höchstens einmal.
   * @returns {boolean}
   */
  activate() {
    if (this.#state !== COMBAT_ZONE_STATES.WAITING) return false;
    this.#state = COMBAT_ZONE_STATES.ACTIVE;
    return true;
  }

  /**
   * Öffnet die aktive Arena dauerhaft.
   * @returns {boolean}
   */
  complete() {
    if (this.#state !== COMBAT_ZONE_STATES.ACTIVE) return false;
    this.#state = COMBAT_ZONE_STATES.COMPLETED;
    return true;
  }

  /**
   * Prüft, ob die Mitte eines Ziels den wartenden Bereich betreten hat.
   * @param {Readonly<object>} target
   * @returns {boolean}
   */
  canTrigger(target) {
    if (this.#state !== COMBAT_ZONE_STATES.WAITING) return false;
    const centerX = target.x + target.width / 2;
    const centerY = target.y + target.height / 2;
    return centerX >= this.x &&
      centerX <= this.x + this.width &&
      centerY >= this.y &&
      centerY <= this.y + this.height;
  }

  /**
   * Hält ein Ziel während der Kampfphase innerhalb des sichtbaren Rahmens.
   * @param {import("../base/movable-object.class.js").MovableObject} target
   * @returns {boolean} Ob eine Position korrigiert wurde.
   */
  constrain(target) {
    if (this.#state !== COMBAT_ZONE_STATES.ACTIVE) return false;
    const nextX = clamp(target.x, this.x, this.x + this.width - target.width);
    const nextY = clamp(target.y, this.y, this.y + this.height - target.height);
    const changedX = nextX !== target.x;
    const changedY = nextY !== target.y;
    target.x = nextX;
    target.y = nextY;
    if (changedX) target.velocityX = 0;
    if (changedY) target.velocityY = 0;
    return changedX || changedY;
  }

  /**
   * Animiert ausschließlich eine geschlossene Arena.
   * @param {number} deltaTimeSeconds
   */
  update(deltaTimeSeconds) {
    if (this.#state !== COMBAT_ZONE_STATES.ACTIVE) return;
    const frame = this.animationController.update("active", deltaTimeSeconds);
    this.setFrameIndex(frame);
  }

  /**
   * Zeichnet im Wartezustand Eckmarken und im Kampf einen geschlossenen Rahmen.
   * @param {CanvasRenderingContext2D} context
   */
  draw(context) {
    if (this.#state === COMBAT_ZONE_STATES.COMPLETED) return;
    context.save();
    context.globalAlpha = this.#state === COMBAT_ZONE_STATES.WAITING ? 0.5 : 1;
    if (this.#state === COMBAT_ZONE_STATES.WAITING) this.#drawCorners(context);
    else this.#drawPerimeter(context);
    context.restore();
  }

  /**
   * Liefert einen unveränderlichen Stand für Tests und spätere UI-Anbindung.
   * @returns {Readonly<object>}
   */
  getSnapshot() {
    return Object.freeze({
      id: this.id,
      state: this.#state,
      enemyIds: this.enemyIds,
    });
  }

  /**
   * Liefert den aktuellen Zustand ohne Änderungszugriff.
   * @returns {string}
   */
  get state() {
    return this.#state;
  }

  #drawCorners(context) {
    const rightX = this.x + this.width - GATE_TILE_SIZE;
    const bottomY = this.y + this.height - GATE_TILE_SIZE;
    this.#drawTile(context, this.x, this.y);
    this.#drawTile(context, rightX, this.y);
    this.#drawTile(context, this.x, bottomY);
    this.#drawTile(context, rightX, bottomY);
  }

  #drawPerimeter(context) {
    const columns = this.width / GATE_TILE_SIZE;
    const rows = this.height / GATE_TILE_SIZE;
    for (let column = 0; column < columns; column += 1) {
      const tileX = this.x + column * GATE_TILE_SIZE;
      this.#drawTile(context, tileX, this.y);
      this.#drawTile(context, tileX, this.y + this.height - GATE_TILE_SIZE);
    }
    for (let row = 1; row < rows - 1; row += 1) {
      const tileY = this.y + row * GATE_TILE_SIZE;
      this.#drawTile(context, this.x, tileY);
      this.#drawTile(context, this.x + this.width - GATE_TILE_SIZE, tileY);
    }
  }

  #drawTile(context, x, y) {
    this.drawCurrentFrame(
      context,
      x,
      y,
      GATE_TILE_SIZE,
      GATE_TILE_SIZE,
    );
  }

  #validateData(data) {
    const hasId = typeof data?.id === "string" && data.id.length > 0;
    const position = [data?.x, data?.y];
    const hasPosition = position.every((value) => Number.isFinite(value));
    const dimensions = [data?.width, data?.height];
    const hasDimensions = dimensions.every((value) => {
      return Number.isInteger(value) &&
        value >= GATE_TILE_SIZE * 3 &&
        value % GATE_TILE_SIZE === 0;
    });
    if (hasId && hasPosition && hasDimensions && this.#hasEnemyIds(data)) return;
    throw new TypeError("Die Kampfzonendaten sind ungültig.");
  }

  #hasEnemyIds(data) {
    if (!Array.isArray(data?.enemyIds) || data.enemyIds.length === 0) return false;
    const uniqueIds = new Set(data.enemyIds);
    return uniqueIds.size === data.enemyIds.length &&
      data.enemyIds.every((id) => typeof id === "string" && id.length > 0);
  }
}
