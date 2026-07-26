import { GAME_STATES } from "../core/game-state-machine.class.js";

const SELECTORS = Object.freeze({
  home: '[data-game-screen="home"]',
  paused: '[data-game-screen="paused"]',
  controls: '[data-game-dialog="controls"]',
  start: '[data-ui-action="start"]',
  resume: '[data-ui-action="resume"]',
  closeControls: '[data-ui-action="close-controls"]',
});

/**
 * Liefert ein benötigtes DOM-Element oder bricht verständlich ab.
 * @param {ParentNode} root
 * @param {string} selector
 * @returns {HTMLElement}
 */
function getRequiredElement(root, selector) {
  const element = root.querySelector(selector);
  if (element instanceof HTMLElement) return element;
  throw new Error(`UI-Element nicht gefunden: ${selector}`);
}

/**
 * Verbindet statische Menüs mit dem zentralen Spielzustand.
 */
export class ScreenController {
  /**
   * @param {import("../core/game.class.js").Game} game
   * @param {HTMLElement} root
   */
  constructor(game, root) {
    this.game = game;
    this.root = root;
    this.homeScreen = getRequiredElement(root, SELECTORS.home);
    this.pauseScreen = getRequiredElement(root, SELECTORS.paused);
    this.controlsDialog = getRequiredElement(root, SELECTORS.controls);
    this.startButton = getRequiredElement(root, SELECTORS.start);
    this.resumeButton = getRequiredElement(root, SELECTORS.resume);
    this.closeButton = getRequiredElement(root, SELECTORS.closeControls);
    this.previousFocus = null;
    this.unsubscribe = null;
    this.boundClick = this.handleClick.bind(this);
    this.boundDialogKeydown = this.handleDialogKeydown.bind(this);
    this.actions = this.createActions();
  }

  /**
   * Bindet alle UI-Ereignisse höchstens einmal.
   * @returns {ScreenController}
   */
  initialize() {
    if (this.unsubscribe) return this;
    this.root.addEventListener("click", this.boundClick);
    this.controlsDialog.addEventListener("keydown", this.boundDialogKeydown);
    this.unsubscribe = this.game.onStateChange((state) => this.render(state));
    this.render(this.game.state, false);
    return this;
  }

  /**
   * Entfernt die von diesem Controller gesetzten Verbindungen.
   */
  destroy() {
    this.closeControls(false);
    this.root.removeEventListener("click", this.boundClick);
    this.controlsDialog.removeEventListener("keydown", this.boundDialogKeydown);
    this.unsubscribe?.();
    this.unsubscribe = null;
  }

  /**
   * Führt die Aktion eines angeklickten UI-Buttons aus.
   * @param {MouseEvent} event
   */
  handleClick(event) {
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest("button[data-ui-action]");
    if (!button || !this.root.contains(button)) return;
    this.actions[button.dataset.uiAction]?.();
  }

  /**
   * Schließt den Steuerungsdialog über Escape, ohne das Spiel fortzusetzen.
   * @param {KeyboardEvent} event
   */
  handleDialogKeydown(event) {
    if (event.code !== "Escape") return;
    event.preventDefault();
    event.stopPropagation();
    this.closeControls();
  }

  /**
   * Öffnet Spielziel und Steuerung als Dialog.
   */
  openControls() {
    if (!this.controlsDialog.hidden) return;
    this.previousFocus = this.root.ownerDocument.activeElement;
    this.setBackgroundInert(true);
    this.controlsDialog.hidden = false;
    this.closeButton.focus();
  }

  /**
   * Schließt den Dialog und setzt den Fokus zum Ausgangspunkt zurück.
   * @param {boolean} [restoreFocus=true]
   */
  closeControls(restoreFocus = true) {
    if (this.controlsDialog.hidden) return;
    this.controlsDialog.hidden = true;
    this.setBackgroundInert(false);
    if (restoreFocus) this.restorePreviousFocus();
  }

  /**
   * Zeigt genau den Screen des aktuellen Game States.
   * @param {string} state
   * @param {boolean} [moveFocus=true]
   */
  render(state, moveFocus = true) {
    this.homeScreen.hidden = state !== GAME_STATES.HOME;
    this.pauseScreen.hidden = state !== GAME_STATES.PAUSED;
    if (!this.homeScreen.hidden || !this.pauseScreen.hidden) {
      if (moveFocus) this.focusScreen(state);
      return;
    }
    this.closeControls(false);
  }

  /**
   * Erstellt die zentrale Zuordnung von Button zu Spielaktion.
   * @returns {Readonly<Record<string, () => void>>}
   */
  createActions() {
    return Object.freeze({
      start: () => this.game.reset(),
      controls: () => this.openControls(),
      "close-controls": () => this.closeControls(),
      resume: () => this.game.resume(),
      home: () => this.game.goHome(),
    });
  }

  /**
   * Fokussiert den wichtigsten Button des sichtbaren Screens.
   * @param {string} state
   */
  focusScreen(state) {
    if (state === GAME_STATES.HOME) this.startButton.focus();
    if (state === GAME_STATES.PAUSED) this.resumeButton.focus();
  }

  /**
   * Sperrt die abgedunkelten Menüs, solange der Dialog offen ist.
   * @param {boolean} isInert
   */
  setBackgroundInert(isInert) {
    this.homeScreen.inert = isInert;
    this.pauseScreen.inert = isInert;
  }

  /**
   * Gibt den Fokus nach dem Dialog an dessen Öffner zurück.
   */
  restorePreviousFocus() {
    if (this.previousFocus instanceof HTMLElement) this.previousFocus.focus();
    this.previousFocus = null;
  }
}
