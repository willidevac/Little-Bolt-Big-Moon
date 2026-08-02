const LANDMARK_LAYOUTS = Object.freeze({
  bridge: createLayout(["leftCorner", "overhead", "rightCorner"]),
  chamber: createLayout(["leftWall", "facade", "rightWall"]),
  gate: createLayout(["leftCorner", "arch", "rightCorner"]),
  ruin: createLayout(["tower", "arch", "ledge"]),
  shaft: createLayout(["leftWall", "rightWall", "ledge"]),
});

/** Returns the three architecture pieces that form a landmark room. */
export function getLandmarkLayout(landmarkId) {
  const layout = LANDMARK_LAYOUTS[landmarkId];
  if (layout) return layout;
  throw new RangeError(`Unknown environment landmark: ${landmarkId}`);
}

function createLayout(frameIds) {
  return Object.freeze([...frameIds]);
}
