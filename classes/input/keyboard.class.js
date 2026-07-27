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
  Escape: "pause",
});

const PREVENTED_DEFAULT_CODES = Object.freeze([
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "Space",
]);

const SUPPORTED_ACTIONS = new Set(Object.values(ACTION_BY_KEY_CODE));

/**
 * Speichert den aktuellen Zustand aller Tastatur- und Touch-Aktionen.
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
   * Registriert alle Tastaturereignisse höchstens einmal.
   * @returns {boolean} Ob die Listener neu registriert wurden.
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
   * Entfernt die Tastaturereignisse und löscht alle Zustände.
   * @returns {boolean} Ob registrierte Listener entfernt wurden.
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
   * Aktiviert den Zustand einer gedrückten Spieltaste.
   * @param {KeyboardEvent} event
   */
  handleKeyDown(event) {
    this.#updateKeyState(event, true);
  }

  /**
   * Deaktiviert den Zustand einer losgelassenen Spieltaste.
   * @param {KeyboardEvent} event
   */
  handleKeyUp(event) {
    this.#updateKeyState(event, false);
  }

  /**
   * Liefert einen neuen Aktionsdruck genau einmal aus.
   * @param {string} action
   * @returns {boolean}
   */
  consumePress(action) {
    return this.#pressedActions.delete(action);
  }

  /**
   * Schaltet eine Aktion für genau eine Tastatur- oder Pointerquelle.
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
   * Setzt alle Eingaben in den neutralen Zustand zurück.
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
