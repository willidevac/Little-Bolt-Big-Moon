import { onLanguageChange, translate } from "../../js/i18n/localization.js";

const PICKUP_DURATION_MILLISECONDS = 2400;
const BOSS_DURATION_MILLISECONDS = 3200;
const PATH_DURATION_MILLISECONDS = 3600;
const BIOME_DURATION_MILLISECONDS = 4200;
const PICKUP_TYPES = Object.freeze([
  "gear", "energy", "arcCharge", "storyBadge",
]);

/** Briefly displays important gameplay messages above the world accessibly. */
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

  /** Displays exactly one clear message for a new pickup. */
  showPickup(pickup) {
    const priority = pickup?.type === "weapon" ? 2 : 1;
    return this.#show(
      { kind: "pickup", pickup }, priority, PICKUP_DURATION_MILLISECONDS,
    );
  }

  /** Announces a boss using its translatable name. */
  showBoss(nameKey) {
    if (typeof nameKey !== "string" || !nameKey) {
      throw new TypeError("Der Bossname für die HUD-Mitteilung fehlt.");
    }
    return this.#show(
      { kind: "boss", nameKey }, 3, BOSS_DURATION_MILLISECONDS,
    );
  }

  /** Announces a path upward unlocked after a boss fight. */
  showPathOpened() {
    return this.#show({ kind: "path" }, 4, PATH_DURATION_MILLISECONDS);
  }

  /** Announces the newly reached biome after an intermediate boss. */
  showBiomeReached(nameKey) {
    if (typeof nameKey !== "string" || !nameKey) {
      throw new TypeError("The biome name for the HUD announcement is missing.");
    }
    return this.#show(
      { kind: "biome", nameKey }, 4, BIOME_DURATION_MILLISECONDS,
    );
  }

  /** Completely clears the message and its timer. */
  clear() {
    clearTimeout(this.timeoutId);
    this.timeoutId = null;
    this.activePriority = 0;
    this.currentMessage = null;
    this.element.classList.remove("is-visible");
    delete this.element.dataset.kind;
    this.element.textContent = "";
  }

  /** Stops a pending message. */
  destroy() {
    this.clear();
    this.unsubscribeLanguage();
  }

  /** Performs the show operation. */
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

  /** Performs the restart animation operation. */
  #restartAnimation() {
    this.element.classList.remove("is-visible");
    void this.element.offsetWidth;
    this.element.classList.add("is-visible");
  }

  /** Draws render current. */
  #renderCurrent() {
    if (!this.currentMessage) return;
    this.element.textContent = this.#getMessage(this.currentMessage);
  }

  /** Returns message. */
  #getMessage(message) {
    if (message.kind === "boss") return this.#getBossMessage(message.nameKey);
    if (message.kind === "biome") {
      return translate("combat.biomeReached", {
        biome: translate(message.nameKey),
      });
    }
    if (message.kind === "path") return translate("combat.pathOpened");
    return this.#getPickupMessage(message.pickup);
  }

  /** Returns boss message. */
  #getBossMessage(nameKey) {
    return translate("combat.bossStarted", { name: translate(nameKey) });
  }

  /** Returns pickup message. */
  #getPickupMessage(pickup) {
    if (pickup?.type === "weapon") return translate("pickup.weapon");
    const key = `pickup.${pickup?.type}`;
    if (PICKUP_TYPES.includes(pickup?.type) && Number.isFinite(pickup?.amount)) {
      return translate(key, { amount: pickup.amount });
    }
    return translate("pickup.default");
  }
}
