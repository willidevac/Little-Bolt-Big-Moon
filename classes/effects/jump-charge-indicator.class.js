import { clamp } from "../../js/utils/math.js";

const BAR_WIDTH = 72;
const BAR_HEIGHT = 10;
const BAR_BORDER = 2;
const CHARACTER_GAP = 12;
const VIEWPORT_PADDING = 8;
const TRACK_COLOR = "#02070d";
const BORDER_COLOR = "#f1d6a4";
const CHARGE_COLOR = "#32e1df";
const FULL_CHARGE_COLOR = "#cf6f28";

/** Draws Byte's jump charge close to the character. */
export class JumpChargeIndicator {
  /**
   * Creates the configured instance.
   * @param {Readonly<{width:number,height:number}>} viewport Viewport dimensions used to position the effect.
   */
  constructor(viewport) {
    this.viewport = viewport;
  }

  /**
   * Draws the indicator only while Byte is charging a jump.
   * @param {CanvasRenderingContext2D} context Canvas context used for rendering.
   * @param {Readonly<object>|null} character Character affected by the operation.
   * @param {Readonly<{x:number,y:number}>} camera Camera providing the current world offset.
   * @returns {boolean} Whether the indicator was drawn.
   */
  draw(context, character, camera) {
    if (!character?.isChargingJump) return false;
    const percent = clamp(character.jumpChargePercent, 0, 100);
    const position = this.#getPosition(character, camera);
    context.save();
    this.#drawTrack(context, position);
    this.#drawFill(context, position, percent);
    this.#drawBorder(context, position);
    context.restore();
    return true;
  }

  /**
   * Returns position.
   * @param {Readonly<object>} character Character affected by the operation.
   * @param {Readonly<object>} camera Camera providing the current world offset.
   */
  #getPosition(character, camera) {
    const centeredX = character.x + character.width / 2 - BAR_WIDTH / 2;
    const minimumX = camera.x + VIEWPORT_PADDING;
    const maximumX = camera.x + this.viewport.width - BAR_WIDTH - VIEWPORT_PADDING;
    const x = clamp(centeredX, minimumX, maximumX);
    const aboveY = character.y - BAR_HEIGHT - CHARACTER_GAP;
    const y = aboveY >= camera.y + VIEWPORT_PADDING
      ? aboveY
      : character.y + character.height + CHARACTER_GAP;
    return Object.freeze({ x, y });
  }

  /**
   * Draws track.
   * @param {CanvasRenderingContext2D} context Canvas context used for rendering.
   * @param {Readonly<object>} position World-space position applied to the entity.
   */
  #drawTrack(context, { x, y }) {
    context.fillStyle = TRACK_COLOR;
    context.fillRect(x, y, BAR_WIDTH, BAR_HEIGHT);
  }

  /**
   * Draws fill.
   * @param {CanvasRenderingContext2D} context Canvas context used for rendering.
   * @param {Readonly<object>} position World-space position applied to the entity.
   * @param {number} percent Percent supplied to draw fill.
   */
  #drawFill(context, { x, y }, percent) {
    const innerWidth = BAR_WIDTH - BAR_BORDER * 2;
    context.fillStyle = percent >= 100 ? FULL_CHARGE_COLOR : CHARGE_COLOR;
    context.fillRect(
      x + BAR_BORDER,
      y + BAR_BORDER,
      innerWidth * percent / 100,
      BAR_HEIGHT - BAR_BORDER * 2,
    );
  }

  /**
   * Draws border.
   * @param {CanvasRenderingContext2D} context Canvas context used for rendering.
   * @param {Readonly<object>} position World-space position applied to the entity.
   */
  #drawBorder(context, { x, y }) {
    context.strokeStyle = BORDER_COLOR;
    context.lineWidth = BAR_BORDER;
    context.strokeRect(x, y, BAR_WIDTH, BAR_HEIGHT);
  }
}
