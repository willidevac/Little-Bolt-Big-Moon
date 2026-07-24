export const GAME_STATES = Object.freeze({
  HOME: "home",
  PLAYING: "playing",
  PAUSED: "paused",
  WON: "won",
  LOST: "lost",
});

const ALLOWED_TRANSITIONS = Object.freeze({
  [GAME_STATES.HOME]: Object.freeze([GAME_STATES.PLAYING]),
  [GAME_STATES.PLAYING]: Object.freeze([
    GAME_STATES.HOME,
    GAME_STATES.PAUSED,
    GAME_STATES.WON,
    GAME_STATES.LOST,
  ]),
  [GAME_STATES.PAUSED]: Object.freeze([
    GAME_STATES.HOME,
    GAME_STATES.PLAYING,
  ]),
  [GAME_STATES.WON]: Object.freeze([
    GAME_STATES.HOME,
    GAME_STATES.PLAYING,
  ]),
  [GAME_STATES.LOST]: Object.freeze([
    GAME_STATES.HOME,
    GAME_STATES.PLAYING,
  ]),
});

/**
 * Bewacht den aktuellen Spielzustand und erlaubt nur sinnvolle Wechsel.
 */
export class GameStateMachine {
  #currentState;

  /**
   * @param {string} [initialState=GAME_STATES.HOME]
   */
  constructor(initialState = GAME_STATES.HOME) {
    this.#validateState(initialState);
    this.#currentState = initialState;
  }

  /**
   * Prüft, ob ein bestimmter Zustand aktiv ist.
   * @param {string} state
   * @returns {boolean}
   */
  is(state) {
    return this.#currentState === state;
  }

  /**
   * Wechselt in einen erlaubten Zustand.
   * @param {string} nextState
   * @returns {boolean} Ob sich der Zustand geändert hat.
   */
  transitionTo(nextState) {
    this.#validateState(nextState);
    if (this.is(nextState)) return false;
    this.#validateTransition(nextState);
    this.#currentState = nextState;
    return true;
  }

  /**
   * Liefert den aktuellen Zustand.
   * @returns {string}
   */
  getState() {
    return this.#currentState;
  }

  /**
   * Prüft, ob ein Zustand zum Zustandsmodell gehört.
   * @param {string} state
   */
  #validateState(state) {
    if (Object.hasOwn(ALLOWED_TRANSITIONS, state)) return;
    throw new RangeError(`Unbekannter Spielzustand: ${state}`);
  }

  /**
   * Verhindert unlogische Sprünge zwischen Zuständen.
   * @param {string} nextState
   */
  #validateTransition(nextState) {
    const allowedStates = ALLOWED_TRANSITIONS[this.#currentState];
    if (allowedStates.includes(nextState)) return;
    throw new Error(`Ungültiger Zustandswechsel: ${this.#currentState} -> ${nextState}`);
  }
}
