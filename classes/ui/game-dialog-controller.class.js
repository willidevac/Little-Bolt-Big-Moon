const DIALOG_SELECTOR = "[data-game-dialog]";
const DIALOG_FOCUS_SELECTOR = "[data-dialog-focus]";
const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), input:not([disabled])';

/**
 * Manages modal game dialogs, including focus trapping and an inert background.
 */
export class GameDialogController {
  /**
   * @param {HTMLElement} root
   * @param {ReadonlyArray<HTMLElement>} backgroundElements
   */
  constructor(root, backgroundElements) {
    this.#validateDependencies(root, backgroundElements);
    this.root = root;
    this.backgroundElements = backgroundElements;
    this.dialogs = [...root.querySelectorAll(DIALOG_SELECTOR)];
    this.activeDialog = null;
    this.previousFocus = null;
  }

  /**
   * Handles Escape and Tab for an open dialog.
   * @param {KeyboardEvent} event
   */
  handleKeydown(event) {
    if (!this.activeDialog) return;
    if (event.code === "Escape") this.#closeFromKey(event);
    if (event.code === "Tab") this.#trapFocus(event);
  }

  /**
   * Checks whether the dimmed dialog backdrop was clicked directly.
   * @param {EventTarget|null} target
   * @returns {boolean}
   */
  isBackdrop(target) {
    return target instanceof Element && target.matches(DIALOG_SELECTOR);
  }

  /**
   * Opens a named dialog and focuses its heading.
   * @param {string} name
   */
  open(name) {
    if (this.activeDialog) return;
    const dialog = this.#getDialog(name);
    this.previousFocus = this.root.ownerDocument.activeElement;
    this.#setBackgroundInert(true);
    this.activeDialog = dialog;
    dialog.hidden = false;
    this.#getDialogFocus(dialog).focus();
  }

  /**
   * Closes the dialog and restores focus to its origin.
   * @param {boolean} [restoreFocus=true]
   */
  close(restoreFocus = true) {
    if (!this.activeDialog) return;
    this.activeDialog.hidden = true;
    this.activeDialog = null;
    this.#setBackgroundInert(false);
    if (restoreFocus) this.#restorePreviousFocus();
  }

  #closeFromKey(event) {
    event.preventDefault();
    event.stopPropagation();
    this.close();
  }

  #getDialog(name) {
    const dialog = this.dialogs.find((element) => {
      return element instanceof HTMLElement && element.dataset.gameDialog === name;
    });
    if (dialog instanceof HTMLElement) return dialog;
    throw new Error(`Dialog nicht gefunden: ${name}`);
  }

  #trapFocus(event) {
    const focusable = [...this.activeDialog.querySelectorAll(FOCUSABLE_SELECTOR)];
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable.at(-1);
    const active = this.root.ownerDocument.activeElement;
    if (event.shiftKey && active === first) this.#moveFocus(event, last);
    if (!event.shiftKey && active === last) this.#moveFocus(event, first);
  }

  #moveFocus(event, target) {
    if (!(target instanceof HTMLElement)) return;
    event.preventDefault();
    target.focus();
  }

  #setBackgroundInert(isInert) {
    this.backgroundElements.forEach((element) => {
      element.inert = isInert;
    });
  }

  #restorePreviousFocus() {
    if (this.previousFocus instanceof HTMLElement) this.previousFocus.focus();
    this.previousFocus = null;
  }

  #getDialogFocus(dialog) {
    const element = dialog.querySelector(DIALOG_FOCUS_SELECTOR);
    if (element instanceof HTMLElement) return element;
    throw new Error(`UI-Element nicht gefunden: ${DIALOG_FOCUS_SELECTOR}`);
  }

  #validateDependencies(root, backgroundElements) {
    const hasRoot = root instanceof HTMLElement;
    const hasBackgrounds = Array.isArray(backgroundElements) &&
      backgroundElements.every((element) => element instanceof HTMLElement);
    if (hasRoot && hasBackgrounds) return;
    throw new TypeError("Die Dialogsteuerung benötigt gültige DOM-Elemente.");
  }
}
