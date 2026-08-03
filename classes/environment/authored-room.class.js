import { DrawableObject } from "../base/drawable-object.class.js";

/** Draws one cohesive room and exposes only its visible solid surfaces. */
export class AuthoredRoom extends DrawableObject {
  /** @param {Readonly<object>} data @param {Readonly<object>} spriteConfig */
  constructor(data, spriteConfig) {
    super();
    this.#validate(data, spriteConfig);
    this.#applyData(data);
    this.loadSprite(spriteConfig);
  }

  #applyData(data) {
    Object.assign(this, {
      id: data.id,
      x: data.x,
      y: data.y,
      width: data.width,
      height: data.height,
      role: "authored-room",
    });
    this.collisionBoxes = Object.freeze(data.collisionBoxes.map((box) => {
      return Object.freeze({ ...box });
    }));
  }

  /** Returns the room's solid surfaces in world coordinates. */
  getCollisionBoundsList() {
    return Object.freeze(this.collisionBoxes.map((box) => Object.freeze({
      id: `${this.id}-${box.id}`,
      x: this.x + box.offsetX,
      y: this.y + box.offsetY,
      width: box.width,
      height: box.height,
      owner: this,
    })));
  }

  #validate(data, spriteConfig) {
    const values = [data?.x, data?.y, data?.width, data?.height];
    const hasIdentity = typeof data?.id === "string" && data.id.length > 0;
    const hasSize = values.every(Number.isFinite) && data.width > 0 &&
      data.height > 0;
    const boxesAreValid = Array.isArray(data?.collisionBoxes) &&
      data.collisionBoxes.length > 0 && data.collisionBoxes.every((box) => {
        return this.#isValidCollisionBox(box, data);
      });
    if (hasIdentity && hasSize && boxesAreValid && spriteConfig) return;
    throw new TypeError("The authored-room definition is invalid.");
  }

  #isValidCollisionBox(box, room) {
    const values = [box?.offsetX, box?.offsetY, box?.width, box?.height];
    const hasIdentity = typeof box?.id === "string" && box.id.length > 0;
    const hasSize = values.every(Number.isFinite) && box.width > 0 &&
      box.height > 0;
    const fitsRoom = box.offsetX >= 0 && box.offsetY >= 0 &&
      box.offsetX + box.width <= room.width &&
      box.offsetY + box.height <= room.height;
    return hasIdentity && hasSize && fitsRoom;
  }
}
