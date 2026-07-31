import { WORLD_ENTITY_GROUPS } from "../core/world-entity-groups.js";
import { ReviewFlightController } from "../systems/review-flight-controller.class.js";
import { translate } from "../../js/i18n/localization.js";

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
    this.boundVersionClick = this.handleVersionClick.bind(this);
    this.boundSubmit = this.handleSubmit.bind(this);
    this.boundExit = this.exit.bind(this);
    this.boundCancel = () => this.dialog.close();
    this.boundBiomeChange = this.handleBiomeChange.bind(this);
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
    this.flight = new ReviewFlightController(this.game, this.config);
    this.game.world.addEntity(WORLD_ENTITY_GROUPS.DECORATIONS, this.flight);
    this.#showAllEnemies();
    this.flight.enable();
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

  #showAllEnemies() {
    this.game.world.level.enemies.forEach((enemy) => {
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
