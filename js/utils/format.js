/**
 * Formatiert Punkte einheitlich für HUD und Endergebnis.
 * @param {number} score
 * @returns {string}
 */
export function formatScore(score) {
  return String(Math.max(0, Math.floor(score))).padStart(6, "0");
}
