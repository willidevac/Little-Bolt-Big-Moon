import { DrawableObject } from "../base/drawable-object.class.js";
import { AnimationController } from "../systems/animation-controller.class.js";
import { getGroundedSpriteY } from "../effects/grounded-sprite-position.js";

const ANIMATION_STATE = "active";

/**
 * Displays a non-colliding clue for the wordless environmental story.
 */
export class StoryProp extends DrawableObject {
  /**
   * @param {Readonly<{id:string,type:string,x:number,y:number,anchorPlatformId:string}>} data
   * @param {Readonly<object>} visualConfig
   * @param {Readonly<object>} anchorPlatform
   */
  constructor(data, visualConfig, anchorPlatform) {
    super();
    this.#validateData(data);
    this.#validateVisualConfig(visualConfig);
    Object.assign(this, data);
    this.width = visualConfig.sprite.frameWidth * visualConfig.renderScale;
    this.height = visualConfig.sprite.frameHeight * visualConfig.renderScale;
    this.groundOffsets = visualConfig.groundOffsets;
    this.glowColor = visualConfig.glowColor ?? "#67efff";
    this.pulseTime = 0;
    this.#anchorTo(anchorPlatform);
    this.loadSprite(visualConfig.sprite);
    this.animationController = this.#createAnimation(visualConfig.animation);
    this.#setInitialFrame(visualConfig.frameIndex);
  }

  /**
   * Advances only existing clue animations over time.
   * @param {number} deltaTimeSeconds
   */
  update(deltaTimeSeconds) {
    this.pulseTime += Math.max(0, deltaTimeSeconds);
    if (this.animationController) {
      const frame = this.animationController.update(
        ANIMATION_STATE,
        deltaTimeSeconds,
      );
      this.setFrameIndex(frame);
    }
    const movement = this.anchorPlatform.getFrameDisplacement();
    this.x += movement.x;
    this.y += movement.y;
  }

  /** @returns {boolean} Whether the supporting platform is currently visible. */
  get isAvailable() { return this.anchorPlatform.isCollidable !== false; }

  /** Draws the visible bottom edge directly on the supporting platform. */
  draw(context) {
    if (!this.isAvailable) return;
    const drawY = getGroundedSpriteY(this, this.groundOffsets);
    const pulse = (Math.sin(this.pulseTime * 2.4 + this.storyOrder) + 1) / 2;
    context.save();
    context.globalAlpha = 0.5 + pulse * 0.12;
    context.shadowColor = this.glowColor;
    context.shadowBlur = 7 + pulse * 5;
    this.drawCurrentFrame(context, this.x, drawY, this.width, this.height);
    context.restore();
    this.drawCurrentFrame(context, this.x, drawY, this.width, this.height);
  }

  #createAnimation(animation) {
    if (!animation) return null;
    return new AnimationController({ [ANIMATION_STATE]: animation });
  }

  #setInitialFrame(frameIndex) {
    const frame = this.animationController
      ? this.animationController.setState(ANIMATION_STATE)
      : frameIndex;
    this.setFrameIndex(frame);
  }

  #validateData(data) {
    const text = [data?.id, data?.type, data?.anchorPlatformId];
    const position = [data?.x, data?.y];
    if (text.every(this.#isText) && position.every(Number.isFinite)) return;
    throw new TypeError("Die Storyobjektdaten sind ungültig.");
  }

  #validateVisualConfig(config) {
    const hasSprite = this.#hasValidSprite(config?.sprite);
    const hasScale = Number.isFinite(config?.renderScale) &&
      config.renderScale > 0;
    const hasFrame = this.#hasValidFrame(config);
    const hasGroundOffsets = this.#hasValidGroundOffsets(config);
    const hasGlow = config?.glowColor === undefined ||
      (typeof config.glowColor === "string" && config.glowColor.length > 0);
    if (hasSprite && hasScale && hasFrame && hasGroundOffsets && hasGlow) return;
    throw new TypeError("Die Storyobjektdarstellung ist ungültig.");
  }

  #anchorTo(platform) {
    const matches = this.anchorPlatformId === platform?.id;
    const hasMovement = typeof platform?.getFrameDisplacement === "function";
    const fits = this.x >= platform?.x &&
      this.x + this.width <= platform?.x + platform?.width;
    if (!matches || !hasMovement || !fits) {
      throw new TypeError("Das Storyobjekt braucht eine passende Plattform.");
    }
    this.anchorPlatform = platform;
    this.y = platform.y - this.height;
  }

  #hasValidSprite(sprite) {
    const values = [
      sprite?.frameWidth,
      sprite?.frameHeight,
      sprite?.frameCount,
    ];
    const hasSource = typeof sprite?.source === "string" && sprite.source;
    return hasSource &&
      values.every((value) => Number.isInteger(value) && value > 0);
  }

  #hasValidFrame(config) {
    return Number.isInteger(config?.frameIndex) &&
      config.frameIndex >= 0 &&
      config.frameIndex < config?.sprite?.frameCount;
  }

  #hasValidGroundOffsets(config) {
    return Array.isArray(config?.groundOffsets) &&
      config.groundOffsets.length === config?.sprite?.frameCount &&
      config.groundOffsets.every((offset) => {
        return Number.isFinite(offset) && offset >= 0;
      });
  }

  #isText(value) {
    return typeof value === "string" && value.length > 0;
  }
}
