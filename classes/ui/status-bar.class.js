import { GAME_STATES } from "../core/game-state-machine.class.js";
import { GAMEPLAY_EVENTS } from "../core/gameplay-event-hub.class.js";
import { PickupFeedback } from "./pickup-feedback.class.js";
import { formatScore } from "../../js/utils/format.js";
import { onLanguageChange, translate } from "../../js/i18n/localization.js";

const BOSS_KEYS = Object.freeze({
  Zwischenboss: "boss.default",
  Schrottbrecher: "boss.scrapCrusher",
  "Presswerk-Koloss": "boss.pressworksColossus",
  "Startturm-Sentinel": "boss.launchTowerSentinel",
  "Orbit-Hüter": "boss.orbitGuardian",
  Mondwächter: "boss.moonWarden",
});

const VALUE_SELECTORS = Object.freeze({
  energy: '[data-hud-value="energy"]',
  ammo: '[data-hud-value="ammo"]',
  gears: '[data-hud-value="gears"]',
  heightMeters: '[data-hud-value="height"]',
  score: '[data-hud-value="score"]',
  weapon: '[data-hud-value="weapon"]',
  pickupFeedback: "[data-hud-pickup-feedback]",
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
 * Liefert ein benötigtes HUD-Element oder bricht verständlich ab.
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
 * Überträgt Laufwerte in das barrierefreie HTML-HUD.
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
    this.pickupFeedback = new PickupFeedback(this.elements.pickupFeedback);
  }

  /**
   * Bindet Werte und Sichtbarkeit höchstens einmal.
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
   * Entfernt alle vom HUD registrierten Beobachter.
   */
  destroy() {
    this.unsubscribeHud?.();
    this.unsubscribeState?.();
    this.unsubscribeGameplay?.();
    this.unsubscribeLanguage?.();
    this.pickupFeedback.destroy();
    this.unsubscribeHud = null;
    this.unsubscribeState = null;
    this.unsubscribeGameplay = null;
    this.unsubscribeLanguage = null;
  }

  /**
   * Zeigt eine neue Momentaufnahme an.
   * @param {Readonly<object>} data
   */
  render(data) {
    this.renderEnergy(data.energy, data.maximumEnergy);
    this.setText(this.elements.ammo, data.ammo);
    this.setText(this.elements.gears, data.gears);
    this.setText(this.elements.heightMeters, data.heightMeters);
    this.setText(this.elements.score, formatScore(data.score));
    this.renderBoss(data.boss);
  }

  /** Verbindet Gameplay-Ereignisse mit Waffen- und Fundanzeige. */
  handleGameplayEvent(event) {
    if (event.type === GAMEPLAY_EVENTS.WEAPON_CHANGED) {
      renderWeaponValue(this, event.detail);
    }
    if (event.type === GAMEPLAY_EVENTS.PICKUP) {
      this.pickupFeedback.show(event.detail);
    }
    if (event.type === GAMEPLAY_EVENTS.PLAYER_JUMP_CHARGE) {
      this.renderJumpCharge(event.detail);
    }
  }

  /**
   * Zeigt die gehaltene Sprungtaste als verständlichen Ladebalken.
   * @param {Readonly<{percent:number, isCharging:boolean}>} charge
   */
  renderJumpCharge(charge) {
    const percent = Math.max(0, Math.min(100, charge.percent));
    this.elements.jumpCharge.hidden = !charge.isCharging;
    this.elements.jumpChargeBar.style.setProperty("--jump-charge-percent", `${percent}%`);
    this.elements.jumpChargeBar.setAttribute("aria-valuenow", String(percent));
    this.elements.jumpChargeBar.setAttribute(
      "aria-valuetext",
      translate("value.percent", { value: percent }),
    );
    this.setText(this.elements.jumpChargeValue, `${percent}%`);
  }

  /**
   * Zeigt das HUD nur während Lauf und Pause.
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
   * Sammelt alle einmalig benötigten Wertelemente.
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
   * Aktualisiert Energietext, Balken und Screenreaderwerte gemeinsam.
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
   * Zeigt den gerade aktiven Biome-Boss mit Namen und exakten Leben.
   * @param {Readonly<object>|null} boss
   */
  renderBoss(boss) {
    const isVisible = Boolean(boss?.isVisible);
    this.elements.boss.hidden = !isVisible;
    if (!isVisible) return;
    const bossName = translate(BOSS_KEYS[boss.name] ?? "boss.default");
    renderBossValues(this, boss, bossName);
    renderBossBar(this, boss, bossName);
  }

  /** Übersetzt unveränderliche HUD-Werte nach einem Sprachwechsel neu. */
  renderLanguage() {
    this.render(this.game.getHudSnapshot());
    if (this.currentWeapon) this.renderWeapon(this.currentWeapon);
  }

  /** Zeigt die aktive Waffe über ihre stabile ID an. */
  renderWeapon(weapon) {
    renderWeaponValue(this, weapon);
  }

  /**
   * Verändert den DOM-Text nur bei einem echten neuen Wert.
   * @param {HTMLElement} element
   * @param {string|number} value
   */
  setText(element, value) {
    const text = String(value);
    if (element.textContent !== text) element.textContent = text;
  }
}
