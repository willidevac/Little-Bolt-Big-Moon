import { DrawableObject } from "../base/drawable-object.class.js";

/** Draws and animates the enclosed final arena around its single entrance. */
export class BossArenaStructure extends DrawableObject {
  /**
   * Creates the configured instance.
   * @param {Readonly<object>} data Source data used to configure the instance.
   * @param {Readonly<object>} spriteConfig Sprite configuration used for rendering.
   */
  constructor(data, spriteConfig) {
    super();
    this.#validate(data);
    Object.assign(this, data);
    this.lightTime = 0;
    this.loadSprite(spriteConfig);
  }

  /**
   * Advances the arena's cold energy flow.
   * @param {number} deltaTimeSeconds Elapsed time since the previous frame, in seconds.
   */
  update(deltaTimeSeconds) {
    if (!Number.isFinite(deltaTimeSeconds) || deltaTimeSeconds <= 0) return;
    this.lightTime = (this.lightTime + deltaTimeSeconds) % 8;
  }

  /**
   * Keeps the generated artwork crisp and adds restrained living light.
   * @param {CanvasRenderingContext2D} context Canvas context used for rendering.
   */
  draw(context) {
    super.draw(context);
    this.#drawFloorEnergy(context);
    this.#drawEntranceSignal(context);
    this.#drawWallFlow(context);
  }

  /** Solid inner walls and roof keep the complete fight inside the arena. */
  getCollisionBoundsList() {
    return Object.freeze([
      this.#collider(this.innerLeftX - this.wallThickness,
        this.ceilingBottomY, this.wallThickness,
        this.floorY - this.ceilingBottomY),
      this.#collider(this.innerRightX, this.ceilingBottomY,
        this.wallThickness, this.floorY - this.ceilingBottomY),
      this.#collider(this.innerLeftX, this.ceilingBottomY - this.roofThickness,
        this.innerRightX - this.innerLeftX, this.roofThickness),
    ]);
  }

  /**
   * Draws floor energy.
   * @param {CanvasRenderingContext2D} context Canvas context used for rendering.
   */
  #drawFloorEnergy(context) {
    const pulse = (Math.sin(this.lightTime * 3.2) + 1) / 2;
    context.save();
    context.globalCompositeOperation = "lighter";
    context.globalAlpha = 0.16 + pulse * 0.18;
    context.fillStyle = "#78efff";
    context.fillRect(this.innerLeftX + 18, this.floorY - 5,
      this.innerRightX - this.innerLeftX - 36, 4);
    context.restore();
  }

  /**
   * Draws entrance signal.
   * @param {CanvasRenderingContext2D} context Canvas context used for rendering.
   */
  #drawEntranceSignal(context) {
    const travel = (this.lightTime * 120) % 126;
    context.save();
    context.globalCompositeOperation = "lighter";
    context.fillStyle = "#58eaff";
    for (let index = 0; index < 3; index += 1) {
      const y = this.floorY + 148 - ((travel + index * 42) % 126);
      this.#drawEntranceLights(context, index, y);
    }
    context.restore();
  }

  /**
   * Draws entrance lights.
   * @param {CanvasRenderingContext2D} context Canvas context used for rendering.
   * @param {number} index Zero-based item index used by the operation.
   * @param {number} y Vertical coordinate in canvas pixels.
   */
  #drawEntranceLights(context, index, y) {
    context.globalAlpha = 0.2 + index * 0.09;
    context.fillRect(this.entranceCenterX - this.entranceWidth / 2 + 10,
      y, 5, 18);
    context.fillRect(this.entranceCenterX + this.entranceWidth / 2 - 15,
      y, 5, 18);
  }

  /**
   * Draws wall flow.
   * @param {CanvasRenderingContext2D} context Canvas context used for rendering.
   */
  #drawWallFlow(context) {
    const travel = (this.lightTime * 150) % 330;
    context.save();
    context.globalCompositeOperation = "lighter";
    context.fillStyle = "#52e9ff";
    for (let index = 0; index < 3; index += 1) {
      const y = this.floorY - 80 - ((travel + index * 112) % 330);
      context.globalAlpha = 0.18 + index * 0.08;
      context.fillRect(this.innerLeftX - 13, y, 5, 30);
      context.fillRect(this.innerRightX + 8, y, 5, 30);
    }
    context.restore();
  }

  /**
   * Performs operation.
   * @param {number} x Horizontal coordinate in canvas pixels.
   * @param {number} y Vertical coordinate in canvas pixels.
   * @param {number} width Width supplied to collider.
   * @param {number} height Height supplied to collider.
   */
  #collider(x, y, width, height) {
    return Object.freeze({ x, y, width, height, owner: this });
  }

  /**
   * Validates operation.
   * @param {Readonly<object>} data Source data used to configure the instance.
   */
  #validate(data) {
    const numbers = this.#getGeometryValues(data);
    const hasNumbers = numbers.every(Number.isFinite);
    const hasGeometry = data?.innerLeftX < data?.innerRightX &&
      data?.ceilingBottomY < data?.floorY && data?.wallThickness > 0 &&
      data?.roofThickness > 0 && data?.entranceWidth > 0;
    if (typeof data?.id === "string" && data.id && hasNumbers &&
      hasGeometry) return;
    throw new TypeError("Die Architektur der Bossarena ist ungültig.");
  }

  /**
   * Returns geometry values.
   * @param {Readonly<object>} data Source data used to configure the instance.
   */
  #getGeometryValues(data) {
    return [data?.x, data?.y, data?.width, data?.height, data?.floorY,
      data?.innerLeftX, data?.innerRightX, data?.wallThickness,
      data?.ceilingBottomY, data?.roofThickness, data?.entranceCenterX,
      data?.entranceWidth];
  }
}
