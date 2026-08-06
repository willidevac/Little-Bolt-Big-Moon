/**
 * Clamps a numeric value to the specified range.
 * @param {number} value Numeric value to constrain.
 * @param {number} minimum Inclusive lower bound.
 * @param {number} maximum Inclusive upper bound.
 * @returns {number}
 */
export function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
}
