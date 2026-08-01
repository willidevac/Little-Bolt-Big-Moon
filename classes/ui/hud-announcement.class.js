import { onLanguageChange, translate } from "../../js/i18n/localization.js";

const PICKUP_DURATION_MILLISECONDS = 2400;
const BOSS_DURATION_MILLISECONDS = 3200;
const PATH_DURATION_MILLISECONDS = 3600;
const PICKUP_TYPES = Object.freeze([
  "gear", "energy", "ammo", "arcCharge", "storyBadge",
]);

/** Zeigt wichtige Spielmeldungen kurz und barrierefrei über der Welt an. */
export class HudAnnouncement {
  /** @param {HTMLElement} element */
  constructor(element) {
    if (!element?.classList) throw new TypeError("Die HUD-Mitteilung fehlt.");
    this.element = element;
    this.timeoutId = null;
    this.activePriority = 0;
    this.currentMessage = null;
    this.unsubscribeLanguage = onLanguageChange(() => this.#renderCurrent());
  }

  /** Zeigt genau eine verständliche Meldung für einen neuen Fund. */
  showPickup(pickup) {
    const priority = pickup?.type === "weapon" ? 2 : 1;
    return this.#show(
      { kind: "pickup", pickup }, priority, PICKUP_DURATION_MILLISECONDS,
    );
  }

  /** Kündigt einen Boss mit seinem übersetzbaren Namen an. */
  showBoss(nameKey) {
    if (typeof nameKey !== "string" || !nameKey) {
      throw new TypeError("Der Bossname für die HUD-Mitteilung fehlt.");
    }
    return this.#show(
      { kind: "boss", nameKey }, 3, BOSS_DURATION_MILLISECONDS,
    );
  }

  /** Meldet einen nach dem Bosskampf freigegebenen Aufstieg. */
  showPathOpened() {
    return this.#show({ kind: "path" }, 4, PATH_DURATION_MILLISECONDS);
  }

  /** Leert Meldung und Zeitsteuerung vollständig. */
  clear() {
    clearTimeout(this.timeoutId);
    this.timeoutId = null;
    this.activePriority = 0;
    this.currentMessage = null;
    this.element.classList.remove("is-visible");
    delete this.element.dataset.kind;
    this.element.textContent = "";
  }

  /** Stoppt eine noch wartende Meldung. */
  destroy() {
    this.clear();
    this.unsubscribeLanguage();
  }

  #show(message, priority, duration) {
    if (priority < this.activePriority) return false;
    this.activePriority = priority;
    this.currentMessage = Object.freeze(message);
    this.element.dataset.kind = message.kind;
    this.#renderCurrent();
    this.#restartAnimation();
    clearTimeout(this.timeoutId);
    this.timeoutId = setTimeout(() => this.clear(), duration);
    return true;
  }

  #restartAnimation() {
    this.element.classList.remove("is-visible");
    void this.element.offsetWidth;
    this.element.classList.add("is-visible");
  }

  #renderCurrent() {
    if (!this.currentMessage) return;
    this.element.textContent = this.#getMessage(this.currentMessage);
  }

  #getMessage(message) {
    if (message.kind === "boss") return this.#getBossMessage(message.nameKey);
    if (message.kind === "path") return translate("combat.pathOpened");
    return this.#getPickupMessage(message.pickup);
  }

  #getBossMessage(nameKey) {
    return translate("combat.bossStarted", { name: translate(nameKey) });
  }

  #getPickupMessage(pickup) {
    if (pickup?.type === "weapon") return translate("pickup.weapon");
    const key = `pickup.${pickup?.type}`;
    if (PICKUP_TYPES.includes(pickup?.type) && Number.isFinite(pickup?.amount)) {
      return translate(key, { amount: pickup.amount });
    }
    return translate("pickup.default");
  }
}
