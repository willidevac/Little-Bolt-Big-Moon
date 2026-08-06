import { DrawableObject } from "../base/drawable-object.class.js";

/** Draws and animates the enclosed final arena around its single entrance. */
export class BossArenaStructure extends DrawableObject {
  /** @param {Readonly<object>} data @param {Readonly<object>} spriteConfig */
  constructor(data, spriteConfig) {
    super();
    this.#validate(data);
    Object.assign(this, data);
    this.lightTime = 0;
    this.loadSprite(spriteConfig);
  }

  /** Advances the arena's cold energy flow. */
  update(deltaTimeSeconds) {
    if (!Number.isFinite(deltaTimeSeconds) || deltaTimeSeconds <= 0) return;
    this.lightTime = (this.lightTime + deltaTimeSeconds) % 8;
  }

  /** Keeps the generated artwork crisp and adds restrained living light. */
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

  /** Draws floor energy. */
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

  /** Draws entrance signal. */
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

  /** Draws entrance lights. */
  #drawEntranceLights(context, index, y) {
    context.globalAlpha = 0.2 + index * 0.09;
    context.fillRect(this.entranceCenterX - this.entranceWidth / 2 + 10,
      y, 5, 18);
    context.fillRect(this.entranceCenterX + this.entranceWidth / 2 - 15,
      y, 5, 18);
  }

  /** Draws wall flow. */
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

  /** Performs operation. */
  #collider(x, y, width, height) {
    return Object.freeze({ x, y, width, height, owner: this });
  }

  /** Validates operation. */
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

  /** Returns geometry values. */
  #getGeometryValues(data) {
    return [data?.x, data?.y, data?.width, data?.height, data?.floorY,
      data?.innerLeftX, data?.innerRightX, data?.wallThickness,
      data?.ceilingBottomY, data?.roofThickness, data?.entranceCenterX,
      data?.entranceWidth];
  }
}
