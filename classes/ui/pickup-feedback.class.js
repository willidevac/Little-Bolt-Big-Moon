const PICKUP_LABELS = Object.freeze({
  gear: "Zahnrad",
  energy: "Energie",
  ammo: "Munition",
});
const FEEDBACK_DURATION_MILLISECONDS = 2400;

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
  }

  /** Zeigt genau eine verständliche Meldung für einen neuen Fund. */
  show(pickup) {
    const priority = pickup?.type === "weapon" ? 2 : 1;
    if (priority < this.activePriority) return false;
    this.activePriority = priority;
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
    this.element.classList.remove("is-visible");
    this.element.textContent = "";
  }

  /** Stoppt eine noch wartende Meldung. */
  destroy() {
    this.clear();
  }

  #getMessage(pickup) {
    if (pickup?.type === "weapon") return "Neue Waffe freigeschaltet!";
    const label = PICKUP_LABELS[pickup?.type];
    if (label && Number.isFinite(pickup?.amount)) {
      return `${label} +${pickup.amount}`;
    }
    return "Fund eingesammelt";
  }
}
