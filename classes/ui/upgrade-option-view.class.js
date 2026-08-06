import { translate } from "../../js/i18n/localization.js";

/**
 * Builds an accessible upgrade card from an immutable snapshot.
 */
export class UpgradeOptionView {
  /**
   * Creates the configured instance.
   * @param {Document} document Document used to create view elements.
   */
  constructor(document) {
    if (typeof document?.createElement !== "function") {
      throw new TypeError("Für Upgrade-Karten wird ein Dokument benötigt.");
    }
    this.document = document;
  }

  /**
   * Creates a fully labeled upgrade button.
   * @param {Readonly<object>} upgrade Upgrade definition rendered by the view.
   * @returns {HTMLButtonElement}
   */
  create(upgrade) {
    const button = this.document.createElement("button");
    button.type = "button";
    button.className = "upgrade-card";
    button.dataset.uiAction = "upgrade";
    button.dataset.upgradeId = upgrade.id;
    button.dataset.rarity = upgrade.rarity;
    button.setAttribute("aria-label", this.#getAccessibleLabel(upgrade));
    button.append(...this.#createContent(upgrade));
    return button;
  }

  /**
   * Creates content.
   * @param {Readonly<object>} upgrade Upgrade definition rendered by the view.
   */
  #createContent(upgrade) {
    return [
      this.#createRarity(upgrade),
      this.#createIcon(upgrade),
      this.#createText("strong", "upgrade-card__name", this.#getName(upgrade)),
      this.#createText("span", "upgrade-card__level", this.#getLevel(upgrade)),
      this.#createText("span", "upgrade-card__description", this.#getDescription(upgrade)),
    ];
  }

  /**
   * Creates rarity.
   * @param {Readonly<object>} upgrade Upgrade definition rendered by the view.
   */
  #createRarity(upgrade) {
    return this.#createText(
      "span",
      "upgrade-card__rarity",
      translate(`upgrade.rarity.${upgrade.rarity}`),
    );
  }

  /**
   * Creates icon.
   * @param {Readonly<object>} upgrade Upgrade definition rendered by the view.
   */
  #createIcon(upgrade) {
    const icon = this.document.createElement("span");
    const source = new URL(upgrade.iconSheet.source, this.document.baseURI).href;
    icon.className = "upgrade-card__icon";
    icon.setAttribute("aria-hidden", "true");
    icon.style.setProperty("--upgrade-icon", `url("${source}")`);
    icon.style.setProperty("--upgrade-frame", upgrade.iconFrame);
    return icon;
  }

  /**
   * Creates text.
   * @param {string} tagName Tag name supplied to create text.
   * @param {string} className Class name supplied to create text.
   * @param {string} text Text supplied to create text.
   */
  #createText(tagName, className, text) {
    const element = this.document.createElement(tagName);
    element.className = className;
    element.textContent = text;
    return element;
  }

  /**
   * Returns name.
   * @param {Readonly<object>} upgrade Upgrade definition rendered by the view.
   */
  #getName(upgrade) {
    return translate(`upgrade.${upgrade.id}.name`);
  }

  /**
   * Returns description.
   * @param {Readonly<object>} upgrade Upgrade definition rendered by the view.
   */
  #getDescription(upgrade) {
    return translate(`upgrade.${upgrade.id}.description`);
  }

  /**
   * Returns level.
   * @param {Readonly<object>} upgrade Upgrade definition rendered by the view.
   */
  #getLevel(upgrade) {
    return translate("upgrade.level", {
      level: upgrade.nextLevel,
      maximum: upgrade.maxLevel,
    });
  }

  /**
   * Returns accessible label.
   * @param {Readonly<object>} upgrade Upgrade definition rendered by the view.
   */
  #getAccessibleLabel(upgrade) {
    const rarity = translate(`upgrade.rarity.${upgrade.rarity}`);
    return `${rarity}. ${this.#getName(upgrade)}. ` +
      `${this.#getLevel(upgrade)}. ${this.#getDescription(upgrade)}`;
  }
}
