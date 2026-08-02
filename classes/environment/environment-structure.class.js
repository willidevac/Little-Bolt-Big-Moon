import { DrawableObject } from "../base/drawable-object.class.js";

/** A visible environment module with optional solid local rectangles. */
export class EnvironmentStructure extends DrawableObject {
  /**
   * @param {Readonly<object>} data
   * @param {import("./structure-sprite-atlas.class.js").StructureSpriteAtlas} atlas
   */
  constructor(data, atlas) {
    super();
    this.#validateData(data, atlas);
    this.#applyData(data, atlas);
  }

  #applyData(data, atlas) {
    Object.assign(this, {
      id: data.id,
      x: data.x,
      y: data.y,
      width: data.width,
      height: data.height,
      frame: data.frame,
      role: data.role,
      atlas,
    });
    this.collisionBoxes = this.#copyCollisionBoxes(data.collisionBoxes);
  }

  #copyCollisionBoxes(collisionBoxes) {
    return Object.freeze(collisionBoxes.map((box) => Object.freeze({ ...box })));
  }

  /** Draws only the cropped architecture module, never a loading rectangle. */
  draw(context) {
    this.atlas.draw(context, this.frame, this);
  }

  /** Returns every solid rectangle in absolute world coordinates. */
  getCollisionBoundsList() {
    return Object.freeze(this.collisionBoxes.map((box) => Object.freeze({
      x: this.x + box.offsetX,
      y: this.y + box.offsetY,
      width: box.width,
      height: box.height,
      owner: this,
    })));
  }

  #validateData(data, atlas) {
    const sizes = [data?.x, data?.y, data?.width, data?.height];
    const hasIdentity = typeof data?.id === "string" && data.id.length > 0;
    const hasSizes = sizes.every((value) => Number.isFinite(value)) &&
      data.width > 0 && data.height > 0;
    const hasFrame = data?.frame && Number.isFinite(data.frame.width);
    const hasCollisions = Array.isArray(data?.collisionBoxes) &&
      data.collisionBoxes.every((box) => this.#fitsObject(box, data));
    if (hasIdentity && hasSizes && hasFrame && hasCollisions && atlas?.draw) return;
    throw new TypeError("The environment-structure definition is invalid.");
  }

  #fitsObject(box, data) {
    const values = [box?.offsetX, box?.offsetY, box?.width, box?.height];
    return values.every((value) => Number.isFinite(value)) &&
      box.width > 0 && box.height > 0 && box.offsetX >= 0 && box.offsetY >= 0 &&
      box.offsetX + box.width <= data.width &&
      box.offsetY + box.height <= data.height;
  }
}
