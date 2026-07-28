import { DrawableObject } from "../../base/drawable-object.class.js";
import { AnimationController } from "../../systems/animation-controller.class.js";
import { getAssetPath } from "../../../js/config/asset-paths.js";

const COLLECTABLE_SPRITE_CONFIG = Object.freeze({
  source: getAssetPath("items", "collectables.png"),
  frameWidth: 32,
  frameHeight: 32,
  frameCount: 15,
});
const COLLECTABLE_RENDER_SCALE = 2;
const FRAME_DURATION_SECONDS = 0.14;
const COLLECTABLE_COLLISION_BOX = Object.freeze({
  offsetX: 8,
  offsetY: 8,
  width: 48,
  height: 48,
});

export const COLLECTABLE_TYPES = Object.freeze({
  GEAR: "gear",
  ENERGY: "energy",
  AMMO: "ammo",
  WEAPON: "weapon",
});

const ANIMATION_CLIPS = Object.freeze({
  [COLLECTABLE_TYPES.GEAR]: createClip(0, 4),
  [COLLECTABLE_TYPES.ENERGY]: createClip(4, 4),
  [COLLECTABLE_TYPES.AMMO]: createClip(8, 1),
  [COLLECTABLE_TYPES.WEAPON]: createClip(9, 4),
});

function createClip(startFrame, frameCount) {
  return Object.freeze({
    startFrame,
    frameCount,
    frameDurationSeconds: FRAME_DURATION_SECONDS,
    loop: true,
  });
}

/**
 * Ein animiertes Zahnrad, eine Energiezelle oder ein Munitionsfund.
 */
export class CollectableObject extends DrawableObject {
  /**
   * @param {Readonly<object>} collectableData
   */
  constructor(collectableData) {
    super();
    this.#validateData(collectableData);
    this.id = collectableData.id;
    this.type = collectableData.type;
    this.amount = collectableData.amount;
    this.weaponId = collectableData.weaponId ?? null;
    this.x = collectableData.x;
    this.y = collectableData.y;
    this.width = COLLECTABLE_SPRITE_CONFIG.frameWidth * COLLECTABLE_RENDER_SCALE;
    this.height = COLLECTABLE_SPRITE_CONFIG.frameHeight * COLLECTABLE_RENDER_SCALE;
    this.setCollisionBox(COLLECTABLE_COLLISION_BOX);
    this.animationController = new AnimationController(ANIMATION_CLIPS);
    this.loadSprite(COLLECTABLE_SPRITE_CONFIG);
    this.setFrameIndex(this.animationController.setState(this.type));
  }

  /**
   * Wechselt zeitbasiert durch die Frames des gewählten Sammelobjekts.
   * @param {number} deltaTimeSeconds
   */
  update(deltaTimeSeconds) {
    const frame = this.animationController.update(this.type, deltaTimeSeconds);
    this.setFrameIndex(frame);
  }

  /**
   * Liefert die sichere Werteänderung für den aktuellen Lauf.
   * @returns {Readonly<{type:string, amount:number}>}
   */
  getPickup() {
    const pickup = { type: this.type, amount: this.amount };
    if (this.weaponId) pickup.weaponId = this.weaponId;
    return Object.freeze(pickup);
  }

  #validateData(data) {
    const hasIdentity = typeof data?.id === "string" && data.id.length > 0;
    const hasType = Object.values(COLLECTABLE_TYPES).includes(data?.type);
    const hasPosition = Number.isFinite(data?.x) && Number.isFinite(data?.y);
    const hasAmount = Number.isFinite(data?.amount) && data.amount > 0;
    const hasWeapon = data?.type !== COLLECTABLE_TYPES.WEAPON ||
      (typeof data?.weaponId === "string" && data.weaponId.length > 0);
    if (hasIdentity && hasType && hasPosition && hasAmount && hasWeapon) return;
    throw new TypeError("Die Daten des Sammelobjekts sind ungültig.");
  }
}
