const ACTIONS_BY_KEY_CODE = Object.freeze({
  KeyA: ["left"],
  ArrowLeft: ["left", "reviewLeft"],
  KeyD: ["right"],
  ArrowRight: ["right", "reviewRight"],
  KeyW: ["jump"],
  ArrowUp: ["jump", "reviewUp"],
  Space: ["jump"],
  KeyF: ["attack"],
  KeyJ: ["attack"],
  KeyQ: ["weaponSwitch"],
  KeyS: ["down"],
  ArrowDown: ["down", "reviewDown"],
  ShiftLeft: ["fast"],
  ShiftRight: ["fast"],
  Digit1: ["reviewBiome1"],
  Digit2: ["reviewBiome2"],
  Digit3: ["reviewBiome3"],
  Digit4: ["reviewBiome4"],
  Digit5: ["reviewBiome5"],
  Digit6: ["reviewBoss"],
  Escape: ["pause"],
});

const PREVENTED_DEFAULT_CODES = Object.freeze([
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "Space",
]);

const SUPPORTED_ACTIONS = new Set(Object.values(ACTIONS_BY_KEY_CODE).flat());

/**
 * Stores the current state of all keyboard and touch actions.
 */
export class Keyboard {
  #pressedSources;
  #pressedActions;

  /**
   * @param {EventTarget} [eventTarget=globalThis] Target receiving keyboard events.
   */
  constructor(eventTarget = globalThis) {
    this.eventTarget = eventTarget;
    this.isListening = false;
    this.#pressedSources = new Map();
    this.#pressedActions = new Set();
    this.boundKeyDown = this.handleKeyDown.bind(this);
    this.boundKeyUp = this.handleKeyUp.bind(this);
    this.boundReset = this.reset.bind(this);
    this.reset();
  }

  /**
   * Registers all keyboard events at most once.
   * @returns {boolean} Whether the listeners were newly registered.
   */
  bind() {
    if (this.isListening) return false;
    this.#validateEventTarget();
    this.eventTarget.addEventListener("keydown", this.boundKeyDown);
    this.eventTarget.addEventListener("keyup", this.boundKeyUp);
    this.eventTarget.addEventListener("blur", this.boundReset);
    this.isListening = true;
    return true;
  }

  /**
   * Removes the keyboard events and clears every state.
   * @returns {boolean} Whether registered listeners were removed.
   */
  unbind() {
    if (!this.isListening) return false;
    this.eventTarget.removeEventListener("keydown", this.boundKeyDown);
    this.eventTarget.removeEventListener("keyup", this.boundKeyUp);
    this.eventTarget.removeEventListener("blur", this.boundReset);
    this.isListening = false;
    this.reset();
    return true;
  }

  /**
   * Activates the state of a pressed game key.
   * @param {KeyboardEvent} event Pressed-key event to translate into actions.
   */
  handleKeyDown(event) {
    this.#updateKeyState(event, true);
  }

  /**
   * Deactivates the state of a released game key.
   * @param {KeyboardEvent} event Released-key event to translate into actions.
   */
  handleKeyUp(event) {
    this.#updateKeyState(event, false);
  }

  /**
   * Returns a new action press exactly once.
   * @param {string} action Action whose one-shot press should be consumed.
   * @returns {boolean}
   */
  consumePress(action) {
    return this.#pressedActions.delete(action);
  }

  /**
   * Toggles an action for exactly one keyboard or pointer source.
   * @param {string} action Supported game action to update.
   * @param {boolean} isPressed Whether the source currently presses the action.
   * @param {string} sourceId Stable identifier of the keyboard or pointer source.
   */
  setAction(action, isPressed, sourceId) {
    this.#validateActionSource(action, isPressed, sourceId);
    const sources = this.#pressedSources.get(action) ?? new Set();
    const wasPressed = sources.size > 0;
    if (isPressed) sources.add(sourceId);
    else sources.delete(sourceId);
    if (sources.size > 0) this.#pressedSources.set(action, sources);
    else this.#pressedSources.delete(action);
    this[action] = sources.size > 0;
    if (isPressed && !wasPressed) this.#pressedActions.add(action);
  }

  /**
   * Resets all inputs to their neutral state.
   */
  reset() {
    this.#pressedSources.clear();
    this.#pressedActions.clear();
    SUPPORTED_ACTIONS.forEach((action) => { this[action] = false; });
  }

  /**
   * Translates a keyboard event into one or more game actions.
   * @param {KeyboardEvent} event Keyboard event to translate.
   * @param {boolean} isPressed Whether the key is being pressed or released.
   */
  #updateKeyState(event, isPressed) {
    const actions = ACTIONS_BY_KEY_CODE[event.code];
    if (!actions || (isPressed && this.#hasModifier(event))) return;
    this.#preventBrowserAction(event);
    actions.forEach((action) => {
      this.setAction(action, isPressed, `keyboard:${event.code}`);
    });
  }

  /**
   * Prevents browser behavior for keys reserved by the game.
   * @param {KeyboardEvent} event Keyboard event to inspect.
   */
  #preventBrowserAction(event) {
    if (PREVENTED_DEFAULT_CODES.includes(event.code)) event.preventDefault();
  }

  /**
   * Checks whether a shortcut modifier accompanies a key press.
   * @param {KeyboardEvent} event Keyboard event to inspect.
   */
  #hasModifier(event) {
    return event.ctrlKey || event.altKey || event.metaKey;
  }

  /**
   * Validates an action update before mutating input state.
   * @param {string} action Supported action identifier.
   * @param {boolean} isPressed Candidate pressed state.
   * @param {string} sourceId Candidate input-source identifier.
   */
  #validateActionSource(action, isPressed, sourceId) {
    if (!SUPPORTED_ACTIONS.has(action)) {
      throw new RangeError(`Unbekannte Eingabeaktion: ${action}`);
    }
    const hasBoolean = typeof isPressed === "boolean";
    const hasSource = typeof sourceId === "string" && sourceId.length > 0;
    if (hasBoolean && hasSource) return;
    throw new TypeError("Der Eingabezustand benötigt Boolean und Quellen-ID.");
  }

  /** Validates event target. */
  #validateEventTarget() {
    const canAdd = typeof this.eventTarget?.addEventListener === "function";
    const canRemove = typeof this.eventTarget?.removeEventListener === "function";
    if (canAdd && canRemove) return;
    throw new TypeError("Das Eingabeziel unterstützt keine Ereignis-Listener.");
  }
}
