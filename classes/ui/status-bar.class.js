import { GAME_STATES } from "../core/game-state-machine.class.js";

const VALUE_SELECTORS = Object.freeze({
  energy: '[data-hud-value="energy"]',
  ammo: '[data-hud-value="ammo"]',
  gears: '[data-hud-value="gears"]',
  heightMeters: '[data-hud-value="height"]',
  score: '[data-hud-value="score"]',
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
  }

  /**
   * Bindet Werte und Sichtbarkeit höchstens einmal.
   * @returns {StatusBar}
   */
  initialize() {
    if (this.unsubscribeHud) return this;
    this.unsubscribeHud = this.game.onHudChange((data) => this.render(data));
    this.unsubscribeState = this.game.onStateChange((state) => this.renderState(state));
    this.render(this.game.getHudSnapshot());
    this.renderState(this.game.state);
    return this;
  }

  /**
   * Entfernt alle vom HUD registrierten Beobachter.
   */
  destroy() {
    this.unsubscribeHud?.();
    this.unsubscribeState?.();
    this.unsubscribeHud = null;
    this.unsubscribeState = null;
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
    this.setText(this.elements.score, this.formatScore(data.score));
    this.renderBoss(data.boss);
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
    this.elements.energyBar.setAttribute("aria-valuetext", `${energy} von ${maximumEnergy}`);
  }

  /**
   * Zeigt den Mondwächter erst nach dem kontrollierten Kampfstart.
   * @param {Readonly<object>|null} boss
   */
  renderBoss(boss) {
    const isVisible = Boolean(boss?.isVisible);
    this.elements.boss.hidden = !isVisible;
    if (!isVisible) return;
    const percentage = Math.round((boss.health / boss.maximumHealth) * 100);
    this.setText(this.elements.bossName, boss.name);
    this.setText(this.elements.bossHealth, `${boss.health} / ${boss.maximumHealth}`);
    this.setText(this.elements.bossPhase, boss.phase);
    this.elements.bossBar.style.setProperty("--boss-health-percent", `${percentage}%`);
    this.elements.bossBar.setAttribute("aria-valuenow", String(boss.health));
    this.elements.bossBar.setAttribute("aria-valuemax", String(boss.maximumHealth));
    this.elements.bossBar.setAttribute("aria-valuetext", `${boss.health} von ${boss.maximumHealth}`);
  }

  /**
   * Formatiert Punkte immer sechsstellig wie in der HUD-Vorlage.
   * @param {number} score
   * @returns {string}
   */
  formatScore(score) {
    return String(Math.max(0, Math.floor(score))).padStart(6, "0");
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
