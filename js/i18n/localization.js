import { LOCALIZATION_CONFIG } from "../config/localization-config.js";
import { TRANSLATION_CATALOG } from "./translation-catalog.js";

let currentLanguage = LOCALIZATION_CONFIG.defaultLanguage;
const listeners = new Set();

/**
 * Returns the currently active language.
 * @returns {string}
 */
export function getLanguage() {
  return currentLanguage;
}

/**
 * Switches to a supported language.
 * @param {string} language
 * @returns {boolean}
 */
export function setLanguage(language) {
  if (!LOCALIZATION_CONFIG.languages.includes(language)) return false;
  if (language === currentLanguage) return true;
  currentLanguage = language;
  listeners.forEach((listener) => listener(language));
  return true;
}

/**
 * Translates a key and substitutes named placeholders.
 * @param {string} key
 * @param {Readonly<Record<string, string|number>>} [values]
 * @returns {string}
 */
export function translate(key, values = {}) {
  const catalog = TRANSLATION_CATALOG[currentLanguage];
  const template = catalog[key] ?? TRANSLATION_CATALOG.de[key] ?? key;
  return Object.entries(values).reduce((text, [name, value]) => {
    return text.replaceAll(`{${name}}`, String(value));
  }, template);
}

/**
 * Observes language changes and returns an unsubscribe function.
 * @param {(language:string) => void} listener
 * @returns {() => void}
 */
export function onLanguageChange(listener) {
  if (typeof listener !== "function") {
    throw new TypeError("Der Sprachbeobachter muss eine Funktion sein.");
  }
  listeners.add(listener);
  return () => listeners.delete(listener);
}
