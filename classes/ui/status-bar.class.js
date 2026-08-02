import { GAME_STATES } from "../core/game-state-machine.class.js";
import { GAMEPLAY_EVENTS } from "../core/gameplay-event-hub.class.js";
import { HudFeedbackController } from "./hud-feedback-controller.class.js";
import { getBossTranslationKey } from "../../js/config/boss-translation-keys.js";
import { formatScore } from "../../js/utils/format.js";
import { onLanguageChange, translate } from "../../js/i18n/localization.js";

const VALUE_SELECTORS = Object.freeze({
  energy: '[data-hud-value="energy"]',
  ammo: '[data-hud-value="ammo"]',
  arcCharges: '[data-hud-value="arcCharges"]',
  gears: '[data-hud-value="gears"]',
  heightMeters: '[data-hud-value="height"]',
  score: '[data-hud-value="score"]',
  combo: "[data-hud-combo]",
  comboValue: "[data-hud-combo-value]",
  weapon: '[data-hud-value="weapon"]',
  announcement: "[data-hud-announcement]",
  fallFeedback: "[data-hud-fall-feedback]",
  jumpCharge: "[data-hud-jump-charge]",
  jumpChargeBar: "[data-hud-jump-charge-bar]",
  jumpChargeValue: "[data-hud-jump-charge-value]",
  energyBar: "[data-hud-energy-bar]",
  boss: "[data-hud-boss]",
  bossName: "[data-hud-boss-name]",
  bossHealth: "[data-hud-boss-health]",
  bossPhase: "[data-hud-boss-phase]",
  bossBar: "[data-hud-boss-bar]",
});

/**
 * Returns a required HUD element or fails with a clear error.
 * @param {ParentNode} root
 * @param {string} selector
 * @returns {HTMLElement}
 */
function getRequiredElement(root, selector) {
  const element = root.querySelector(selector);
  if (element instanceof HTMLElement) return element;
  throw new Error(`HUD-Element nicht gefunden: ${selector}`);
}

function renderBossValues(statusBar, boss, bossName) {
  statusBar.setText(statusBar.elements.bossName, bossName);
  statusBar.setText(
    statusBar.elements.bossHealth,
    `${boss.health} / ${boss.maximumHealth}`,
  );
  statusBar.setText(statusBar.elements.bossPhase, boss.phase);
}

function renderBossBar(statusBar, boss, bossName) {
  const bar = statusBar.elements.bossBar;
  const percentage = Math.round((boss.health / boss.maximumHealth) * 100);
  bar.style.setProperty("--boss-health-percent", `${percentage}%`);
  bar.setAttribute("aria-label", translate("hud.bossHealth", { name: bossName }));
  bar.setAttribute("aria-valuenow", String(boss.health));
  bar.setAttribute("aria-valuemax", String(boss.maximumHealth));
  bar.setAttribute("aria-valuetext", translate(
    "value.of", { value: boss.health, maximum: boss.maximumHealth },
  ));
}

function renderWeaponValue(statusBar, weapon) {
  statusBar.currentWeapon = weapon;
  statusBar.setText(
    statusBar.elements.weapon,
    translate(`weapon.${weapon.id}`),
  );
}

/**
 * Transfers run values into the accessible HTML HUD.
 */
export class StatusBar {
  /**
   * @param {import("../core/game.class.js").Game} game
   * @param {HTMLElement} root
   */
  constructor(game, root) {
    this.game = game;
    this.root = root;
    this.elements = this.getValueElements();
    this.unsubscribeHud = null;
    this.unsubscribeState = null;
    this.unsubscribeGameplay = null;
    this.unsubscribeLanguage = null;
    this.currentWeapon = null;
    const pixelsPerMeter = this.game.config.hud.heightPixelsPerMeter;
    this.feedback = new HudFeedbackController(this.elements, pixelsPerMeter);
  }

  /**
   * Binds values and visibility at most once.
   * @returns {StatusBar}
   */
  initialize() {
    if (this.unsubscribeHud) return this;
    this.unsubscribeHud = this.game.onHudChange((data) => this.render(data));
    this.unsubscribeState = this.game.onStateChange((state) => this.renderState(state));
    this.unsubscribeGameplay = this.game.onGameplayEvent((event) => {
      this.handleGameplayEvent(event);
    });
    this.unsubscribeLanguage = onLanguageChange(() => this.renderLanguage());
    this.render(this.game.getHudSnapshot());
    this.renderWeapon(this.game.weaponSystem.getCurrentWeapon());
    this.renderState(this.game.state);
    return this;
  }

  /**
   * Removes all observers registered by the HUD.
   */
  destroy() {
    this.unsubscribeHud?.();
    this.unsubscribeState?.();
    this.unsubscribeGameplay?.();
    this.unsubscribeLanguage?.();
    this.feedback.destroy();
    this.unsubscribeHud = null;
    this.unsubscribeState = null;
    this.unsubscribeGameplay = null;
    this.unsubscribeLanguage = null;
  }

  /**
   * Displays a new snapshot.
   * @param {Readonly<object>} data
   */
  render(data) {
    this.renderEnergy(data.energy, data.maximumEnergy);
    this.setText(this.elements.ammo, data.ammo);
    this.setText(this.elements.arcCharges, data.arcCharges);
    this.setText(this.elements.gears, data.gears);
    this.setText(this.elements.heightMeters, data.heightMeters);
    this.setText(this.elements.score, formatScore(data.score));
    this.renderCombo(data.combo);
    this.renderBoss(data.boss);
  }

  /**
   * Displays the count and multiplier only during an active chain.
   * @param {Readonly<object>} combo
   */
  renderCombo(combo) {
    this.elements.combo.hidden = !combo.isActive;
    if (!combo.isActive) return;
    this.setText(this.elements.comboValue, `${combo.count} ×${combo.multiplier}`);
    this.elements.comboValue.setAttribute(
      "aria-label",
      translate("hud.comboStatus", combo),
    );
  }

  /** Connects gameplay events to HUD values and brief messages. */
  handleGameplayEvent(event) {
    if (event.type === GAMEPLAY_EVENTS.WEAPON_CHANGED) {
      renderWeaponValue(this, event.detail);
      return;
    }
    this.feedback.handle(event);
  }

  /**
   * Displays the HUD only during gameplay and pause.
   * @param {string} state
   */
  renderState(state) {
    const isPlaying = state === GAME_STATES.PLAYING;
    const isVisible = isPlaying ||
      state === GAME_STATES.PAUSED ||
      state === GAME_STATES.UPGRADING;
    this.root.hidden = !isVisible;
    this.root.inert = !isPlaying;
    this.root.setAttribute("aria-hidden", String(!isPlaying));
  }

  /**
   * Collects all value elements needed once.
   * @returns {Readonly<Record<string, HTMLElement>>}
   */
  getValueElements() {
    return Object.freeze(Object.fromEntries(
      Object.entries(VALUE_SELECTORS).map(([name, selector]) => {
        return [name, getRequiredElement(this.root, selector)];
      }),
    ));
  }

  /**
   * Updates energy text, bar, and screen-reader values together.
   * @param {number} energy
   * @param {number} maximumEnergy
   */
  renderEnergy(energy, maximumEnergy) {
    const percentage = Math.round((energy / maximumEnergy) * 100);
    this.setText(this.elements.energy, energy);
    this.elements.energyBar.style.setProperty("--energy-percent", `${percentage}%`);
    this.elements.energyBar.setAttribute("aria-valuenow", String(energy));
    this.elements.energyBar.setAttribute("aria-valuemax", String(maximumEnergy));
    this.elements.energyBar.setAttribute(
      "aria-valuetext",
      translate("value.of", { value: energy, maximum: maximumEnergy }),
    );
  }

  /**
   * Displays the active biome boss with its name and exact health.
   * @param {Readonly<object>|null} boss
   */
  renderBoss(boss) {
    const isVisible = Boolean(boss?.isVisible);
    this.elements.boss.hidden = !isVisible;
    if (!isVisible) return;
    const bossName = translate(getBossTranslationKey(boss.name));
    renderBossValues(this, boss, bossName);
    renderBossBar(this, boss, bossName);
  }

  /** Retranslates immutable HUD values after a language change. */
  renderLanguage() {
    this.render(this.game.getHudSnapshot());
    if (this.currentWeapon) this.renderWeapon(this.currentWeapon);
  }

  /** Displays the active weapon using its stable ID. */
  renderWeapon(weapon) {
    renderWeaponValue(this, weapon);
  }

  /**
   * Changes DOM text only when the value actually changes.
   * @param {HTMLElement} element
   * @param {string|number} value
   */
  setText(element, value) {
    const text = String(value);
    if (element.textContent !== text) element.textContent = text;
  }
}
