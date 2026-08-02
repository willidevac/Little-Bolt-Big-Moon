import { GAME_STATES } from "../core/game-state-machine.class.js";
import { formatScore } from "../../js/utils/format.js";
import { onLanguageChange, translate } from "../../js/i18n/localization.js";
import { GameDialogController } from "./game-dialog-controller.class.js";
import { UpgradeOptionView } from "./upgrade-option-view.class.js";

const SELECTORS = Object.freeze({
  home: '[data-game-screen="home"]',
  paused: '[data-game-screen="paused"]',
  upgrading: '[data-game-screen="upgrading"]',
  end: '[data-game-screen="end"]',
  endEyebrow: "[data-end-eyebrow]",
  endTitle: "[data-end-title]",
  endCopy: "[data-end-copy]",
  endHeight: "[data-end-height]",
  endScore: "[data-end-score]",
  upgradeEyebrow: "[data-upgrade-eyebrow]",
  upgradeCopy: "[data-upgrade-copy]",
  upgradeOptions: "[data-upgrade-options]",
  start: '[data-ui-action="start"]',
  resume: '[data-ui-action="resume"]',
  mute: '[data-ui-action="mute"]',
});

const END_SCREEN_CONTENT = Object.freeze({
  [GAME_STATES.WON]: "end.won",
  [GAME_STATES.LOST]: "end.lost",
});

/**
 * Returns a required DOM element or fails with a clear error.
 * @param {ParentNode} root
 * @param {string} selector
 * @returns {HTMLElement}
 */
function getRequiredElement(root, selector) {
  const element = root.querySelector(selector);
  if (element instanceof HTMLElement) return element;
  throw new Error(`UI-Element nicht gefunden: ${selector}`);
}

/**
 * Connects static menus to the central game state.
 */
export class ScreenController {
  /**
   * @param {import("../core/game.class.js").Game} game
   * @param {HTMLElement} root
   * @param {import("./story-sequence-controller.class.js").StorySequenceController|null} storySequences
   */
  constructor(game, root, storySequences = null) {
    this.game = game;
    this.root = root;
    this.storySequences = storySequences;
    this.#assignRequiredElements();
    this.dialogController = new GameDialogController(
      root, this.#getDialogBackgroundElements(),
    );
    this.unsubscribe = null;
    this.unsubscribeLanguage = null;
    this.#bindActions();
  }

  #bindActions() {
    this.boundClick = this.handleClick.bind(this);
    this.boundDialogKeydown = this.dialogController.handleKeydown.bind(
      this.dialogController,
    );
    this.actions = this.createActions();
  }

  #assignRequiredElements() {
    this.upgradeOptionView = new UpgradeOptionView(this.root.ownerDocument);
    this.homeScreen = getRequiredElement(this.root, SELECTORS.home);
    this.pauseScreen = getRequiredElement(this.root, SELECTORS.paused);
    this.upgradeScreen = getRequiredElement(this.root, SELECTORS.upgrading);
    this.endScreen = getRequiredElement(this.root, SELECTORS.end);
    this.upgradeEyebrow = getRequiredElement(this.root, SELECTORS.upgradeEyebrow);
    this.upgradeCopy = getRequiredElement(this.root, SELECTORS.upgradeCopy);
    this.upgradeOptions = getRequiredElement(this.root, SELECTORS.upgradeOptions);
    this.startButton = getRequiredElement(this.root, SELECTORS.start);
    this.resumeButton = getRequiredElement(this.root, SELECTORS.resume);
    this.muteButton = getRequiredElement(this.root, SELECTORS.mute);
    this.#assignEndElements();
  }

  #assignEndElements() {
    this.endEyebrow = getRequiredElement(this.root, SELECTORS.endEyebrow);
    this.endTitle = getRequiredElement(this.root, SELECTORS.endTitle);
    this.endCopy = getRequiredElement(this.root, SELECTORS.endCopy);
    this.endHeight = getRequiredElement(this.root, SELECTORS.endHeight);
    this.endScore = getRequiredElement(this.root, SELECTORS.endScore);
  }

  #getDialogBackgroundElements() {
    return [
      this.homeScreen, this.pauseScreen, this.upgradeScreen,
      this.endScreen, this.muteButton,
    ];
  }

  /**
   * Binds all UI events at most once.
   * @returns {ScreenController}
   */
  initialize() {
    if (this.unsubscribe) return this;
    this.root.addEventListener("click", this.boundClick);
    this.root.addEventListener("keydown", this.boundDialogKeydown);
    this.unsubscribe = this.game.onStateChange((state) => this.render(state));
    this.unsubscribeLanguage = onLanguageChange(() => {
      this.render(this.game.state, false);
    });
    this.render(this.game.state, false);
    return this;
  }

  /**
   * Removes the bindings created by this controller.
   */
  destroy() {
    this.dialogController.close(false);
    this.root.removeEventListener("click", this.boundClick);
    this.root.removeEventListener("keydown", this.boundDialogKeydown);
    this.unsubscribe?.();
    this.unsubscribeLanguage?.();
    this.unsubscribe = null;
    this.unsubscribeLanguage = null;
  }

  /**
   * Executes the action of a clicked UI button.
   * @param {MouseEvent} event
   */
  handleClick(event) {
    if (!(event.target instanceof Element)) return;
    if (this.dialogController.isBackdrop(event.target)) {
      return this.dialogController.close();
    }
    const button = event.target.closest("button[data-ui-action]");
    if (!button || !this.root.contains(button)) return;
    this.actions[button.dataset.uiAction]?.(button);
  }

  /**
   * Displays exactly the screen for the current game state.
   * @param {string} state
   * @param {boolean} [moveFocus=true]
   */
  render(state, moveFocus = true) {
    this.#setScreenVisibility(state);
    if (state === GAME_STATES.UPGRADING) this.#renderUpgradeOptions();
    if (this.#hasVisibleScreen()) {
      if (moveFocus) this.focusScreen(state);
      return;
    }
    this.dialogController.close(false);
  }

  #setScreenVisibility(state) {
    const endContent = END_SCREEN_CONTENT[state];
    this.homeScreen.hidden = state !== GAME_STATES.HOME;
    this.pauseScreen.hidden = state !== GAME_STATES.PAUSED;
    this.upgradeScreen.hidden = state !== GAME_STATES.UPGRADING;
    this.endScreen.hidden = !endContent;
    if (endContent) this.#renderEndScreen(state, endContent);
  }

  #hasVisibleScreen() {
    return [
      this.homeScreen,
      this.pauseScreen,
      this.upgradeScreen,
      this.endScreen,
    ].some((screen) => !screen.hidden);
  }

  /**
   * Creates the central mapping from buttons to game actions.
   * @returns {Readonly<Record<string, () => void>>}
   */
  createActions() {
    return Object.freeze({
      start: () => this.startRun(),
      controls: () => this.dialogController.open("controls"),
      settings: () => this.dialogController.open("settings"),
      imprint: () => this.dialogController.open("imprint"),
      "close-dialog": () => this.dialogController.close(),
      pause: () => this.game.togglePause(),
      resume: () => this.game.resume(),
      upgrade: (button) => this.game.chooseUpgrade(button.dataset.upgradeId),
      restart: () => this.game.reset(),
      home: () => this.game.goHome(),
    });
  }

  /** Begins the run after the short wordless opening sequence. */
  startRun() {
    if (this.storySequences) return this.storySequences.playIntro();
    this.game.reset();
    return true;
  }

  /**
   * Focuses the most important button on the visible screen.
   * @param {string} state
   */
  focusScreen(state) {
    if (state === GAME_STATES.HOME) this.startButton.focus();
    if (state === GAME_STATES.PAUSED) this.resumeButton.focus();
    if (state === GAME_STATES.UPGRADING) {
      this.upgradeOptions.querySelector("button")?.focus();
    }
    if (END_SCREEN_CONTENT[state]) this.endTitle.focus();
  }

  #renderEndScreen(state, contentKey) {
    const stats = this.game.getHudSnapshot();
    this.endScreen.dataset.endState = state;
    this.endEyebrow.textContent = translate(`${contentKey}.eyebrow`);
    this.endTitle.textContent = translate(`${contentKey}.title`);
    this.endCopy.textContent = translate(`${contentKey}.copy`);
    this.endHeight.textContent = `${stats.heightMeters} m`;
    this.endScore.textContent = formatScore(stats.score);
  }

  /**
   * Rebuilds the three upgrade buttons from safe DOM nodes.
   */
  #renderUpgradeOptions() {
    this.#renderUpgradeContext();
    this.upgradeOptions.replaceChildren(
      ...this.game.getUpgradeOptions().map((upgrade) => {
        return this.upgradeOptionView.create(upgrade);
      }),
    );
  }

  #renderUpgradeContext() {
    const context = this.game.getUpgradeContext();
    const prefix = context.didUnlockPath ? "upgrade.boss" : "upgrade";
    this.upgradeEyebrow.textContent = translate(`${prefix}.eyebrow`);
    this.upgradeCopy.textContent = translate(`${prefix}.copy`);
  }

}
