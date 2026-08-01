import { onLanguageChange, translate } from "../../js/i18n/localization.js";

/** Hält Browser-Vollbild und sichtbaren Schalter synchron. */
export class FullscreenController {
  /** @param {Document} documentTarget @param {HTMLElement} root @param {HTMLElement} button */
  constructor(documentTarget, root, button) {
    this.document = documentTarget;
    this.root = root;
    this.button = button;
    this.isSupported = this.#supportsFullscreen();
    this.boundToggle = () => void this.toggle();
    this.boundRender = () => this.render();
    this.unsubscribeLanguage = null;
  }

  /** Bindet den Schalter oder blendet ihn bei fehlender Unterstützung aus. */
  initialize() {
    this.button.hidden = !this.isSupported;
    if (!this.isSupported) return this;
    this.button.addEventListener("click", this.boundToggle);
    this.document.addEventListener("fullscreenchange", this.boundRender);
    this.unsubscribeLanguage = onLanguageChange(this.boundRender);
    this.render();
    return this;
  }

  /** Betritt oder verlässt Vollbild nach einer echten Nutzeraktion. */
  async toggle() {
    try {
      if (this.document.fullscreenElement) await this.document.exitFullscreen();
      else await this.root.requestFullscreen();
      return true;
    } catch {
      this.render();
      return false;
    }
  }

  /** Zeigt jederzeit den echten Zustand des Browsers an. */
  render() {
    const isActive = this.document.fullscreenElement === this.root;
    const key = isActive ? "fullscreen.exit" : "fullscreen.enter";
    this.button.textContent = translate(key);
    this.button.setAttribute("aria-label", translate(key));
    this.button.setAttribute("aria-pressed", String(isActive));
  }

  /** Entfernt alle gesetzten Beobachter. */
  destroy() {
    this.button.removeEventListener("click", this.boundToggle);
    this.document.removeEventListener("fullscreenchange", this.boundRender);
    this.unsubscribeLanguage?.();
    this.unsubscribeLanguage = null;
  }

  #supportsFullscreen() {
    return typeof this.root?.requestFullscreen === "function" &&
      typeof this.document?.exitFullscreen === "function";
  }
}
