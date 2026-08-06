import { DrawableObject } from "../../base/drawable-object.class.js";
import { AnimationController } from "../../systems/animation-controller.class.js";
import { getAssetPath } from "../../../js/config/asset-paths.js";
import { getGroundedSpriteY } from "../../effects/grounded-sprite-position.js";
import {
  WORLD_OBJECT_INDICATOR_TYPES,
  WorldObjectIndicator,
} from "../../effects/world-object-indicator.class.js";

const COLLECTABLE_SPRITE_CONFIG = Object.freeze({
  source: getAssetPath("items", "collectables-clean-hd.png"),
  frameWidth: 64,
  frameHeight: 64,
  frameCount: 15,
});
const COLLECTABLE_RENDER_SCALE = 1;
const FRAME_DURATION_SECONDS = 0.14;
const COLLECTABLE_COLLISION_BOX = Object.freeze({
  offsetX: 8,
  offsetY: 8,
  width: 48,
  height: 48,
});
const ARC_CHARGE_SPRITE_CONFIG = Object.freeze({
  source: getAssetPath("items", "arc-charge-clean-hd.png"),
  frameWidth: 48,
  frameHeight: 72,
  frameCount: 1,
});
const ARC_CANNON_SPRITE_CONFIG = Object.freeze({
  source: getAssetPath("weapons", "arc-cannon-clean-hd.png"),
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
const STANDARD_GROUND_OFFSETS = Object.freeze([
  4, 3, 4, 4, 17, 17, 17, 17, 21, 4, 3, 3, 3, 3, 3,
]);
const ARC_CHARGE_GROUND_OFFSETS = Object.freeze([12]);
const ARC_CANNON_GROUND_OFFSETS = Object.freeze([10]);

export const COLLECTABLE_TYPES = Object.freeze({
  GEAR: "gear",
  ENERGY: "energy",
  AMMO: "ammo",
  ARC_CHARGE: "arcCharge",
  WEAPON: "weapon",
  STORY_BADGE: "storyBadge",
});

const ANIMATION_CLIPS = Object.freeze({
  [COLLECTABLE_TYPES.GEAR]: createClip(0, 4),
  [COLLECTABLE_TYPES.ENERGY]: createClip(4, 4),
  [COLLECTABLE_TYPES.AMMO]: createClip(8, 1),
  [COLLECTABLE_TYPES.ARC_CHARGE]: createClip(0, 1),
  arcCannon: createClip(0, 1),
  [COLLECTABLE_TYPES.WEAPON]: createClip(9, 4),
  badgeLeft: createClip(13, 1),
  badgeRight: createClip(14, 1),
});

const STANDARD_VISUAL = Object.freeze({
  sprite: COLLECTABLE_SPRITE_CONFIG,
  renderScale: COLLECTABLE_RENDER_SCALE,
  collisionBox: COLLECTABLE_COLLISION_BOX,
  groundOffsets: STANDARD_GROUND_OFFSETS,
});
const ARC_CHARGE_VISUAL = Object.freeze({
  sprite: ARC_CHARGE_SPRITE_CONFIG,
  renderScale: 1,
  collisionBox: ARC_CHARGE_COLLISION_BOX,
  groundOffsets: ARC_CHARGE_GROUND_OFFSETS,
});
const ARC_CANNON_VISUAL = Object.freeze({
  sprite: ARC_CANNON_SPRITE_CONFIG,
  renderScale: 1,
  collisionBox: ARC_CANNON_COLLISION_BOX,
  groundOffsets: ARC_CANNON_GROUND_OFFSETS,
});

/**
 * Creates clip.
 * @param {number} startFrame Start frame supplied to create clip.
 * @param {number} frameCount Frame count supplied to create clip.
 */
function createClip(startFrame, frameCount) {
  return Object.freeze({
    startFrame,
    frameCount,
    frameDurationSeconds: FRAME_DURATION_SECONDS,
    loop: true,
  });
}

/**
 * An animated gear, energy cell, or ammunition pickup.
 */
export class CollectableObject extends DrawableObject {
  /**
   * Creates the configured instance.
   * @param {Readonly<object>} collectableData Collectable definition used to initialize the instance.
   */
  constructor(collectableData) {
    super();
    this.#validateData(collectableData);
    this.#applyData(collectableData);
    this.#applyVisual(this.#getVisual(collectableData));
    this.indicator = new WorldObjectIndicator(
      WORLD_OBJECT_INDICATOR_TYPES.PICKUP,
    );
    this.animationController = new AnimationController(ANIMATION_CLIPS);
    this.setFrameIndex(this.animationController.setState(this.animationState));
  }

  /**
   * Applies data.
   * @param {Readonly<object>} collectableData Collectable definition used to initialize the instance.
   */
  #applyData(collectableData) {
    this.id = collectableData.id;
    this.type = collectableData.type;
    this.amount = collectableData.amount;
    this.weaponId = collectableData.weaponId ?? null;
    this.badgePart = collectableData.badgePart ?? null;
    this.x = collectableData.x;
    this.y = collectableData.y;
  }

  /**
   * Advances through the selected collectable's frames over time.
   * @param {number} deltaTimeSeconds Elapsed time since the previous frame, in seconds.
   */
  update(deltaTimeSeconds) {
    const frame = this.animationController.update(
      this.animationState,
      deltaTimeSeconds,
    );
    this.setFrameIndex(frame);
    this.indicator.update(deltaTimeSeconds);
  }

  /**
   * Draws the grounded sprite with the shared helpful-item marker.
   * @param {CanvasRenderingContext2D} context Canvas context used for rendering.
   */
  draw(context) {
    context.save();
    this.indicator.drawGroundMarker(context, this);
    this.indicator.applyGlow(context);
    this.drawCurrentFrame(context, this.x, this.#getDrawY(), this.width, this.height);
    context.restore();
  }

  /**
   * Returns the safe value change for the current run.
   * @returns {Readonly<{type:string, amount:number}>}
   */
  getPickup() {
    const pickup = { id: this.id, type: this.type, amount: this.amount };
    if (this.weaponId) pickup.weaponId = this.weaponId;
    if (this.badgePart) pickup.badgePart = this.badgePart;
    return Object.freeze(pickup);
  }

  /**
   * Validates data.
   * @param {Readonly<object>} data Source data used to configure the instance.
   */
  #validateData(data) {
    const hasIdentity = typeof data?.id === "string" && data.id.length > 0;
    const hasType = Object.values(COLLECTABLE_TYPES).includes(data?.type);
    const hasPosition = Number.isFinite(data?.x) && Number.isFinite(data?.y);
    const hasAmount = Number.isFinite(data?.amount) && data.amount > 0;
    const hasWeapon = data?.type !== COLLECTABLE_TYPES.WEAPON ||
      (typeof data?.weaponId === "string" && data.weaponId.length > 0);
    const hasBadge = data?.type !== COLLECTABLE_TYPES.STORY_BADGE ||
      ["left", "right"].includes(data?.badgePart);
    if (hasIdentity && hasType && hasPosition && hasAmount && hasWeapon && hasBadge) {
      return;
    }
    throw new TypeError("Die Daten des Sammelobjekts sind ungültig.");
  }

  /**
   * Applies visual.
   * @param {Readonly<object>} visual Visual supplied to apply visual.
   */
  #applyVisual(visual) {
    this.width = visual.sprite.frameWidth * visual.renderScale;
    this.height = visual.sprite.frameHeight * visual.renderScale;
    this.groundOffsets = visual.groundOffsets;
    this.setCollisionBox(visual.collisionBox);
    this.loadSprite(visual.sprite);
  }

  /**
   * Returns visual.
   * @param {Readonly<object>} data Source data used to configure the instance.
   */
  #getVisual(data) {
    if (data.type === COLLECTABLE_TYPES.STORY_BADGE) return this.#getBadgeVisual(data);
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

  /**
   * Returns badge visual.
   * @param {Readonly<object>} data Source data used to configure the instance.
   */
  #getBadgeVisual(data) {
    this.animationState = data.badgePart === "left" ? "badgeLeft" : "badgeRight";
    return STANDARD_VISUAL;
  }

  /** Returns draw y. */
  #getDrawY() {
    return getGroundedSpriteY(this, this.groundOffsets);
  }
}
