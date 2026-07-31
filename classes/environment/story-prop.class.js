import { DrawableObject } from "../base/drawable-object.class.js";
import { AnimationController } from "../systems/animation-controller.class.js";

const ANIMATION_STATE = "active";

/**
 * Zeigt einen nicht kollidierenden Hinweis der wortlosen Umweltgeschichte.
 */
export class StoryProp extends DrawableObject {
  /**
   * @param {Readonly<{id:string,type:string,x:number,y:number,anchorPlatformId:string}>} data
   * @param {Readonly<object>} visualConfig
   */
  constructor(data, visualConfig) {
    super();
    this.#validateData(data);
    this.#validateVisualConfig(visualConfig);
    Object.assign(this, data);
    this.width = visualConfig.sprite.frameWidth * visualConfig.renderScale;
    this.height = visualConfig.sprite.frameHeight * visualConfig.renderScale;
    this.loadSprite(visualConfig.sprite);
    this.animationController = this.#createAnimation(visualConfig.animation);
    this.#setInitialFrame(visualConfig.frameIndex);
  }

  /**
   * Bewegt ausschließlich vorhandene Hinweisanimationen zeitbasiert weiter.
   * @param {number} deltaTimeSeconds
   */
  update(deltaTimeSeconds) {
    if (!this.animationController) return;
    const frame = this.animationController.update(
      ANIMATION_STATE,
      deltaTimeSeconds,
    );
    this.setFrameIndex(frame);
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
    if (hasSprite && hasScale && hasFrame) return;
    throw new TypeError("Die Storyobjektdarstellung ist ungültig.");
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

  #isText(value) {
    return typeof value === "string" && value.length > 0;
  }
}
