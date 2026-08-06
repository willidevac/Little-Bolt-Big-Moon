import { DrawableObject } from "../base/drawable-object.class.js";

/** Two animated wall wings forming one real collision opening. */
export class JumpWindowStructure extends DrawableObject {
  /**
   * Creates the configured instance.
   * @param {Readonly<object>} data Source data used to configure the instance.
   * @param {Readonly<object>} spriteConfig Sprite configuration used for rendering.
   */
  constructor(data, spriteConfig) {
    super();
    this.#validate(data);
    Object.assign(this, data);
    this.animationSeconds = data.phaseOffset ?? 0;
    this.loadSprite(spriteConfig);
  }

  /**
   * Advances the guidance lights around the open jump lane.
   * @param {number} deltaTimeSeconds Elapsed time since the previous frame, in seconds.
   */
  update(deltaTimeSeconds) {
    if (!Number.isFinite(deltaTimeSeconds) || deltaTimeSeconds <= 0) return;
    this.animationSeconds = (this.animationSeconds + deltaTimeSeconds) %
      (this.animationFrameSeconds * 4);
    this.setFrameIndex(0);
  }

  /**
   * Draws both side wings without filling the transparent opening.
   * @param {CanvasRenderingContext2D} context Canvas context used for rendering.
   */
  draw(context) {
    const { frameWidth, frameHeight } = this.spriteConfig;
    const sourceLeftWidth = Math.round(frameWidth * this.sourceOpeningStart);
    const sourceRightX = Math.round(frameWidth * this.sourceOpeningEnd);
    const sourceRightWidth = frameWidth - sourceRightX;
    if (this.imageState !== "ready") return;
    this.#drawWings(context, sourceLeftWidth, sourceRightX, sourceRightWidth,
      frameHeight);
    this.#drawGuidanceLights(context);
  }

  /**
   * Draws wings.
   * @param {CanvasRenderingContext2D} context Canvas context used for rendering.
   * @param {number} leftWidth Left width supplied to draw wings.
   * @param {number} rightX Right x supplied to draw wings.
   * @param {number} rightWidth Right width supplied to draw wings.
   * @param {number} frameHeight Frame height supplied to draw wings.
   */
  #drawWings(context, leftWidth, rightX, rightWidth, frameHeight) {
    context.drawImage(this.image,
      0, 0, leftWidth, frameHeight,
      this.x, this.y, this.openingX - this.x, this.height);
    context.drawImage(this.image,
      rightX, 0, rightWidth, frameHeight,
      this.openingX + this.openingWidth, this.y,
      this.x + this.width - this.openingX - this.openingWidth, this.height);
  }

  /** Returns stepped solid wings matching the visible metal geometry. */
  getCollisionBoundsList() {
    const leftWingWidth = this.openingX - this.x;
    const rightWingWidth = this.x + this.width -
      this.openingX - this.openingWidth;
    const leftWallWidth = Math.round(leftWingWidth * this.outerWallRatio);
    const rightWallWidth = Math.round(rightWingWidth * this.outerWallRatio);
    const surfaceOffset = Math.round(this.height * this.surfaceOffsetRatio);
    return this.#createColliders(leftWingWidth, rightWingWidth,
      leftWallWidth, rightWallWidth, surfaceOffset);
  }

  /**
   * Creates colliders.
   * @param {number} leftWing Left wing supplied to create colliders.
   * @param {number} rightWing Right wing supplied to create colliders.
   * @param {number} leftWall Left wall supplied to create colliders.
   * @param {number} rightWall Right wall supplied to create colliders.
   * @param {number} offset Offset supplied to create colliders.
   */
  #createColliders(leftWing, rightWing, leftWall, rightWall, offset) {
    const lowerY = this.y + offset;
    const lowerHeight = this.height - offset;
    return Object.freeze([
      this.#collider(this.x, this.y, leftWall, this.height),
      this.#collider(this.x + leftWall, lowerY, leftWing - leftWall, lowerHeight),
      this.#collider(this.openingX + this.openingWidth, lowerY,
        rightWing - rightWall, lowerHeight),
      this.#collider(this.x + this.width - rightWall, this.y,
        rightWall, this.height),
    ]);
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
   * Draws guidance lights.
   * @param {CanvasRenderingContext2D} context Canvas context used for rendering.
   */
  #drawGuidanceLights(context) {
    const phase = this.animationSeconds / this.animationFrameSeconds * Math.PI;
    const pulse = (Math.sin(phase) + 1) * 0.16;
    const surfaceY = this.y + Math.round(this.height * this.surfaceOffsetRatio);
    context.save();
    context.globalCompositeOperation = "lighter";
    context.globalAlpha = 0.28 + pulse;
    context.fillStyle = this.guidanceColor;
    context.fillRect(this.openingX - 8, surfaceY + 8, 6, 22);
    context.fillRect(this.openingX + this.openingWidth + 2,
      surfaceY + 8, 6, 22);
    context.restore();
  }

  /**
   * Validates operation.
   * @param {Readonly<object>} data Source data used to configure the instance.
   */
  #validate(data) {
    const values = this.#getValidationValues(data);
    const hasPositiveGeometry = values.every(Number.isFinite) &&
      data.width > 0 && data.height > 0 && data.openingWidth > 0;
    const openingFits = data.openingX > data.x && data.openingX +
      data.openingWidth < data.x + data.width;
    const sourceOpeningFits = data.sourceOpeningStart > 0 &&
      data.sourceOpeningStart < data.sourceOpeningEnd && data.sourceOpeningEnd < 1;
    const collisionRatiosFit = this.#ratiosFit(data);
    const isValid = typeof data?.id === "string" && hasPositiveGeometry &&
      openingFits && sourceOpeningFits && collisionRatiosFit;
    if (isValid) return;
    throw new TypeError("The jump-window structure is invalid.");
  }

  /**
   * Performs fit.
   * @param {Readonly<object>} data Source data used to configure the instance.
   */
  #ratiosFit(data) {
    return data.surfaceOffsetRatio > 0 && data.surfaceOffsetRatio < 1 &&
      data.outerWallRatio > 0 && data.outerWallRatio < 1;
  }

  /**
   * Returns validation values.
   * @param {Readonly<object>} data Source data used to configure the instance.
   */
  #getValidationValues(data) {
    return [data?.x, data?.y, data?.width, data?.height,
      data?.openingX, data?.openingWidth, data?.animationFrameSeconds,
      data?.sourceOpeningStart, data?.sourceOpeningEnd,
      data?.surfaceOffsetRatio, data?.outerWallRatio];
  }
}
