export const GAME_STATES = Object.freeze({
  HOME: "home",
  PLAYING: "playing",
  PAUSED: "paused",
  UPGRADING: "upgrading",
  WON: "won",
  LOST: "lost",
});

/** @typedef {typeof GAME_STATES[keyof typeof GAME_STATES]} GameState */

/** @type {Readonly<Record<GameState, ReadonlyArray<GameState>>>} */
const ALLOWED_TRANSITIONS = Object.freeze({
  [GAME_STATES.HOME]: Object.freeze([GAME_STATES.PLAYING]),
  [GAME_STATES.PLAYING]: Object.freeze([
    GAME_STATES.HOME,
    GAME_STATES.PAUSED,
    GAME_STATES.UPGRADING,
    GAME_STATES.WON,
    GAME_STATES.LOST,
  ]),
  [GAME_STATES.PAUSED]: Object.freeze([
    GAME_STATES.HOME,
    GAME_STATES.PLAYING,
  ]),
  [GAME_STATES.UPGRADING]: Object.freeze([
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
 * Guards the current game state and permits only valid transitions.
 */
export class GameStateMachine {
  /** @type {GameState} */
  #currentState;
  /** @type {Set<(state:GameState) => void>} */
  #listeners;

  /**
   * @param {GameState} [initialState=GAME_STATES.HOME]
   */
  constructor(initialState = GAME_STATES.HOME) {
    this.#validateState(initialState);
    this.#currentState = initialState;
    this.#listeners = new Set();
  }

  /**
   * Checks whether a specific state is active.
   * @param {GameState} state
   * @returns {boolean}
   */
  is(state) {
    return this.#currentState === state;
  }

  /**
   * Notifies an observer about future state changes.
   * @param {(state:GameState) => void} listener
   * @returns {() => void}
   */
  onChange(listener) {
    if (typeof listener !== "function") {
      throw new TypeError("Der Zustandsbeobachter muss eine Funktion sein.");
    }
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  /**
   * Transitions to an allowed state.
   * @param {GameState} nextState
   * @returns {boolean} Whether the state changed.
   */
  transitionTo(nextState) {
    this.#validateState(nextState);
    if (this.is(nextState)) return false;
    this.#validateTransition(nextState);
    this.#currentState = nextState;
    this.#notifyChange();
    return true;
  }

  /**
   * Returns the current state.
   * @returns {GameState}
   */
  getState() {
    return this.#currentState;
  }

  #notifyChange() {
    this.#listeners.forEach((listener) => listener(this.#currentState));
  }

  /**
   * Checks whether a state belongs to the state model.
   * @param {GameState} state
   */
  #validateState(state) {
    if (Object.hasOwn(ALLOWED_TRANSITIONS, state)) return;
    throw new RangeError(`Unbekannter Spielzustand: ${state}`);
  }

  /**
   * Prevents invalid transitions between states.
   * @param {GameState} nextState
   */
  #validateTransition(nextState) {
    const allowedStates = ALLOWED_TRANSITIONS[this.#currentState];
    if (allowedStates.includes(nextState)) return;
    throw new Error(`Ungültiger Zustandswechsel: ${this.#currentState} -> ${nextState}`);
  }
}
