import { onLanguageChange, translate } from "../../js/i18n/localization.js";

const FEEDBACK_DURATION_MILLISECONDS = 2800;
const SEVERITIES = Object.freeze(["normal", "hard", "severe"]);

/** Zeigt einen abgeschlossenen Sturz kurz und barrierefrei an. */
export class FallFeedback {
  /** @param {HTMLElement} element @param {number} pixelsPerMeter */
  constructor(element, pixelsPerMeter) {
    if (!element?.classList) throw new TypeError("Die Sturzanzeige fehlt.");
    if (!Number.isFinite(pixelsPerMeter) || pixelsPerMeter <= 0) {
      throw new TypeError("Der Metermaßstab der Sturzanzeige ist ungültig.");
    }
    this.element = element;
    this.pixelsPerMeter = pixelsPerMeter;
    this.timeoutId = null;
    this.currentFall = null;
    this.unsubscribeLanguage = onLanguageChange(() => this.#renderCurrent());
  }

  /** Zeigt die verlorene Höhe mit passender Stärke an. */
  show(fall) {
    this.#validateFall(fall);
    this.currentFall = this.#createVisibleFall(fall);
    this.element.dataset.severity = fall.severity;
    this.#renderCurrent();
    this.element.classList.remove("is-visible");
    void this.element.offsetWidth;
    this.element.classList.add("is-visible");
    clearTimeout(this.timeoutId);
    this.timeoutId = setTimeout(() => this.clear(), FEEDBACK_DURATION_MILLISECONDS);
  }

  /** Leert Meldung und Zeitsteuerung vollständig. */
  clear() {
    clearTimeout(this.timeoutId);
    this.timeoutId = null;
    this.currentFall = null;
    this.element.classList.remove("is-visible");
    delete this.element.dataset.severity;
    this.element.textContent = "";
  }

  /** Stoppt eine noch wartende Meldung. */
  destroy() {
    this.clear();
    this.unsubscribeLanguage();
  }

  #renderCurrent() {
    if (!this.currentFall) return;
    const key = `fall.${this.currentFall.severity}`;
    this.element.textContent = translate(key, { meters: this.currentFall.meters });
  }

  #createVisibleFall(fall) {
    return Object.freeze({
      ...fall,
      meters: Math.round(fall.lossPixels / this.pixelsPerMeter),
    });
  }

  #validateFall(fall) {
    const hasLoss = Number.isFinite(fall?.lossPixels) && fall.lossPixels > 0;
    if (hasLoss && SEVERITIES.includes(fall?.severity)) return;
    throw new TypeError("Die Sturzmeldung ist ungültig.");
  }
}
