/**
 * Speichert ausschließlich Bytes kurze Angriffsanimation.
 */
export class CharacterAttackState {
  constructor() {
    this.animationState = null;
    this.secondsRemaining = 0;
  }

  /**
   * Startet eine neue Angriffsanimation, wenn noch keine läuft.
   * @param {string} animationState
   * @param {number} durationSeconds
   * @returns {boolean}
   */
  start(animationState, durationSeconds) {
    this.#validateAttack(animationState, durationSeconds);
    if (this.isActive) return false;
    this.animationState = animationState;
    this.secondsRemaining = durationSeconds;
    return true;
  }

  /**
   * Verkürzt die verbleibende Animationszeit.
   * @param {number} deltaTimeSeconds
   */
  update(deltaTimeSeconds) {
    if (!this.isActive || !Number.isFinite(deltaTimeSeconds)) return;
    this.secondsRemaining = Math.max(0, this.secondsRemaining - deltaTimeSeconds);
    if (this.secondsRemaining === 0) this.clear();
  }

  /**
   * Beendet eine laufende Angriffsanimation sofort.
   */
  clear() {
    this.animationState = null;
    this.secondsRemaining = 0;
  }

  /**
   * Zeigt, ob gerade eine Angriffsanimation läuft.
   * @returns {boolean}
   */
  get isActive() {
    return this.animationState !== null;
  }

  #validateAttack(animationState, durationSeconds) {
    const hasState = animationState === "melee" || animationState === "shoot";
    const hasDuration = Number.isFinite(durationSeconds) && durationSeconds > 0;
    if (hasState && hasDuration) return;
    throw new TypeError("Die Angriffsanimation ist ungültig.");
  }
}
