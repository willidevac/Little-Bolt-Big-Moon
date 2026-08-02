import { GAMEPLAY_EVENTS } from "../core/gameplay-event-hub.class.js";
import { getBossTranslationKey } from "../../js/config/boss-translation-keys.js";
import { translate } from "../../js/i18n/localization.js";
import { FallFeedback } from "./fall-feedback.class.js";
import { HudAnnouncement } from "./hud-announcement.class.js";

function setText(element, value) {
  const text = String(value);
  if (element.textContent !== text) element.textContent = text;
}

/** Groups all short-lived HUD feedback. */
export class HudFeedbackController {
  /** @param {Readonly<Record<string, HTMLElement>>} elements HUD elements. @param {number} pixelsPerMeter World scale. */
  constructor(elements, pixelsPerMeter) {
    this.elements = elements;
    this.announcement = new HudAnnouncement(elements.announcement);
    this.fallFeedback = new FallFeedback(elements.fallFeedback, pixelsPerMeter);
  }

  /** Connects a gameplay event to its brief HUD feedback. */
  handle(event) {
    if (this.#handleAnnouncement(event)) return;
    if (event.type === GAMEPLAY_EVENTS.PLAYER_FALL) {
      this.fallFeedback.show(event.detail);
    }
    if (event.type === GAMEPLAY_EVENTS.PLAYER_JUMP_CHARGE) {
      this.#renderJumpCharge(event.detail);
    }
  }

  /** Stops active messages and removes their language observers. */
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
