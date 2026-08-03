import { createRoomPieceLayout } from
  "../../js/levels/room-stack-layout.js";

/** Builds small platforms that complete the route inside authored rooms. */
export class RoomPuzzleRouteBuilder {
  /** @param {Readonly<object>} levelData */
  constructor(levelData) {
    this.#validate(levelData);
    this.levelData = levelData;
  }

  /** Returns platform definitions for every enabled puzzle section. */
  build() {
    const sectionCount = this.levelData.sections.length;
    return Object.freeze(this.levelData.sections.flatMap((section, index) => {
      if (!section.hasPuzzleRoute) return [];
      return this.#buildSection(section, index, sectionCount);
    }));
  }

  #buildSection(section, sectionIndex, sectionCount) {
    const pieces = createRoomPieceLayout(
      section, sectionIndex, sectionCount, this.levelData.roomStack,
    );
    return pieces.flatMap((piece) => this.#buildPiece(section, piece));
  }

  #buildPiece(section, piece) {
    const recipe = this.levelData.puzzleRecipes[piece.templateId];
    if (!recipe) throw new RangeError(`Missing puzzle recipe: ${piece.templateId}`);
    const scaleY = piece.height / this.levelData.roomStack.referenceHeight;
    return recipe.map((platform, index) => Object.freeze({
      id: `${section.id}-room-${piece.index + 1}-step-${index + 1}`,
      x: platform.x,
      y: piece.y + platform.offsetY * scaleY,
      type: platform.type,
      tileset: section.tileset,
    }));
  }

  #validate(data) {
    const hasSections = Array.isArray(data?.sections) && data.sections.length > 0;
    const hasRecipes = data?.puzzleRecipes &&
      typeof data.puzzleRecipes === "object";
    if (hasSections && hasRecipes && data?.roomStack) return;
    throw new TypeError("The room puzzle route plan is invalid.");
  }
}
