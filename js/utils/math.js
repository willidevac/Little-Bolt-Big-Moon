/**
 * Clamps a numeric value to the specified range.
 */
export function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
}
