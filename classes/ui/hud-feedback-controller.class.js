import { GAMEPLAY_EVENTS } from "../core/gameplay-event-hub.class.js";
import { getBossTranslationKey } from "../../js/config/boss-translation-keys.js";
import { translate } from "../../js/i18n/localization.js";
import { FallFeedback } from "./fall-feedback.class.js";
import { HudAnnouncement } from "./hud-announcement.class.js";

function setText(element, value) {
  const text = String(value);
  if (element.textContent !== text) element.textContent = text;
}

/** Bündelt alle kurzen und vorübergehenden Rückmeldungen des HUDs. */
export class HudFeedbackController {
  /** @param {Readonly<Record<string, HTMLElement>>} elements @param {number} pixelsPerMeter */
  constructor(elements, pixelsPerMeter) {
    this.elements = elements;
    this.announcement = new HudAnnouncement(elements.announcement);
    this.fallFeedback = new FallFeedback(elements.fallFeedback, pixelsPerMeter);
  }

  /** Verbindet ein Gameplay-Ereignis mit seiner kurzen HUD-Rückmeldung. */
  handle(event) {
    if (this.#handleAnnouncement(event)) return;
    if (event.type === GAMEPLAY_EVENTS.PLAYER_FALL) {
      this.fallFeedback.show(event.detail);
    }
    if (event.type === GAMEPLAY_EVENTS.PLAYER_JUMP_CHARGE) {
      this.#renderJumpCharge(event.detail);
    }
  }

  /** Stoppt laufende Meldungen und entfernt ihre Sprachbeobachter. */
  destroy() {
    this.announcement.destroy();
    this.fallFeedback.destroy();
  }

  #handleAnnouncement(event) {
    if (event.type === GAMEPLAY_EVENTS.PICKUP) {
      this.announcement.showPickup(event.detail);
      return true;
    }
    if (event.type === GAMEPLAY_EVENTS.BOSS_ACTIVATED) {
      this.announcement.showBoss(getBossTranslationKey(event.detail.name));
      return true;
    }
    return this.#handlePathOpened(event);
  }

  #handlePathOpened(event) {
    const pathOpened = event.type === GAMEPLAY_EVENTS.WAVE_COMPLETE &&
      event.detail.unlockPlatformId;
    if (!pathOpened) return false;
    this.announcement.showPathOpened();
    return true;
  }

  #renderJumpCharge(charge) {
    const percent = Math.max(0, Math.min(100, charge.percent));
    this.elements.jumpCharge.hidden = !charge.isCharging;
    this.elements.jumpChargeBar.style.setProperty(
      "--jump-charge-percent", `${percent}%`,
    );
    this.elements.jumpChargeBar.setAttribute("aria-valuenow", String(percent));
    this.#renderJumpChargeText(percent);
  }

  #renderJumpChargeText(percent) {
    this.elements.jumpChargeBar.setAttribute(
      "aria-valuetext",
      translate("value.percent", { value: percent }),
    );
    setText(this.elements.jumpChargeValue, `${percent}%`);
  }
}
