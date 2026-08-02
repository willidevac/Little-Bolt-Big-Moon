import { getAssetPath } from "./asset-paths.js";

const ATLAS_WIDTH = 1672;
const ATLAS_HEIGHT = 941;
const BIOME_IDS = new Set([
  "scrapyard",
  "factory",
  "launch-tower",
  "space-station",
  "moon",
]);

const BASE_FRAMES = Object.freeze({
  leftWall: createFrame(24, 16, 390, 684),
  facade: createFrame(400, 16, 650, 390),
  rightWall: createFrame(1060, 12, 600, 470),
  arch: createFrame(420, 420, 550, 280),
  overhead: createFrame(12, 704, 725, 237),
  tower: createFrame(950, 448, 275, 452),
  leftCorner: createFrame(1218, 556, 205, 340),
  rightCorner: createFrame(1408, 596, 260, 305),
  ledge: createFrame(718, 816, 250, 125),
});

const ALTERNATE_FRAMES = Object.freeze({
  scrapyard: createFrameSet({
    leftWall: [42, 14, 340, 680], facade: [372, 28, 770, 350],
    rightWall: [1138, 14, 520, 460], arch: [394, 384, 570, 320],
    overhead: [48, 684, 720, 257], tower: [968, 382, 250, 526],
    leftCorner: [1234, 548, 195, 350], rightCorner: [1422, 552, 240, 356],
    ledge: [718, 804, 250, 137],
  }),
  factory: createFrameSet({
    leftWall: [32, 30, 350, 610], facade: [386, 24, 675, 370],
    rightWall: [1050, 28, 560, 360], arch: [354, 382, 530, 270],
    overhead: [890, 388, 520, 280], tower: [1322, 398, 290, 520],
    leftCorner: [36, 650, 390, 260], rightCorner: [490, 660, 390, 250],
    ledge: [950, 742, 225, 170],
  }),
  "launch-tower": createFrameSet({
    leftWall: [18, 12, 365, 910], facade: [384, 8, 680, 420],
    rightWall: [1064, 130, 548, 300], arch: [382, 438, 410, 484],
    overhead: [882, 432, 690, 250], tower: [780, 608, 165, 314],
    leftCorner: [958, 620, 225, 302], rightCorner: [1198, 628, 238, 294],
    ledge: [1428, 704, 200, 218],
  }),
  "space-station": createFrameSet({
    leftWall: [24, 20, 365, 895], facade: [392, 12, 670, 382],
    rightWall: [1068, 54, 570, 330], arch: [382, 396, 530, 270],
    overhead: [936, 410, 660, 260], tower: [382, 660, 210, 260],
    leftCorner: [630, 658, 282, 264], rightCorner: [944, 660, 282, 262],
    ledge: [1280, 672, 310, 250],
  }),
  moon: createFrameSet({
    leftWall: [28, 12, 370, 670], facade: [392, 18, 640, 360],
    rightWall: [1020, 36, 620, 370], arch: [382, 382, 590, 330],
    overhead: [960, 438, 530, 220], tower: [1442, 396, 210, 526],
    leftCorner: [326, 666, 310, 256], rightCorner: [882, 656, 330, 266],
    ledge: [1242, 772, 225, 150],
  }),
});

/** Returns one shared sprite-atlas definition for a world biome. */
export function createArchitectureAtlasConfig(biomeId, variantId = "base") {
  assertBiomeId(biomeId);
  assertVariantId(variantId);
  const alternateSuffix = variantId === "alternate" ? "-alt" : "";
  const fileName = `${biomeId}-architecture${alternateSuffix}-clean-hd.png`;
  return Object.freeze({
    source: getAssetPath("tilesets", fileName),
    width: ATLAS_WIDTH,
    height: ATLAS_HEIGHT,
  });
}

/** Returns the crop map belonging to one biome architecture atlas. */
export function getArchitectureFrames(biomeId, variantId = "base") {
  assertBiomeId(biomeId);
  if (variantId === "base") return BASE_FRAMES;
  const frames = ALTERNATE_FRAMES[biomeId];
  if (variantId === "alternate" && frames) return frames;
  throw new RangeError(`Unknown architecture variant: ${variantId}`);
}

function assertBiomeId(biomeId) {
  if (!BIOME_IDS.has(biomeId)) {
    throw new RangeError(`Unknown architecture biome: ${biomeId}`);
  }
}

function assertVariantId(variantId) {
  if (variantId !== "base" && variantId !== "alternate") {
    throw new RangeError(`Unknown architecture variant: ${variantId}`);
  }
}

function createFrame(x, y, width, height) {
  return Object.freeze({ x, y, width, height });
}

function createFrameSet(definitions) {
  return Object.freeze(Object.fromEntries(
    Object.entries(definitions).map(([id, values]) => {
      return [id, createFrame(...values)];
    }),
  ));
}
