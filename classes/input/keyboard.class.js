const ACTION_BY_KEY_CODE = Object.freeze({
  KeyA: "left",
  ArrowLeft: "left",
  KeyD: "right",
  ArrowRight: "right",
  KeyW: "jump",
  ArrowUp: "jump",
  Space: "jump",
  KeyF: "attack",
  KeyJ: "attack",
  KeyQ: "weaponSwitch",
  KeyS: "down",
  ArrowDown: "down",
  ShiftLeft: "fast",
  ShiftRight: "fast",
  Digit1: "reviewBiome1",
  Digit2: "reviewBiome2",
  Digit3: "reviewBiome3",
  Digit4: "reviewBiome4",
  Digit5: "reviewBiome5",
  Digit6: "reviewBoss",
  Escape: "pause",
});

const PREVENTED_DEFAULT_CODES = Object.freeze([
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "Space",
]);

const SUPPORTED_ACTIONS = new Set(Object.values(ACTION_BY_KEY_CODE));

/**
 * Stores the current state of all keyboard and touch actions.
 */
export class Keyboard {
  #pressedSources;
  #pressedActions;

  /**
   * @param {EventTarget} [eventTarget=globalThis]
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
   * @param {KeyboardEvent} event
   */
  handleKeyDown(event) {
    this.#updateKeyState(event, true);
  }

  /**
   * Deactivates the state of a released game key.
   * @param {KeyboardEvent} event
   */
  handleKeyUp(event) {
    this.#updateKeyState(event, false);
  }

  /**
   * Returns a new action press exactly once.
   * @param {string} action
   * @returns {boolean}
   */
  consumePress(action) {
    return this.#pressedActions.delete(action);
  }

  /**
   * Toggles an action for exactly one keyboard or pointer source.
   * @param {string} action
   * @param {boolean} isPressed
   * @param {string} sourceId
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

  #updateKeyState(event, isPressed) {
    const action = ACTION_BY_KEY_CODE[event.code];
    if (!action || (isPressed && this.#hasModifier(event))) return;
    this.#preventBrowserAction(event);
    this.setAction(action, isPressed, `keyboard:${event.code}`);
  }

  #preventBrowserAction(event) {
    if (PREVENTED_DEFAULT_CODES.includes(event.code)) event.preventDefault();
  }

  #hasModifier(event) {
    return event.ctrlKey || event.altKey || event.metaKey;
  }

  #validateActionSource(action, isPressed, sourceId) {
    if (!SUPPORTED_ACTIONS.has(action)) {
      throw new RangeError(`Unbekannte Eingabeaktion: ${action}`);
    }
    const hasBoolean = typeof isPressed === "boolean";
    const hasSource = typeof sourceId === "string" && sourceId.length > 0;
    if (hasBoolean && hasSource) return;
    throw new TypeError("Der Eingabezustand benötigt Boolean und Quellen-ID.");
  }

  #validateEventTarget() {
    const canAdd = typeof this.eventTarget?.addEventListener === "function";
    const canRemove = typeof this.eventTarget?.removeEventListener === "function";
    if (canAdd && canRemove) return;
    throw new TypeError("Das Eingabeziel unterstützt keine Ereignis-Listener.");
  }
}
