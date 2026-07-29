import { onLanguageChange, translate } from "../../js/i18n/localization.js";

const FEEDBACK_DURATION_MILLISECONDS = 2400;
const PICKUP_TYPES = Object.freeze(["gear", "energy", "ammo", "arcCharge"]);

/** Zeigt einen Fund kurz und barrierefrei über der Spielwelt an. */
export class PickupFeedback {
  /** @param {HTMLElement} element */
  constructor(element) {
    if (!element?.classList) {
      throw new TypeError("Die Pickup-Anzeige fehlt.");
    }
    this.element = element;
    this.timeoutId = null;
    this.activePriority = 0;
    this.currentPickup = null;
    this.unsubscribeLanguage = onLanguageChange(() => this.#renderCurrent());
  }

  /** Zeigt genau eine verständliche Meldung für einen neuen Fund. */
  show(pickup) {
    const priority = pickup?.type === "weapon" ? 2 : 1;
    if (priority < this.activePriority) return false;
    this.activePriority = priority;
    this.currentPickup = pickup;
    this.element.textContent = this.#getMessage(pickup);
    this.element.classList.remove("is-visible");
    void this.element.offsetWidth;
    this.element.classList.add("is-visible");
    clearTimeout(this.timeoutId);
    this.timeoutId = setTimeout(() => this.clear(), FEEDBACK_DURATION_MILLISECONDS);
    return true;
  }

  /** Leert Meldung und Zeitsteuerung vollständig. */
  clear() {
    clearTimeout(this.timeoutId);
    this.timeoutId = null;
    this.activePriority = 0;
    this.currentPickup = null;
    this.element.classList.remove("is-visible");
    this.element.textContent = "";
  }

  /** Stoppt eine noch wartende Meldung. */
  destroy() {
    this.clear();
    this.unsubscribeLanguage();
  }

  #getMessage(pickup) {
    if (pickup?.type === "weapon") return translate("pickup.weapon");
    const key = `pickup.${pickup?.type}`;
    if (PICKUP_TYPES.includes(pickup?.type) && Number.isFinite(pickup?.amount)) {
      return translate(key, { amount: pickup.amount });
    }
    return translate("pickup.default");
  }

  #renderCurrent() {
    if (this.currentPickup) {
      this.element.textContent = this.#getMessage(this.currentPickup);
    }
  }
}
