import {
  getLanguage,
  onLanguageChange,
  setLanguage,
  translate,
} from "../../js/i18n/localization.js";

const LANGUAGE_SELECTOR = "[data-language-control]";
const TEXT_SELECTOR = "[data-i18n]";
const LABEL_SELECTOR = "[data-i18n-aria-label]";

/**
 * Translates static text and connects language selection to storage.
 */
export class LocalizationController {
  /**
   * @param {import("../systems/game-storage.class.js").GameStorage} storage
   * @param {HTMLElement} root
   */
  constructor(storage, root) {
    this.storage = storage;
    this.root = root;
    this.documentElement = root.ownerDocument.documentElement;
    this.control = this.#getControl();
    this.unsubscribe = null;
    this.boundChange = this.handleChange.bind(this);
  }

  /**
   * Loads, translates, and binds the language exactly once.
   * @returns {LocalizationController}
   */
  initialize() {
    if (this.unsubscribe) return this;
    this.control.addEventListener("change", this.boundChange);
    this.unsubscribe = onLanguageChange(() => this.render());
    setLanguage(this.storage.getSnapshot().language);
    this.render();
    return this;
  }

  /** Removes selection and language observers. */
  destroy() {
    this.control.removeEventListener("change", this.boundChange);
    this.unsubscribe?.();
    this.unsubscribe = null;
  }

  /** Stores a newly selected supported language. */
  handleChange() {
    const records = this.storage.setLanguage(this.control.value);
    setLanguage(records.language);
    this.render();
  }

  /** Translates all marked static elements. */
  render() {
    const language = getLanguage();
    this.documentElement.lang = language;
    this.control.value = language;
    this.root.querySelectorAll(TEXT_SELECTOR).forEach((element) => {
      element.textContent = translate(element.dataset.i18n);
    });
    this.root.querySelectorAll(LABEL_SELECTOR).forEach((element) => {
      element.setAttribute("aria-label", translate(element.dataset.i18nAriaLabel));
    });
  }

  #getControl() {
    const control = this.root.querySelector(LANGUAGE_SELECTOR);
    if (control instanceof HTMLSelectElement) return control;
    throw new Error("Die Sprachauswahl wurde nicht gefunden.");
  }
}
