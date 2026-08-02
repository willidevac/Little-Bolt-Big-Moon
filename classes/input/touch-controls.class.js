import { GAME_STATES } from "../core/game-state-machine.class.js";
import { GAMEPLAY_EVENTS } from "../core/gameplay-event-hub.class.js";

const TOUCH_CONTROLS_SELECTOR = "[data-touch-controls]";
const REQUIRED_ACTIONS = Object.freeze([
  "left",
  "right",
  "jump",
  "attack",
  "weaponSwitch",
]);
const REVIEW_ACTIONS = Object.freeze(["down", "fast"]);

const POINTER_END_EVENTS = Object.freeze([
  "pointerup",
  "pointercancel",
  "lostpointercapture",
]);

/**
 * Connects static mobile control buttons to simultaneous multi-touch input.
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
    this.#collectElements(root);
    this.unsubscribeState = null;
    this.unsubscribeGameplay = null;
    this.#bindHandlers();
  }

  #bindHandlers() {
    this.boundPointerDown = this.handlePointerDown.bind(this);
    this.boundPointerEnd = this.handlePointerEnd.bind(this);
    this.boundBlockDefault = this.blockControlDefault.bind(this);
  }

  /**
   * Connects pointer events, safety events, and game state exactly once.
   * @returns {TouchControls}
   */
  initialize() {
    if (this.unsubscribeState) return this;
    this.#addElementListeners();
    this.#subscribeToGame();
    this.renderCombat(this.game.weaponSystem.getCurrentWeapon());
    this.render(this.game.state);
    return this;
  }

  /**
   * Removes listeners and releases all actions that are still held.
   */
  destroy() {
    this.element.removeEventListener("pointerdown", this.boundPointerDown);
    POINTER_END_EVENTS.forEach((type) => {
      this.element.removeEventListener(type, this.boundPointerEnd);
    });
    this.element.removeEventListener("contextmenu", this.boundBlockDefault);
    this.element.removeEventListener("selectstart", this.boundBlockDefault);
    this.unsubscribeState?.();
    this.unsubscribeGameplay?.();
    this.unsubscribeState = null;
    this.unsubscribeGameplay = null;
    this.#releaseAllPointers();
  }

  /**
   * Activates the action of a new touch pointer.
   * @param {PointerEvent} event
   */
  handlePointerDown(event) {
    const button = this.#getButton(event.target);
    if (!button || button.disabled ||
      (event.pointerType === "mouse" && event.button !== 0)) return;
    event.preventDefault();
    this.#releasePointer(event.pointerId);
    const action = button.dataset.inputAction;
    this.#activePointers.set(event.pointerId, { action, button });
    this.input.setAction(action, true, this.#getSourceId(event.pointerId));
    this.#capturePointer(button, event.pointerId);
    this.#setButtonPressed(button, true);
  }

  /**
   * Releases exactly the touch pointer that ended or was canceled.
   * @param {PointerEvent} event
   */
  handlePointerEnd(event) {
    if (!this.#activePointers.has(event.pointerId)) return;
    if (event.cancelable) event.preventDefault();
    this.#releasePointer(event.pointerId);
  }

  /**
   * Blocks browser actions exclusively on the touch buttons.
   * @param {Event} event
   */
  blockControlDefault(event) {
    if (this.#getButton(event.target)) event.preventDefault();
  }

  /**
   * Shows the controls only during active gameplay.
   * @param {string} state
   */
  render(state) {
    const isPlaying = state === GAME_STATES.PLAYING;
    this.element.hidden = !isPlaying;
    if (!isPlaying) this.#releaseAllPointers();
  }

  /** Shows combat controls only after Byte finds the first weapon. */
  handleGameplayEvent(event) {
    if (event.type === GAMEPLAY_EVENTS.WEAPON_CHANGED) {
      this.renderCombat(event.detail);
    }
  }

  /**
   * Keeps unavailable combat buttons out of sight and keyboard focus.
   * @param {Readonly<object>} weapon
   */
  renderCombat(weapon) {
    const isUnlocked = Boolean(weapon?.isCombatUnlocked);
    this.combatButtons.forEach((button) => {
      button.hidden = !isUnlocked;
      button.disabled = !isUnlocked;
    });
    if (!isUnlocked) this.#releaseCombatPointers();
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

  #collectElements(root) {
    this.element = this.#getElement(root);
    this.buttons = [...this.element.querySelectorAll("button[data-input-action]")];
    this.combatButtons = this.buttons.filter(({ dataset }) => {
      return dataset.combatControl !== undefined;
    });
    this.#validateButtons();
  }

  #addElementListeners() {
    this.element.addEventListener("pointerdown", this.boundPointerDown);
    POINTER_END_EVENTS.forEach((type) => {
      this.element.addEventListener(type, this.boundPointerEnd);
    });
    this.element.addEventListener("contextmenu", this.boundBlockDefault);
    this.element.addEventListener("selectstart", this.boundBlockDefault);
  }

  #subscribeToGame() {
    this.unsubscribeState = this.game.onStateChange((state) => this.render(state));
    this.unsubscribeGameplay = this.game.onGameplayEvent((event) => {
      this.handleGameplayEvent(event);
    });
  }

  #releaseAllPointers() {
    [...this.#activePointers.keys()].forEach((pointerId) => {
      this.#releasePointer(pointerId);
    });
  }

  #releaseCombatPointers() {
    [...this.#activePointers.entries()].forEach(([pointerId, { button }]) => {
      if (this.combatButtons.includes(button)) this.#releasePointer(pointerId);
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

  #getElement(root) {
    const element = root.querySelector(TOUCH_CONTROLS_SELECTOR);
    if (element instanceof HTMLElement) return element;
    throw new Error("Statische Touch-Steuerung wurde nicht gefunden.");
  }

  #validateButtons() {
    const actions = this.buttons.map((button) => button.dataset.inputAction);
    const uniqueActions = new Set(actions);
    const isComplete = REQUIRED_ACTIONS.every((action) => uniqueActions.has(action));
    const reviewCount = actions.filter((action) => REVIEW_ACTIONS.includes(action)).length;
    const hasReviewActions = REVIEW_ACTIONS.every((action) => uniqueActions.has(action));
    const reviewIsValid = reviewCount === 0 || hasReviewActions;
    if (actions.length === uniqueActions.size && isComplete && reviewIsValid) return;
    throw new Error("Touch-Steuerung ist unvollständig oder doppelt.");
  }

  #validateDependencies(game, root) {
    const hasGame = typeof game?.onStateChange === "function";
    const hasGameplay = typeof game?.onGameplayEvent === "function";
    const hasInput = typeof game?.keyboard?.setAction === "function";
    const hasWeapon = typeof game?.weaponSystem?.getCurrentWeapon === "function";
    if (hasGame && hasGameplay && hasInput && hasWeapon &&
      root instanceof HTMLElement) return;
    throw new TypeError("TouchControls benötigt Spiel, Eingabe und HTML-Wurzel.");
  }
}
