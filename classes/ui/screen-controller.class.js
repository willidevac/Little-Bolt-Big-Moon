import { GAME_STATES } from "../core/game-state-machine.class.js";

const SELECTORS = Object.freeze({
  home: '[data-game-screen="home"]',
  paused: '[data-game-screen="paused"]',
  upgrading: '[data-game-screen="upgrading"]',
  upgradeOptions: "[data-upgrade-options]",
  dialogs: "[data-game-dialog]",
  start: '[data-ui-action="start"]',
  resume: '[data-ui-action="resume"]',
  dialogFocus: "[data-dialog-focus]",
});

const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled])';

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
    this.upgradeScreen = getRequiredElement(root, SELECTORS.upgrading);
    this.upgradeOptions = getRequiredElement(root, SELECTORS.upgradeOptions);
    this.startButton = getRequiredElement(root, SELECTORS.start);
    this.resumeButton = getRequiredElement(root, SELECTORS.resume);
    this.dialogs = [...root.querySelectorAll(SELECTORS.dialogs)];
    this.activeDialog = null;
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
    this.root.addEventListener("keydown", this.boundDialogKeydown);
    this.unsubscribe = this.game.onStateChange((state) => this.render(state));
    this.render(this.game.state, false);
    return this;
  }

  /**
   * Entfernt die von diesem Controller gesetzten Verbindungen.
   */
  destroy() {
    this.closeDialog(false);
    this.root.removeEventListener("click", this.boundClick);
    this.root.removeEventListener("keydown", this.boundDialogKeydown);
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
    this.actions[button.dataset.uiAction]?.(button);
  }

  /**
   * Schließt einen offenen Dialog über Escape, ohne das Spiel fortzusetzen.
   * @param {KeyboardEvent} event
   */
  handleDialogKeydown(event) {
    if (!this.activeDialog) return;
    if (event.code === "Escape") this.closeDialogFromKey(event);
    if (event.code === "Tab") this.trapDialogFocus(event);
  }

  /**
   * Schließt den Dialog über die Tastatur.
   * @param {KeyboardEvent} event
   */
  closeDialogFromKey(event) {
    event.preventDefault();
    event.stopPropagation();
    this.closeDialog();
  }

  /**
   * Öffnet einen benannten Dialog und fokussiert dessen Überschrift.
   * @param {string} name
   */
  openDialog(name) {
    if (this.activeDialog) return;
    const dialog = this.getDialog(name);
    this.previousFocus = this.root.ownerDocument.activeElement;
    this.setBackgroundInert(true);
    this.activeDialog = dialog;
    dialog.hidden = false;
    getRequiredElement(dialog, SELECTORS.dialogFocus).focus();
  }

  /**
   * Schließt den Dialog und setzt den Fokus zum Ausgangspunkt zurück.
   * @param {boolean} [restoreFocus=true]
   */
  closeDialog(restoreFocus = true) {
    if (!this.activeDialog) return;
    this.activeDialog.hidden = true;
    this.activeDialog = null;
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
    this.upgradeScreen.hidden = state !== GAME_STATES.UPGRADING;
    if (state === GAME_STATES.UPGRADING) this.#renderUpgradeOptions();
    if (!this.homeScreen.hidden || !this.pauseScreen.hidden || !this.upgradeScreen.hidden) {
      if (moveFocus) this.focusScreen(state);
      return;
    }
    this.closeDialog(false);
  }

  /**
   * Erstellt die zentrale Zuordnung von Button zu Spielaktion.
   * @returns {Readonly<Record<string, () => void>>}
   */
  createActions() {
    return Object.freeze({
      start: () => this.game.reset(),
      controls: () => this.openDialog("controls"),
      imprint: () => this.openDialog("imprint"),
      "close-dialog": () => this.closeDialog(),
      pause: () => this.game.togglePause(),
      resume: () => this.game.resume(),
      upgrade: (button) => this.game.chooseUpgrade(button.dataset.upgradeId),
      home: () => this.game.goHome(),
    });
  }

  /**
   * Liefert einen statisch vorhandenen Dialog anhand seines Namens.
   * @param {string} name
   * @returns {HTMLElement}
   */
  getDialog(name) {
    const dialog = this.dialogs.find((element) => {
      return element instanceof HTMLElement && element.dataset.gameDialog === name;
    });
    if (dialog instanceof HTMLElement) return dialog;
    throw new Error(`Dialog nicht gefunden: ${name}`);
  }

  /**
   * Hält Tab und Shift+Tab innerhalb des offenen Dialogs.
   * @param {KeyboardEvent} event
   */
  trapDialogFocus(event) {
    const focusable = [...this.activeDialog.querySelectorAll(FOCUSABLE_SELECTOR)];
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable.at(-1);
    const active = this.root.ownerDocument.activeElement;
    if (event.shiftKey && active === first) this.moveFocus(event, last);
    if (!event.shiftKey && active === last) this.moveFocus(event, first);
  }

  /**
   * Verhindert den Standardwechsel und fokussiert das Ziel.
   * @param {KeyboardEvent} event
   * @param {Element} target
   */
  moveFocus(event, target) {
    if (!(target instanceof HTMLElement)) return;
    event.preventDefault();
    target.focus();
  }

  /**
   * Fokussiert den wichtigsten Button des sichtbaren Screens.
   * @param {string} state
   */
  focusScreen(state) {
    if (state === GAME_STATES.HOME) this.startButton.focus();
    if (state === GAME_STATES.PAUSED) this.resumeButton.focus();
    if (state === GAME_STATES.UPGRADING) {
      this.upgradeOptions.querySelector("button")?.focus();
    }
  }

  /**
   * Sperrt die abgedunkelten Menüs, solange der Dialog offen ist.
   * @param {boolean} isInert
   */
  setBackgroundInert(isInert) {
    this.homeScreen.inert = isInert;
    this.pauseScreen.inert = isInert;
    this.upgradeScreen.inert = isInert;
  }

  /**
   * Baut die drei Upgrade-Schaltflächen aus sicheren DOM-Knoten neu auf.
   */
  #renderUpgradeOptions() {
    this.upgradeOptions.replaceChildren(
      ...this.game.getUpgradeOptions().map((upgrade) => {
        return this.#createUpgradeButton(upgrade);
      }),
    );
  }

  /**
   * Erstellt eine vollständig beschriftete Verbesserungsschaltfläche.
   * @param {Readonly<object>} upgrade
   * @returns {HTMLButtonElement}
   */
  #createUpgradeButton(upgrade) {
    const button = this.root.ownerDocument.createElement("button");
    button.type = "button";
    button.className = "upgrade-card";
    button.dataset.uiAction = "upgrade";
    button.dataset.upgradeId = upgrade.id;
    button.setAttribute("aria-label", this.#getUpgradeLabel(upgrade));
    button.append(
      this.#createUpgradeIcon(upgrade),
      this.#createTextElement("strong", "upgrade-card__name", upgrade.name),
      this.#createTextElement("span", "upgrade-card__level", this.#getLevelText(upgrade)),
      this.#createTextElement("span", "upgrade-card__description", upgrade.description),
    );
    return button;
  }

  #createUpgradeIcon(upgrade) {
    const document = this.root.ownerDocument;
    const icon = document.createElement("span");
    const source = new URL(upgrade.iconSheet.source, document.baseURI).href;
    icon.className = "upgrade-card__icon";
    icon.setAttribute("aria-hidden", "true");
    icon.style.setProperty("--upgrade-icon", `url("${source}")`);
    icon.style.setProperty("--upgrade-frame", upgrade.iconFrame);
    return icon;
  }

  #createTextElement(tagName, className, text) {
    const element = this.root.ownerDocument.createElement(tagName);
    element.className = className;
    element.textContent = text;
    return element;
  }

  #getLevelText(upgrade) {
    return `Stufe ${upgrade.nextLevel} von ${upgrade.maxLevel}`;
  }

  #getUpgradeLabel(upgrade) {
    return `${upgrade.name}. ${this.#getLevelText(upgrade)}. ${upgrade.description}`;
  }

  /**
   * Gibt den Fokus nach dem Dialog an dessen Öffner zurück.
   */
  restorePreviousFocus() {
    if (this.previousFocus instanceof HTMLElement) this.previousFocus.focus();
    this.previousFocus = null;
  }
}
