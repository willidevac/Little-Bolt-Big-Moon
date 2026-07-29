import { translate } from "../../js/i18n/localization.js";

/**
 * Baut eine barrierefreie Upgrade-Karte aus einem unveränderlichen Snapshot.
 */
export class UpgradeOptionView {
  /**
   * @param {Document} document
   */
  constructor(document) {
    if (typeof document?.createElement !== "function") {
      throw new TypeError("Für Upgrade-Karten wird ein Dokument benötigt.");
    }
    this.document = document;
  }

  /**
   * Erstellt eine vollständig beschriftete Upgrade-Schaltfläche.
   * @param {Readonly<object>} upgrade
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

  #createContent(upgrade) {
    return [
      this.#createRarity(upgrade),
      this.#createIcon(upgrade),
      this.#createText("strong", "upgrade-card__name", this.#getName(upgrade)),
      this.#createText("span", "upgrade-card__level", this.#getLevel(upgrade)),
      this.#createText("span", "upgrade-card__description", this.#getDescription(upgrade)),
    ];
  }

  #createRarity(upgrade) {
    return this.#createText(
      "span",
      "upgrade-card__rarity",
      translate(`upgrade.rarity.${upgrade.rarity}`),
    );
  }

  #createIcon(upgrade) {
    const icon = this.document.createElement("span");
    const source = new URL(upgrade.iconSheet.source, this.document.baseURI).href;
    icon.className = "upgrade-card__icon";
    icon.setAttribute("aria-hidden", "true");
    icon.style.setProperty("--upgrade-icon", `url("${source}")`);
    icon.style.setProperty("--upgrade-frame", upgrade.iconFrame);
    return icon;
  }

  #createText(tagName, className, text) {
    const element = this.document.createElement(tagName);
    element.className = className;
    element.textContent = text;
    return element;
  }

  #getName(upgrade) {
    return translate(`upgrade.${upgrade.id}.name`);
  }

  #getDescription(upgrade) {
    return translate(`upgrade.${upgrade.id}.description`);
  }

  #getLevel(upgrade) {
    return translate("upgrade.level", {
      level: upgrade.nextLevel,
      maximum: upgrade.maxLevel,
    });
  }

  #getAccessibleLabel(upgrade) {
    const rarity = translate(`upgrade.rarity.${upgrade.rarity}`);
    return `${rarity}. ${this.#getName(upgrade)}. ` +
      `${this.#getLevel(upgrade)}. ${this.#getDescription(upgrade)}`;
  }
}
