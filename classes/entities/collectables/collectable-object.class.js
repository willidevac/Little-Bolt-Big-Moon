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
const ARC_CHARGE_SPRITE_CONFIG = Object.freeze({
  source: getAssetPath("items", "arc-charge.png"),
  frameWidth: 32,
  frameHeight: 48,
  frameCount: 1,
});
const ARC_CANNON_SPRITE_CONFIG = Object.freeze({
  source: getAssetPath("weapons", "arc-cannon.png"),
  frameWidth: 96,
  frameHeight: 64,
  frameCount: 1,
});
const ARC_CHARGE_COLLISION_BOX = Object.freeze({
  offsetX: 4,
  offsetY: 6,
  width: 40,
  height: 60,
});
const ARC_CANNON_COLLISION_BOX = Object.freeze({
  offsetX: 12,
  offsetY: 10,
  width: 72,
  height: 44,
});

export const COLLECTABLE_TYPES = Object.freeze({
  GEAR: "gear",
  ENERGY: "energy",
  AMMO: "ammo",
  ARC_CHARGE: "arcCharge",
  WEAPON: "weapon",
});

const ANIMATION_CLIPS = Object.freeze({
  [COLLECTABLE_TYPES.GEAR]: createClip(0, 4),
  [COLLECTABLE_TYPES.ENERGY]: createClip(4, 4),
  [COLLECTABLE_TYPES.AMMO]: createClip(8, 1),
  [COLLECTABLE_TYPES.ARC_CHARGE]: createClip(0, 1),
  arcCannon: createClip(0, 1),
  [COLLECTABLE_TYPES.WEAPON]: createClip(9, 4),
});

const STANDARD_VISUAL = Object.freeze({
  sprite: COLLECTABLE_SPRITE_CONFIG,
  renderScale: COLLECTABLE_RENDER_SCALE,
  collisionBox: COLLECTABLE_COLLISION_BOX,
});
const ARC_CHARGE_VISUAL = Object.freeze({
  sprite: ARC_CHARGE_SPRITE_CONFIG,
  renderScale: 1.5,
  collisionBox: ARC_CHARGE_COLLISION_BOX,
});
const ARC_CANNON_VISUAL = Object.freeze({
  sprite: ARC_CANNON_SPRITE_CONFIG,
  renderScale: 1,
  collisionBox: ARC_CANNON_COLLISION_BOX,
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
    this.#applyData(collectableData);
    this.#applyVisual(this.#getVisual(collectableData));
    this.animationController = new AnimationController(ANIMATION_CLIPS);
    this.setFrameIndex(this.animationController.setState(this.animationState));
  }

  #applyData(collectableData) {
    this.id = collectableData.id;
    this.type = collectableData.type;
    this.amount = collectableData.amount;
    this.weaponId = collectableData.weaponId ?? null;
    this.x = collectableData.x;
    this.y = collectableData.y;
  }

  /**
   * Wechselt zeitbasiert durch die Frames des gewählten Sammelobjekts.
   * @param {number} deltaTimeSeconds
   */
  update(deltaTimeSeconds) {
    const frame = this.animationController.update(
      this.animationState,
      deltaTimeSeconds,
    );
    this.setFrameIndex(frame);
  }

  /**
   * Liefert die sichere Werteänderung für den aktuellen Lauf.
   * @returns {Readonly<{type:string, amount:number}>}
   */
  getPickup() {
    const pickup = { id: this.id, type: this.type, amount: this.amount };
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

  #applyVisual(visual) {
    this.width = visual.sprite.frameWidth * visual.renderScale;
    this.height = visual.sprite.frameHeight * visual.renderScale;
    this.setCollisionBox(visual.collisionBox);
    this.loadSprite(visual.sprite);
  }

  #getVisual(data) {
    if (data.type === COLLECTABLE_TYPES.ARC_CHARGE) {
      this.animationState = COLLECTABLE_TYPES.ARC_CHARGE;
      return ARC_CHARGE_VISUAL;
    }
    if (data.weaponId === "arcCannon") {
      this.animationState = "arcCannon";
      return ARC_CANNON_VISUAL;
    }
    this.animationState = data.type;
    return STANDARD_VISUAL;
  }
}
