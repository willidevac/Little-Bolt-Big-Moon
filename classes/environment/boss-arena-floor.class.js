import { DrawableObject } from "../base/drawable-object.class.js";

/** Invisible one-way support for the floor painted into the arena artwork. */
export class BossArenaFloor extends DrawableObject {
  /** @param {Readonly<object>} data */
  constructor(data) {
    super();
    this.#validate(data);
    Object.assign(this, data);
    this.setCollisionBox({
      offsetX: 0,
      offsetY: 0,
      width: this.width,
      height: 4,
    });
  }

  /** The generated arena already contains the complete visible floor. */
  draw() {}

  /** The arena floor never moves. */
  getFrameDisplacement() {
    return Object.freeze({ x: 0, y: 0 });
  }

  /** Validates the floor dimensions. */
  #validate(data) {
    const values = [data?.x, data?.y, data?.width, data?.height];
    const hasValues = values.every(Number.isFinite) && data.width > 0 &&
      data.height >= 4;
    if (typeof data?.id === "string" && data.id && hasValues) return;
    throw new TypeError("Die Kollisionsfläche der Bossarena ist ungültig.");
  }
}
