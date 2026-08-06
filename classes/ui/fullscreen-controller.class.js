import { onLanguageChange, translate } from "../../js/i18n/localization.js";

/** Keeps browser fullscreen state and the visible toggle synchronized. */
export class FullscreenController {
  /**
   * Creates the configured instance.
   * @param {Document} documentTarget Browser document.
   * @param {HTMLElement} root Game root.
   * @param {HTMLElement} button Toggle button.
   */
  constructor(documentTarget, root, button) {
    this.document = documentTarget;
    this.root = root;
    this.button = button;
    this.isSupported = this.#supportsFullscreen();
    this.boundToggle = () => void this.toggle();
    this.boundRender = () => this.render();
    this.unsubscribeLanguage = null;
  }

  /** Binds the toggle or hides it when fullscreen is unsupported. */
  initialize() {
    this.button.hidden = !this.isSupported;
    if (!this.isSupported) return this;
    this.button.addEventListener("click", this.boundToggle);
    this.document.addEventListener("fullscreenchange", this.boundRender);
    this.unsubscribeLanguage = onLanguageChange(this.boundRender);
    this.render();
    return this;
  }

  /** Enters or exits fullscreen after a genuine user action. */
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

  /** Displays the browser's actual state at all times. */
  render() {
    const isActive = this.document.fullscreenElement === this.root;
    const key = isActive ? "fullscreen.exit" : "fullscreen.enter";
    this.button.textContent = translate(key);
    this.button.setAttribute("aria-label", translate(key));
    this.button.setAttribute("aria-pressed", String(isActive));
  }

  /** Removes all registered observers. */
  destroy() {
    this.button.removeEventListener("click", this.boundToggle);
    this.document.removeEventListener("fullscreenchange", this.boundRender);
    this.unsubscribeLanguage?.();
    this.unsubscribeLanguage = null;
  }

  /** Performs the supports fullscreen operation. */
  #supportsFullscreen() {
    return typeof this.root?.requestFullscreen === "function" &&
      typeof this.document?.exitFullscreen === "function";
  }
}
