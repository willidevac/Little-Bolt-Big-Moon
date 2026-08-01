import { WORLD_ENTITY_GROUPS } from "../core/world-entity-groups.js";
import { ReviewFlightController } from "../systems/review-flight-controller.class.js";
import { translate } from "../../js/i18n/localization.js";
import { GAME_STATES } from "../core/game-state-machine.class.js";

const SELECTORS = Object.freeze({
  version: "[data-review-version]",
  dialog: "[data-review-dialog]",
  form: "[data-review-form]",
  start: "[data-review-start]",
  code: "[data-review-code]",
  error: "[data-review-error]",
  banner: "[data-review-banner]",
  exit: "[data-review-exit]",
  cancel: "[data-review-cancel]",
  biome: "[data-review-biome]",
});

/** Schaltet den versteckten, nicht wertbaren Mentor-Review-Modus frei. */
export class ReviewModeController {
  /**
   * @param {import("../core/game.class.js").Game} game
   * @param {HTMLElement} root
   * @param {Readonly<object>} config
   * @param {Storage|null} [storage]
   */
  constructor(game, root, config, storage = getSessionStorage()) {
    this.game = game;
    this.root = root;
    this.config = config;
    this.storage = storage;
    this.versionClicks = 0;
    this.flight = null;
    this.#assignElements();
    this.#bindEvents();
  }

  #bindEvents() {
    this.boundVersionClick = this.handleVersionClick.bind(this);
    this.boundSubmit = this.handleSubmit.bind(this);
    this.boundExit = this.exit.bind(this);
    this.boundCancel = () => this.dialog.close();
    this.boundBiomeChange = this.handleBiomeChange.bind(this);
    this.boundStateChange = this.handleStateChange.bind(this);
    this.boundHudChange = this.syncBiomeControl.bind(this);
  }

  #assignElements() {
    this.version = this.#getElement(SELECTORS.version);
    this.dialog = this.#getElement(SELECTORS.dialog);
    this.form = this.#getElement(SELECTORS.form);
    this.startButton = this.#getElement(SELECTORS.start);
    this.code = this.#getElement(SELECTORS.code);
    this.error = this.#getElement(SELECTORS.error);
    this.banner = this.#getElement(SELECTORS.banner);
    this.exitButton = this.#getElement(SELECTORS.exit);
    this.cancelButton = this.#getElement(SELECTORS.cancel);
    this.biomeControl = this.#getElement(SELECTORS.biome);
  }

  /** Verbindet die versteckte Freischaltung genau einmal. */
  initialize() {
    this.version.textContent = this.config.versionLabel;
    this.version.addEventListener("click", this.boundVersionClick);
    this.form.addEventListener("submit", this.boundSubmit);
    this.startButton.addEventListener("click", this.boundSubmit);
    this.exitButton.addEventListener("click", this.boundExit);
    this.cancelButton.addEventListener("click", this.boundCancel);
    this.biomeControl.addEventListener("change", this.boundBiomeChange);
    this.game.onStateChange(this.boundStateChange);
    this.game.onHudChange(this.boundHudChange);
    if (this.#hasStoredAccess()) this.start();
    return this;
  }

  /** Zählt Aktivierungen der unauffälligen Versionsnummer. */
  handleVersionClick() {
    this.versionClicks += 1;
    if (this.versionClicks < this.config.requiredVersionClicks) return;
    this.versionClicks = 0;
    this.error.hidden = true;
    this.dialog.showModal();
    this.code.focus();
  }

  /** @param {SubmitEvent} event */
  handleSubmit(event) {
    event.preventDefault();
    if (this.#matchesAccessCode(this.code.value)) {
      this.#storeAccess();
      this.dialog.close();
      this.start();
      return;
    }
    this.error.textContent = translate("review.invalidCode");
    this.error.hidden = false;
    this.code.select();
  }

  /** Beginnt einen nicht wertbaren Review-Lauf. */
  start() {
    if (this.flight) return false;
    this.game.reset();
    this.#attachFlight();
    this.root.dataset.reviewMode = "true";
    this.game.canvas.dataset.reviewMode = "true";
    this.banner.hidden = false;
    return true;
  }

  /** Beendet den Modus und kehrt ohne Seitenreload ins Hauptmenü zurück. */
  exit() {
    this.storage?.removeItem(this.config.storageKey);
    delete this.root.dataset.reviewMode;
    delete this.game.canvas.dataset.reviewMode;
    this.banner.hidden = true;
    this.flight = null;
    this.game.goHome();
  }

  /** Springt über die Auswahl direkt an den Beginn einer Landschaft. */
  handleBiomeChange() {
    this.flight?.teleportTo(Number(this.biomeControl.value));
  }

  /** Verbindet den Review-Flug nach einem Neustart mit der frischen Welt. */
  handleStateChange(state) {
    if (!this.#isActive() || state !== GAME_STATES.PLAYING) return;
    if (this.flight?.character === this.game.world.character) return;
    this.#attachFlight();
    this.syncBiomeControl();
  }

  /** Hält die sichtbare Landschaftsauswahl beim freien Flug aktuell. */
  syncBiomeControl() {
    if (!this.#isActive()) return;
    this.biomeControl.value = String(this.#getCurrentTargetIndex());
  }

  #attachFlight() {
    this.flight = new ReviewFlightController(this.game, this.config);
    this.game.world.addEntity(WORLD_ENTITY_GROUPS.DECORATIONS, this.flight);
    this.#showAllEnemies();
    this.flight.enable();
  }

  #getCurrentTargetIndex() {
    const y = this.game.world.character?.y;
    if (y <= this.config.bossArenaMaximumY) return 5;
    const section = this.game.world.level.sections.find((candidate) => {
      return y >= candidate.topY && y < candidate.bottomY;
    });
    return this.#getBiomeIds().indexOf(section?.backgroundId);
  }

  #getBiomeIds() {
    const ids = this.game.world.level.sections.map(({ backgroundId }) => backgroundId);
    return [...new Set(ids)];
  }

  #isActive() {
    return this.root.dataset.reviewMode === "true";
  }

  #showAllEnemies() {
    this.game.world.level.enemies
      .filter(({ isBoss }) => !isBoss)
      .forEach((enemy) => {
        this.game.world.addEntity(WORLD_ENTITY_GROUPS.ENEMIES, enemy);
      });
  }

  #matchesAccessCode(value) {
    const normalized = value.trim().toUpperCase();
    const hash = [...normalized].reduce((result, character) => {
      return Math.imul(result ^ character.charCodeAt(0), 16777619) >>> 0;
    }, 2166136261);
    return hash.toString(16).padStart(8, "0") === this.config.accessCodeHash;
  }

  #hasStoredAccess() {
    return this.storage?.getItem(this.config.storageKey) === "true";
  }

  #storeAccess() {
    this.storage?.setItem(this.config.storageKey, "true");
  }

  #getElement(selector) {
    const element = this.root.querySelector(selector);
    if (element instanceof HTMLElement) return element;
    throw new Error(`Review-Element fehlt: ${selector}`);
  }
}

function getSessionStorage() {
  try {
    return globalThis.sessionStorage;
  } catch {
    return null;
  }
}
