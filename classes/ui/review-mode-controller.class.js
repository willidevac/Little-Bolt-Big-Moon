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
  height: "[data-review-height]",
  teleport: "[data-review-teleport]",
});

/** Unlocks the hidden, unscored mentor review mode. */
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
    this.unsubscribers = [];
    this.#assignElements();
    this.#bindEvents();
  }

  #bindEvents() {
    this.boundVersionClick = this.handleVersionClick.bind(this);
    this.boundSubmit = this.handleSubmit.bind(this);
    this.boundExit = this.exit.bind(this);
    this.boundCancel = () => this.dialog.close();
    this.boundBiomeChange = this.handleBiomeChange.bind(this);
    this.boundHeightTeleport = this.handleHeightTeleport.bind(this);
    this.boundStateChange = this.handleStateChange.bind(this);
    this.boundHudChange = this.syncBiomeControl.bind(this);
    this.boundReviewLayout = this.syncReviewLayout.bind(this);
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
    this.heightControl = this.#getElement(SELECTORS.height);
    this.teleportButton = this.#getElement(SELECTORS.teleport);
  }

  /** Binds the hidden unlock flow exactly once. */
  initialize() {
    if (this.unsubscribers.length > 0) return this;
    this.version.textContent = this.config.versionLabel;
    this.version.addEventListener("click", this.boundVersionClick);
    this.form.addEventListener("submit", this.boundSubmit);
    this.startButton.addEventListener("click", this.boundSubmit);
    this.exitButton.addEventListener("click", this.boundExit);
    this.cancelButton.addEventListener("click", this.boundCancel);
    this.biomeControl.addEventListener("change", this.boundBiomeChange);
    this.teleportButton.addEventListener("click", this.boundHeightTeleport);
    this.unsubscribers.push(
      this.game.onStateChange(this.boundStateChange),
      this.game.onHudChange(this.boundHudChange),
    );
    globalThis.addEventListener?.("resize", this.boundReviewLayout);
    if (this.#hasStoredAccess()) this.start();
    return this;
  }

  /** Removes all review-mode bindings and temporary state. */
  destroy() {
    this.version.removeEventListener("click", this.boundVersionClick);
    this.form.removeEventListener("submit", this.boundSubmit);
    this.startButton.removeEventListener("click", this.boundSubmit);
    this.exitButton.removeEventListener("click", this.boundExit);
    this.cancelButton.removeEventListener("click", this.boundCancel);
    this.biomeControl.removeEventListener("change", this.boundBiomeChange);
    this.teleportButton.removeEventListener("click", this.boundHeightTeleport);
    globalThis.removeEventListener?.("resize", this.boundReviewLayout);
    this.unsubscribers.forEach((unsubscribe) => unsubscribe());
    this.unsubscribers.length = 0;
    this.flight?.disable();
    this.flight = null;
  }

  /** Counts activations of the unobtrusive version number. */
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

  /** Begins an unscored review run. */
  start() {
    if (this.flight) return false;
    this.game.reset();
    this.#attachFlight();
    this.root.dataset.reviewMode = "true";
    this.game.canvas.dataset.reviewMode = "true";
    this.banner.hidden = false;
    this.syncReviewLayout();
    return true;
  }

  /** Ends the mode and returns to the main menu without reloading the page. */
  exit() {
    this.storage?.removeItem(this.config.storageKey);
    delete this.root.dataset.reviewMode;
    delete this.game.canvas.dataset.reviewMode;
    this.banner.hidden = true;
    this.root.style?.removeProperty?.("--review-toolbar-offset");
    this.flight?.disable();
    this.flight = null;
    this.game.goHome();
  }

  /** Reserves the banner's real wrapped height for every other HUD layer. */
  syncReviewLayout() {
    if (!this.#isActive() || this.banner.hidden) return;
    const bannerBottom = this.banner.offsetTop + this.banner.offsetHeight;
    this.root.style?.setProperty?.(
      "--review-toolbar-offset", `${bannerBottom + 8}px`,
    );
  }

  /** Jumps directly to the beginning of a selected biome. */
  handleBiomeChange() {
    this.#enableFlight();
    this.flight?.teleportTo(Number(this.biomeControl.value));
  }

  /** Flies directly to a requested height in metres. */
  handleHeightTeleport() {
    this.#enableFlight();
    const moved = this.flight?.teleportToHeight(Number(this.heightControl.value));
    if (moved) this.syncBiomeControl();
  }

  /** Reconnects review flight to the fresh world after a restart. */
  handleStateChange(state) {
    if (!this.#isActive() || state !== GAME_STATES.PLAYING) return;
    if (this.flight?.character === this.game.world.character) return;
    this.#attachFlight();
    this.syncBiomeControl();
  }

  /** Keeps the visible biome selection current during free flight. */
  syncBiomeControl() {
    if (!this.#isActive()) return;
    this.biomeControl.value = String(this.#getCurrentTargetIndex());
  }

  #attachFlight() {
    this.flight = new ReviewFlightController(this.game, this.config);
    this.game.world.addEntity(WORLD_ENTITY_GROUPS.DECORATIONS, this.flight);
    this.#showAllEnemies();
    this.flight.enable();
    this.#configureHeightControl();
  }

  #enableFlight() {
    this.flight?.enable();
  }

  #configureHeightControl() {
    const startY = this.game.world.level.playerStart.y;
    const scale = this.game.config.hud.heightPixelsPerMeter;
    this.heightControl.max = String(Math.floor(startY / scale));
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
