import { DrawableObject } from "../base/drawable-object.class.js";

/** Two animated wall wings forming one real collision opening. */
export class JumpWindowStructure extends DrawableObject {
  /** @param {Readonly<object>} data @param {Readonly<object>} spriteConfig */
  constructor(data, spriteConfig) {
    super();
    this.#validate(data);
    Object.assign(this, data);
    this.animationSeconds = data.phaseOffset ?? 0;
    this.loadSprite(spriteConfig);
  }

  /** Advances the guidance lights around the open jump lane. */
  update(deltaTimeSeconds) {
    if (!Number.isFinite(deltaTimeSeconds) || deltaTimeSeconds <= 0) return;
    this.animationSeconds = (this.animationSeconds + deltaTimeSeconds) %
      (this.animationFrameSeconds * 4);
    this.setFrameIndex(0);
  }

  /** Draws both side wings without filling the transparent opening. */
  draw(context) {
    const { frameWidth, frameHeight } = this.spriteConfig;
    const sourceLeftWidth = Math.round(frameWidth * this.sourceOpeningStart);
    const sourceRightX = Math.round(frameWidth * this.sourceOpeningEnd);
    const sourceRightWidth = frameWidth - sourceRightX;
    const sourceY = 0;
    if (this.imageState !== "ready") return;
    context.drawImage(this.image,
      0, sourceY, sourceLeftWidth, frameHeight,
      this.x, this.y, this.openingX - this.x, this.height);
    context.drawImage(this.image,
      sourceRightX, sourceY, sourceRightWidth, frameHeight,
      this.openingX + this.openingWidth, this.y,
      this.x + this.width - this.openingX - this.openingWidth, this.height);
    this.#drawGuidanceLights(context);
  }

  /** Returns stepped solid wings matching the visible metal geometry. */
  getCollisionBoundsList() {
    const leftWingWidth = this.openingX - this.x;
    const rightWingWidth = this.x + this.width -
      this.openingX - this.openingWidth;
    const leftWallWidth = Math.round(leftWingWidth * this.outerWallRatio);
    const rightWallWidth = Math.round(rightWingWidth * this.outerWallRatio);
    const surfaceOffset = Math.round(this.height * this.surfaceOffsetRatio);
    return Object.freeze([
      Object.freeze({
        x: this.x, y: this.y,
        width: leftWallWidth,
        height: this.height, owner: this,
      }),
      Object.freeze({
        x: this.x + leftWallWidth,
        y: this.y + surfaceOffset,
        width: leftWingWidth - leftWallWidth,
        height: this.height - surfaceOffset, owner: this,
      }),
      Object.freeze({
        x: this.openingX + this.openingWidth,
        y: this.y + surfaceOffset,
        width: rightWingWidth - rightWallWidth,
        height: this.height - surfaceOffset, owner: this,
      }),
      Object.freeze({
        x: this.x + this.width - rightWallWidth, y: this.y,
        width: rightWallWidth,
        height: this.height, owner: this,
      }),
    ]);
  }

  #drawGuidanceLights(context) {
    const pulse = (Math.sin(
      this.animationSeconds / this.animationFrameSeconds * Math.PI,
    ) + 1) * 0.16;
    const surfaceY = this.y + Math.round(
      this.height * this.surfaceOffsetRatio,
    );
    context.save();
    context.globalCompositeOperation = "lighter";
    context.globalAlpha = 0.28 + pulse;
    context.fillStyle = this.guidanceColor;
    context.fillRect(this.openingX - 8, surfaceY + 8, 6, 22);
    context.fillRect(this.openingX + this.openingWidth + 2,
      surfaceY + 8, 6, 22);
    context.restore();
  }

  #validate(data) {
    const values = [
      data?.x, data?.y, data?.width, data?.height,
      data?.openingX, data?.openingWidth, data?.animationFrameSeconds,
      data?.sourceOpeningStart, data?.sourceOpeningEnd,
      data?.surfaceOffsetRatio, data?.outerWallRatio,
    ];
    const hasPositiveGeometry = values.every(Number.isFinite) &&
      data.width > 0 && data.height > 0 && data.openingWidth > 0;
    const openingFits = data.openingX > data.x &&
      data.openingX + data.openingWidth < data.x + data.width;
    const sourceOpeningFits = data.sourceOpeningStart > 0 &&
      data.sourceOpeningStart < data.sourceOpeningEnd &&
      data.sourceOpeningEnd < 1;
    const collisionRatiosFit = data.surfaceOffsetRatio > 0 &&
      data.surfaceOffsetRatio < 1 && data.outerWallRatio > 0 &&
      data.outerWallRatio < 1;
    if (typeof data?.id === "string" && hasPositiveGeometry &&
      openingFits && sourceOpeningFits && collisionRatiosFit) return;
    throw new TypeError("The jump-window structure is invalid.");
  }
}
