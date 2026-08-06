import { GAME_STATES } from "../core/game-state-machine.class.js";
import { formatScore } from "../../js/utils/format.js";
import { onLanguageChange, translate } from "../../js/i18n/localization.js";
import { GameDialogController } from "./game-dialog-controller.class.js";
import { UpgradeOptionView } from "./upgrade-option-view.class.js";
import { GAME_LEVEL_IDS } from "../../js/config/level-config.js";

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
  endResult: "[data-end-result]",
  endActions: "[data-end-actions]",
  tutorialEndActions: "[data-tutorial-end-actions]",
  upgradeEyebrow: "[data-upgrade-eyebrow]",
  upgradeCopy: "[data-upgrade-copy]",
  upgradeOptions: "[data-upgrade-options]",
  start: '[data-ui-action="start"]',
  tutorial: '[data-ui-action="tutorial"]',
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

  /** Performs the bind actions operation. */
  #bindActions() {
    this.boundClick = this.handleClick.bind(this);
    this.boundDialogKeydown = this.dialogController.handleKeydown.bind(
      this.dialogController,
    );
    this.actions = this.createActions();
  }

  /** Applies required elements. */
  #assignRequiredElements() {
    this.upgradeOptionView = new UpgradeOptionView(this.root.ownerDocument);
    this.homeScreen = getRequiredElement(this.root, SELECTORS.home);
    this.pauseScreen = getRequiredElement(this.root, SELECTORS.paused);
    this.upgradeScreen = getRequiredElement(this.root, SELECTORS.upgrading);
    this.endScreen = getRequiredElement(this.root, SELECTORS.end);
    this.upgradeEyebrow = getRequiredElement(this.root, SELECTORS.upgradeEyebrow);
    this.upgradeCopy = getRequiredElement(this.root, SELECTORS.upgradeCopy);
    this.upgradeOptions = getRequiredElement(this.root, SELECTORS.upgradeOptions);
    this.#assignMenuButtons();
    this.resumeButton = getRequiredElement(this.root, SELECTORS.resume);
    this.muteButton = getRequiredElement(this.root, SELECTORS.mute);
    this.#assignEndElements();
  }

  /** Applies home menu buttons. */
  #assignMenuButtons() {
    this.startButton = getRequiredElement(this.root, SELECTORS.start);
    this.tutorialButton = getRequiredElement(this.root, SELECTORS.tutorial);
  }

  /** Applies end elements. */
  #assignEndElements() {
    this.endEyebrow = getRequiredElement(this.root, SELECTORS.endEyebrow);
    this.endTitle = getRequiredElement(this.root, SELECTORS.endTitle);
    this.endCopy = getRequiredElement(this.root, SELECTORS.endCopy);
    this.endHeight = getRequiredElement(this.root, SELECTORS.endHeight);
    this.endScore = getRequiredElement(this.root, SELECTORS.endScore);
    this.endResult = getRequiredElement(this.root, SELECTORS.endResult);
    this.endActions = getRequiredElement(this.root, SELECTORS.endActions);
    this.tutorialEndActions = getRequiredElement(
      this.root, SELECTORS.tutorialEndActions,
    );
  }

  /** Returns dialog background elements. */
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
    this.#syncLevelAvailability();
    this.root.addEventListener("click", this.boundClick);
    this.root.addEventListener("keydown", this.boundDialogKeydown);
    this.unsubscribe = this.game.onStateChange((state) => this.render(state));
    this.unsubscribeLanguage = onLanguageChange(() => {
      this.render(this.game.state, false);
    });
    this.render(this.game.state);
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
    this.storySequences?.destroy();
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
    this.root.dataset.screenState = state;
    this.#setScreenVisibility(state);
    if (state === GAME_STATES.UPGRADING) this.#renderUpgradeOptions();
    if (this.#hasVisibleScreen()) {
      if (moveFocus) this.focusScreen(state);
      return;
    }
    this.dialogController.close(false);
  }

  /** Applies screen visibility. */
  #setScreenVisibility(state) {
    const endContent = this.#getEndContent(state);
    this.homeScreen.hidden = state !== GAME_STATES.HOME;
    this.pauseScreen.hidden = state !== GAME_STATES.PAUSED;
    this.upgradeScreen.hidden = state !== GAME_STATES.UPGRADING;
    this.endScreen.hidden = !endContent;
    if (endContent) this.#renderEndScreen(state, endContent);
  }

  /** Checks the visible screen condition. */
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
      ...this.#createLevelActions(),
      ...this.#createMenuActions(),
      ...this.#createResultActions(),
    });
  }

  /** Creates shared menu and game-state actions. */
  #createMenuActions() {
    return {
      /** Performs the controls operation. */
      controls: () => this.dialogController.open("controls"),
      /** Applies settings. */
      settings: () => this.dialogController.open("settings"),
      /** Performs the imprint operation. */
      imprint: () => this.dialogController.open("imprint"),
      /** Performs the close-dialog operation. */
      "close-dialog": () => this.dialogController.close(),
      /** Performs the pause operation. */
      pause: () => this.game.togglePause(),
      /** Performs the resume operation. */
      resume: () => this.game.resume(),
      /** Performs the upgrade operation. */
      upgrade: (button) => this.game.chooseUpgrade(button.dataset.upgradeId),
      /** Performs the restart operation. */
      restart: () => this.game.reset(),
      /** Performs the home operation. */
      home: () => this.game.goHome(),
    };
  }

  /** Creates actions available on the tutorial result screen. */
  #createResultActions() {
    return {
      /** Starts the main game after the tutorial result. */
      "tutorial-main": () => this.#startFromEnd(GAME_LEVEL_IDS.MAIN),
      /** Starts a fresh tutorial after the tutorial result. */
      "tutorial-replay": () => this.#startFromEnd(GAME_LEVEL_IDS.TUTORIAL),
    };
  }

  /** Creates actions that enter selectable levels. */
  #createLevelActions() {
    return {
      /** Performs the start operation. */
      start: () => this.startRun(GAME_LEVEL_IDS.MAIN),
      /** Performs the tutorial operation. */
      tutorial: () => this.startRun(GAME_LEVEL_IDS.TUTORIAL),
    };
  }

  /**
   * Begins a selected available level.
   * @param {string} levelId
   * @returns {boolean}
   */
  startRun(levelId) {
    if (!this.game.isLevelAvailable(levelId)) return false;
    if (levelId === GAME_LEVEL_IDS.MAIN && this.storySequences) {
      return this.storySequences.playIntro(levelId);
    }
    return this.game.startLevel(levelId);
  }

  /**
   * Focuses the most important button on the visible screen.
   * @param {string} state
   */
  focusScreen(state) {
    if (state === GAME_STATES.HOME) this.#getHomeFocusTarget().focus();
    if (state === GAME_STATES.PAUSED) this.resumeButton.focus();
    if (state === GAME_STATES.UPGRADING) {
      this.upgradeOptions.querySelector("button")?.focus();
    }
    if (END_SCREEN_CONTENT[state]) this.endTitle.focus();
  }

  /** Disables menu routes whose level factories do not exist yet. */
  #syncLevelAvailability() {
    this.tutorialButton.disabled = !this.game.isLevelAvailable(
      GAME_LEVEL_IDS.TUTORIAL,
    );
  }

  /** Returns the recommended usable home action. */
  #getHomeFocusTarget() {
    const completed = this.tutorialButton.dataset.tutorialCompleted === "true";
    return this.tutorialButton.disabled || completed
      ? this.startButton
      : this.tutorialButton;
  }

  /** Returns regular or tutorial-specific end content. */
  #getEndContent(state) {
    const completedTutorial = state === GAME_STATES.WON &&
      this.game.levelId === GAME_LEVEL_IDS.TUTORIAL;
    return completedTutorial ? "tutorial.complete" : END_SCREEN_CONTENT[state];
  }

  /** Draws render end screen. */
  #renderEndScreen(state, contentKey) {
    const isTutorial = contentKey === "tutorial.complete";
    const stats = this.game.getHudSnapshot();
    this.endScreen.dataset.endState = isTutorial ? "tutorial" : state;
    this.endEyebrow.textContent = translate(`${contentKey}.eyebrow`);
    this.endTitle.textContent = translate(`${contentKey}.title`);
    this.endCopy.textContent = translate(`${contentKey}.copy`);
    this.#setEndSections(isTutorial);
    if (isTutorial) return;
    this.endHeight.textContent = `${stats.heightMeters} m`;
    this.endScore.textContent = formatScore(stats.score);
  }

  /** Switches between run results and tutorial completion actions. */
  #setEndSections(isTutorial) {
    this.endResult.hidden = isTutorial;
    this.endActions.hidden = isTutorial;
    this.tutorialEndActions.hidden = !isTutorial;
  }

  /** Leaves an end state before selecting a fresh requested level. */
  #startFromEnd(levelId) {
    if (![GAME_STATES.WON, GAME_STATES.LOST].includes(this.game.state)) {
      return false;
    }
    this.game.goHome();
    return this.startRun(levelId);
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

  /** Draws render upgrade context. */
  #renderUpgradeContext() {
    const context = this.game.getUpgradeContext();
    const prefix = context.didUnlockPath ? "upgrade.boss" : "upgrade";
    this.upgradeEyebrow.textContent = translate(`${prefix}.eyebrow`);
    this.upgradeCopy.textContent = translate(`${prefix}.copy`);
  }

}
