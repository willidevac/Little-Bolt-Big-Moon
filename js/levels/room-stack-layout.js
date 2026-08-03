/** Calculates gapless puzzle-piece bounds for one vertical world section. */
export function createRoomPieceLayout(section, sectionIndex, sectionCount,
  stack) {
  const lastIndex = sectionCount - 1;
  const bounds = getStackBounds(section, sectionIndex, lastIndex, stack);
  const count = getPieceCount(sectionIndex, lastIndex, stack);
  const height = (bounds.bottomY - bounds.topY) / count;
  return Object.freeze(Array.from({ length: count }, (_, index) => {
    return createPiece(section, bounds.topY, height, index);
  }));
}

function createPiece(section, topY, height, index) {
  return Object.freeze({
    index,
    templateId: section.roomPattern[index % section.roomPattern.length],
    y: topY + index * height,
    height,
  });
}

function getStackBounds(section, index, lastIndex, stack) {
  return Object.freeze({
    topY: index === lastIndex ? stack.bossRoomBottomY : section.topY,
    bottomY: index === 0 ? stack.startRoomTopY : section.bottomY,
  });
}

function getPieceCount(index, lastIndex, stack) {
  if (index === 0) return stack.firstSectionPieces;
  if (index === lastIndex) return stack.lastSectionPieces;
  return stack.piecesPerSection;
}
