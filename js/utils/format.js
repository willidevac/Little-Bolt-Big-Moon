/**
 * Formats scores consistently for the HUD and end result.
 * @param {number} score
 * @returns {string}
 */
export function formatScore(score) {
  return String(Math.max(0, Math.floor(score))).padStart(6, "0");
}

/**
 * Formats a best time as minutes and seconds or as an empty record.
 * @param {number|null} seconds
 * @returns {string}
 */
export function formatTime(seconds) {
  if (typeof seconds !== "number" || !Number.isFinite(seconds) || seconds < 0) {
    return "–";
  }
  const wholeSeconds = Math.floor(seconds);
  const minutes = Math.floor(wholeSeconds / 60);
  const remainingSeconds = String(wholeSeconds % 60).padStart(2, "0");
  return `${minutes}:${remainingSeconds}`;
}
