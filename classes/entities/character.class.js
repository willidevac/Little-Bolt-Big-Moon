import { MovableObject } from "../base/movable-object.class.js";
import { getAssetPath } from "../../js/config/asset-paths.js";

const BYTE_SPRITE_CONFIG = Object.freeze({
  source: getAssetPath("characters", "byte.png"),
  frameWidth: 32,
  frameHeight: 32,
  frameCount: 33,
});
const BYTE_RENDER_SCALE = 2;

/**
 * Spielbarer Hauptcharakter Byte.
 */
export class Character extends MovableObject {
  constructor() {
    super();
    this.width = BYTE_SPRITE_CONFIG.frameWidth * BYTE_RENDER_SCALE;
    this.height = BYTE_SPRITE_CONFIG.frameHeight * BYTE_RENDER_SCALE;
    this.loadSprite(BYTE_SPRITE_CONFIG);
  }
}
