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

/**
 * Speichert den aktuellen Zustand relevanter Tasten.
 */
export class Keyboard {
  #pressedKeyCodes;

  /**
   * @param {EventTarget} [eventTarget=globalThis]
   */
  constructor(eventTarget = globalThis) {
    this.eventTarget = eventTarget;
    this.isListening = false;
    this.#pressedKeyCodes = new Set();
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
   * Setzt alle Eingaben in den neutralen Zustand zurück.
   */
  reset() {
    this.#pressedKeyCodes.clear();
    this.left = false;
    this.right = false;
    this.jump = false;
    this.attack = false;
    this.weaponSwitch = false;
    this.pause = false;
  }

  #updateKeyState(event, isPressed) {
    const action = ACTION_BY_KEY_CODE[event.code];
    if (!action || (isPressed && this.#hasModifier(event))) return;
    this.#preventBrowserAction(event);
    this.#updatePressedKeys(event.code, isPressed);
    this[action] = this.#isActionPressed(action);
  }

  #updatePressedKeys(keyCode, isPressed) {
    if (isPressed) this.#pressedKeyCodes.add(keyCode);
    else this.#pressedKeyCodes.delete(keyCode);
  }

  #isActionPressed(action) {
    return Object.entries(ACTION_BY_KEY_CODE).some(([keyCode, mappedAction]) => {
      return mappedAction === action && this.#pressedKeyCodes.has(keyCode);
    });
  }

  #preventBrowserAction(event) {
    if (PREVENTED_DEFAULT_CODES.includes(event.code)) event.preventDefault();
  }

  #hasModifier(event) {
    return event.ctrlKey || event.altKey || event.metaKey;
  }

  #validateEventTarget() {
    const canAdd = typeof this.eventTarget?.addEventListener === "function";
    const canRemove = typeof this.eventTarget?.removeEventListener === "function";
    if (canAdd && canRemove) return;
    throw new TypeError("Das Eingabeziel unterstützt keine Ereignis-Listener.");
  }
}
