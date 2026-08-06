/**
 * Returns a draw position that places the visible sprite edge on the ground. Loading placeholders keep their original position and never enter the floor.
 * @param {Readonly<object>} drawable Drawable supplied to get grounded sprite y.
 * @param {ReadonlyArray<number>} frameOffsets Vertical offsets for the available sprite frames.
 * @returns {number}
 */
export function getGroundedSpriteY(drawable, frameOffsets) {
  const offset = frameOffsets?.[drawable?.frameIndex] ?? 0;
  return drawable?.imageState === "ready" ? drawable.y + offset : drawable.y;
}
