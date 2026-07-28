import { GAME_STATES } from "../core/game-state-machine.class.js";

const BUTTONS = Object.freeze([
  Object.freeze({ action: "left", label: "Nach links laufen", symbol: "◀", group: "move" }),
  Object.freeze({ action: "right", label: "Nach rechts laufen", symbol: "▶", group: "move" }),
  Object.freeze({
    action: "jump",
    label: "Sprung laden und beim Loslassen springen",
    symbol: "↑",
    group: "action",
  }),
  Object.freeze({ action: "attack", label: "Angreifen", symbol: "F", group: "action" }),
  Object.freeze({ action: "weaponSwitch", label: "Waffe wechseln", symbol: "Q", group: "action" }),
]);

const POINTER_END_EVENTS = Object.freeze([
  "pointerup",
  "pointercancel",
  "lostpointercapture",
]);

/**
 * Erstellt mobile Steuerbuttons und verwaltet mehrere Finger gleichzeitig.
 */
export class TouchControls {
  #activePointers;

  /**
   * @param {import("../core/game.class.js").Game} game
   * @param {HTMLElement} root
   */
  constructor(game, root) {
    this.#validateDependencies(game, root);
    this.game = game;
    this.input = game.keyboard;
    this.root = root;
    this.#activePointers = new Map();
    this.element = this.#createElement(root.ownerDocument);
    this.buttons = [...this.element.querySelectorAll("button")];
    this.unsubscribe = null;
    this.boundPointerDown = this.handlePointerDown.bind(this);
    this.boundPointerEnd = this.handlePointerEnd.bind(this);
    this.boundBlockDefault = this.blockControlDefault.bind(this);
    root.append(this.element);
  }

  /**
   * Verbindet Pointer, Schutzereignisse und Spielzustand genau einmal.
   * @returns {TouchControls}
   */
  initialize() {
    if (this.unsubscribe) return this;
    this.element.addEventListener("pointerdown", this.boundPointerDown);
    POINTER_END_EVENTS.forEach((type) => {
      this.element.addEventListener(type, this.boundPointerEnd);
    });
    this.element.addEventListener("contextmenu", this.boundBlockDefault);
    this.element.addEventListener("selectstart", this.boundBlockDefault);
    this.unsubscribe = this.game.onStateChange((state) => this.render(state));
    this.render(this.game.state);
    return this;
  }

  /**
   * Entfernt Listener und löst alle noch gehaltenen Aktionen.
   */
  destroy() {
    this.element.removeEventListener("pointerdown", this.boundPointerDown);
    POINTER_END_EVENTS.forEach((type) => {
      this.element.removeEventListener(type, this.boundPointerEnd);
    });
    this.element.removeEventListener("contextmenu", this.boundBlockDefault);
    this.element.removeEventListener("selectstart", this.boundBlockDefault);
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.#releaseAllPointers();
  }

  /**
   * Aktiviert die Aktion eines neuen Fingers.
   * @param {PointerEvent} event
   */
  handlePointerDown(event) {
    const button = this.#getButton(event.target);
    if (!button || (event.pointerType === "mouse" && event.button !== 0)) return;
    event.preventDefault();
    this.#releasePointer(event.pointerId);
    const action = button.dataset.inputAction;
    this.#activePointers.set(event.pointerId, { action, button });
    this.input.setAction(action, true, this.#getSourceId(event.pointerId));
    this.#capturePointer(button, event.pointerId);
    this.#setButtonPressed(button, true);
  }

  /**
   * Löst genau den Finger, der beendet oder abgebrochen wurde.
   * @param {PointerEvent} event
   */
  handlePointerEnd(event) {
    if (!this.#activePointers.has(event.pointerId)) return;
    if (event.cancelable) event.preventDefault();
    this.#releasePointer(event.pointerId);
  }

  /**
   * Blockiert Browseraktionen ausschließlich auf den Touchbuttons.
   * @param {Event} event
   */
  blockControlDefault(event) {
    if (this.#getButton(event.target)) event.preventDefault();
  }

  /**
   * Zeigt die Controls nur während des laufenden Spiels.
   * @param {string} state
   */
  render(state) {
    const isPlaying = state === GAME_STATES.PLAYING;
    this.element.hidden = !isPlaying;
    if (!isPlaying) this.#releaseAllPointers();
  }

  #releasePointer(pointerId) {
    const pointer = this.#activePointers.get(pointerId);
    if (!pointer) return;
    this.input.setAction(pointer.action, false, this.#getSourceId(pointerId));
    this.#activePointers.delete(pointerId);
    const remainsPressed = [...this.#activePointers.values()].some(({ button }) => {
      return button === pointer.button;
    });
    this.#setButtonPressed(pointer.button, remainsPressed);
  }

  #releaseAllPointers() {
    [...this.#activePointers.keys()].forEach((pointerId) => {
      this.#releasePointer(pointerId);
    });
  }

  #capturePointer(button, pointerId) {
    try {
      button.setPointerCapture(pointerId);
    } catch {
      // Synthetische Testpointer besitzen keine echte Browsererfassung.
    }
  }

  #setButtonPressed(button, isPressed) {
    button.classList.toggle("is-pressed", isPressed);
    button.setAttribute("aria-pressed", String(isPressed));
  }

  #getButton(target) {
    if (!(target instanceof Element)) return null;
    const button = target.closest("button[data-input-action]");
    return button && this.element.contains(button) ? button : null;
  }

  #getSourceId(pointerId) {
    return `pointer:${pointerId}`;
  }

  #createElement(document) {
    const controls = document.createElement("nav");
    controls.className = "touch-controls";
    controls.dataset.touchControls = "";
    controls.setAttribute("aria-label", "Touch-Steuerung");
    controls.hidden = true;
    controls.append(
      this.#createGroup(document, "move"),
      this.#createGroup(document, "action"),
    );
    return controls;
  }

  #createGroup(document, groupName) {
    const group = document.createElement("div");
    group.className = `touch-controls__group touch-controls__group--${groupName}`;
    BUTTONS.filter(({ group: name }) => name === groupName).forEach((definition) => {
      group.append(this.#createButton(document, definition));
    });
    return group;
  }

  #createButton(document, definition) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "touch-control";
    button.dataset.inputAction = definition.action;
    button.setAttribute("aria-label", definition.label);
    button.setAttribute("aria-pressed", "false");
    button.textContent = definition.symbol;
    return button;
  }

  #validateDependencies(game, root) {
    const hasGame = typeof game?.onStateChange === "function";
    const hasInput = typeof game?.keyboard?.setAction === "function";
    if (hasGame && hasInput && root instanceof HTMLElement) return;
    throw new TypeError("TouchControls benötigt Spiel, Eingabe und HTML-Wurzel.");
  }
}
