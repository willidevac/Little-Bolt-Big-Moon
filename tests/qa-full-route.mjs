import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PlatformRouteBuilder } from "../classes/systems/platform-route-builder.class.js";
import { MovingPlatform } from "../classes/environment/moving-platform.class.js";

const levelData = JSON.parse(
  await readFile(new URL("../data/levels/level-01.json", import.meta.url), "utf8"),
);
const route = new PlatformRouteBuilder(levelData.width).build(levelData.sections);

assert.equal(levelData.height, 150000);
assert.equal(levelData.playerStart.y, 149760);
assert.equal(levelData.sections.length, 15);
assert.equal(levelData.sections[0].bottomY, levelData.height);
assert.equal(levelData.sections.at(-1).topY, 0);

levelData.sections.forEach((section, index) => {
  assert.equal(section.bottomY - section.topY, 10000);
  if (index > 0) {
    assert.equal(section.bottomY, levelData.sections[index - 1].topY);
  }
});

assert.ok(route.length >= 900);
assert.ok(route.every((platform) => platform.y >= 0 && platform.y <= levelData.height));
assert.equal(new Set(route.map((platform) => platform.y)).size, route.length);
assert.deepEqual(
  new Set(route.map((platform) => platform.tileset)),
  new Set(["scrapyard", "factory", "launch-tower", "space-station", "moon"]),
);
assert.equal(route.filter(({ type }) => type === "moving").length, 286);
assert.equal(route.filter(({ type }) => type === "narrow").length, 205);

levelData.sections.forEach(assertSectionRoute);

function assertSectionRoute(section) {
  const sectionPlatforms = route
    .filter((platform) => platform.id.startsWith(`${section.id}-`))
    .sort((first, second) => second.y - first.y);
  const gaps = getVerticalGaps(sectionPlatforms);
  assert.ok(gaps.every((gap) => gap >= 64 && gap <= getMaximumGap(section)));
  assert.ok(getHorizontalSteps(section).every((step) => step <= 288));
}

function getVerticalGaps(sectionPlatforms) {
  return sectionPlatforms.slice(1).map((platform, index) => {
    return sectionPlatforms[index].y - platform.y;
  });
}

function getMaximumGap(section) {
  if (!section.route.rooms) return 128;
  return Math.max(...section.route.rooms.flatMap(({ steps }) => {
    return steps.map(({ gapY }) => gapY);
  }));
}

function getHorizontalSteps(section) {
  const positions = section.route.horizontalPositions;
  return positions.map((x, index) => {
    return Math.abs(x - positions[(index + 1) % positions.length]);
  });
}

levelData.sections.slice(0, -1).forEach((section) => {
  const boundaryPlatforms = route.filter((platform) => {
    return Math.abs(platform.y - section.topY) <= 128;
  });
  const catchPlatforms = boundaryPlatforms.filter((platform) => {
    return platform.type === "catch";
  });
  assert.equal(catchPlatforms.length, 1);
});

const completeRoute = [...route].sort((first, second) => second.y - first.y);
const completeGaps = completeRoute.slice(1).map((platform, index) => {
  return completeRoute[index].y - platform.y;
});
assert.ok(completeGaps.every((gap) => gap >= 64 && gap <= 180));

const platformWidths = {
  floor: levelData.platformTypes.floor.tileFrames.length * 64,
  path: levelData.platformTypes.path.tileFrames.length * 64,
  narrow: levelData.platformTypes.narrow.tileFrames.length * 64,
  moving: levelData.platformTypes.moving.tileFrames.length * 64,
  falling: levelData.platformTypes.falling.tileFrames.length * 64,
  catch: levelData.platformTypes.catch.tileFrames.length * 64,
};
const horizontalGap = (lowerPlatform, upperPlatform) => {
  const lowerRight = lowerPlatform.x + platformWidths[lowerPlatform.type];
  const upperRight = upperPlatform.x + platformWidths[upperPlatform.type];
  if (upperPlatform.x > lowerRight) return upperPlatform.x - lowerRight;
  if (lowerPlatform.x > upperRight) return lowerPlatform.x - upperRight;
  return 0;
};
const jumpGaps = completeRoute.slice(1).map((upperPlatform, index) => {
  return {
    lowerPlatform: completeRoute[index],
    upperPlatform,
    horizontalGap: horizontalGap(completeRoute[index], upperPlatform),
  };
});
const precisionJumpIsReachable = (jump) => {
  return Array.from({ length: 101 }, (_, index) => index / 100)
    .some((ratio) => canLandPrecisionJump(jump, ratio));
};
const canLandPrecisionJump = ({ lowerPlatform, upperPlatform }, ratio) => {
  const gravity = 2200;
  const velocityY = 500 + 420 * ratio;
  const height = lowerPlatform.y - upperPlatform.y;
  const discriminant = velocityY ** 2 - 2 * gravity * height;
  if (discriminant < 0) return false;
  const time = (velocityY + Math.sqrt(discriminant)) / gravity;
  return [-1, 0, 1].some((direction) => {
    const distance = direction * (150 + 330 * ratio) * time;
    return landingIntervalsOverlap(lowerPlatform, upperPlatform, distance);
  });
};
const landingIntervalsOverlap = (lowerPlatform, upperPlatform, distance) => {
  const lowerLeft = lowerPlatform.x - 12 + distance;
  const lowerRight = lowerPlatform.x +
    platformWidths[lowerPlatform.type] - 52 + distance;
  const upperLeft = upperPlatform.x - 52;
  const upperRight = upperPlatform.x +
    platformWidths[upperPlatform.type] - 12;
  return lowerLeft <= upperRight && lowerRight >= upperLeft;
};
const unreachableJumps = jumpGaps.filter((jump) => {
  return !precisionJumpIsReachable(jump);
});
assert.deepEqual(
  unreachableJumps,
  [],
  `Nicht erreichbare Sprünge: ${unreachableJumps.map((jump) => {
    return `${jump.lowerPlatform.id} -> ${jump.upperPlatform.id} (${jump.horizontalGap}px)`;
  }).join(", ")}`,
);

const firstSectionId = levelData.sections[0].id;
const firstSectionPlatforms = route.filter(({ id }) => id.startsWith(firstSectionId));
assert.equal(firstSectionPlatforms.length, 72);
assert.equal(levelData.sections[0].route.rooms.length, 14);

const secondSectionId = levelData.sections[1].id;
const secondSectionPlatforms = route.filter(({ id }) => id.startsWith(secondSectionId));
assert.equal(secondSectionPlatforms.length, 71);
assert.equal(levelData.sections[1].route.rooms.length, 14);

const thirdSectionId = levelData.sections[2].id;
const thirdSectionPlatforms = route.filter(({ id }) => id.startsWith(thirdSectionId));
assert.equal(thirdSectionPlatforms.length, 71);
assert.equal(levelData.sections[2].route.rooms.length, 14);
const thirdMovingPlatforms = thirdSectionPlatforms.filter(({ type }) => {
  return type === "moving";
});
assert.equal(thirdMovingPlatforms.length, 16);
assert.ok(thirdMovingPlatforms.every(({ movement }) => {
  return movement.minimumX >= 64 &&
    movement.maximumX <= levelData.width - 64 - platformWidths.moving &&
    movement.minimumX < movement.maximumX;
}));

const fourthSectionId = levelData.sections[3].id;
const fourthSectionPlatforms = route.filter(({ id }) => id.startsWith(fourthSectionId));
assert.equal(fourthSectionPlatforms.length, 71);
assert.equal(levelData.sections[3].route.rooms.length, 14);
assert.equal(
  fourthSectionPlatforms.filter(({ type }) => type === "moving").length,
  15,
);
assert.equal(
  fourthSectionPlatforms.filter(({ type }) => type === "falling").length,
  14,
);

const fifthSectionId = levelData.sections[4].id;
const fifthSectionPlatforms = route.filter(({ id }) => id.startsWith(fifthSectionId));
assert.equal(fifthSectionPlatforms.length, 61);
assert.equal(levelData.sections[4].route.rooms.length, 12);
assert.equal(
  fifthSectionPlatforms.filter(({ type }) => type === "moving").length,
  17,
);
assert.equal(
  fifthSectionPlatforms.filter(({ type }) => type === "falling").length,
  17,
);
assert.equal(
  fifthSectionPlatforms.filter(({ type }) => type === "narrow").length,
  13,
);

const sixthSectionId = levelData.sections[5].id;
const sixthSectionPlatforms = route.filter(({ id }) => id.startsWith(sixthSectionId));
assert.equal(sixthSectionPlatforms.length, 61);
assert.equal(levelData.sections[5].route.rooms.length, 12);
assert.equal(
  sixthSectionPlatforms.filter(({ type }) => type === "moving").length,
  23,
);
assert.equal(
  sixthSectionPlatforms.filter(({ type }) => type === "falling").length,
  22,
);
assert.equal(
  sixthSectionPlatforms.filter(({ type }) => type === "narrow").length,
  11,
);

const seventhSectionId = levelData.sections[6].id;
const seventhSectionPlatforms = route.filter(({ id }) => {
  return id.startsWith(seventhSectionId);
});
assert.equal(seventhSectionPlatforms.length, 61);
assert.equal(levelData.sections[6].route.rooms.length, 12);
assert.equal(
  seventhSectionPlatforms.filter(({ type }) => type === "moving").length,
  22,
);
assert.equal(
  seventhSectionPlatforms.filter(({ type }) => type === "falling").length,
  21,
);
assert.equal(
  seventhSectionPlatforms.filter(({ type }) => type === "narrow").length,
  12,
);

const eighthSectionId = levelData.sections[7].id;
const eighthSectionPlatforms = route.filter(({ id }) => {
  return id.startsWith(eighthSectionId);
});
assert.equal(eighthSectionPlatforms.length, 61);
assert.equal(levelData.sections[7].route.rooms.length, 12);
assert.equal(
  eighthSectionPlatforms.filter(({ type }) => type === "moving").length,
  23,
);
assert.equal(
  eighthSectionPlatforms.filter(({ type }) => type === "falling").length,
  22,
);
assert.equal(
  eighthSectionPlatforms.filter(({ type }) => type === "narrow").length,
  12,
);

const ninthSectionId = levelData.sections[8].id;
const ninthSectionPlatforms = route.filter(({ id }) => {
  return id.startsWith(ninthSectionId);
});
assert.equal(ninthSectionPlatforms.length, 61);
assert.equal(levelData.sections[8].route.rooms.length, 12);
assert.equal(
  ninthSectionPlatforms.filter(({ type }) => type === "moving").length,
  24,
);
assert.equal(
  ninthSectionPlatforms.filter(({ type }) => type === "falling").length,
  22,
);
assert.equal(
  ninthSectionPlatforms.filter(({ type }) => type === "narrow").length,
  12,
);

const tenthSectionId = levelData.sections[9].id;
const tenthSectionPlatforms = route.filter(({ id }) => {
  return id.startsWith(tenthSectionId);
});
assert.equal(tenthSectionPlatforms.length, 61);
assert.equal(levelData.sections[9].route.rooms.length, 12);
assert.equal(
  tenthSectionPlatforms.filter(({ type }) => type === "moving").length,
  24,
);
assert.equal(
  tenthSectionPlatforms.filter(({ type }) => type === "falling").length,
  23,
);
assert.equal(
  tenthSectionPlatforms.filter(({ type }) => type === "narrow").length,
  12,
);

const finalSectionExpectations = [
  { index: 10, moving: 24, falling: 23, narrow: 12 },
  { index: 11, moving: 25, falling: 22, narrow: 12 },
  { index: 12, moving: 24, falling: 23, narrow: 12 },
  { index: 13, moving: 25, falling: 23, narrow: 12 },
  { index: 14, moving: 24, falling: 21, narrow: 11 },
];
finalSectionExpectations.forEach((expectation) => {
  const section = levelData.sections[expectation.index];
  const platforms = route.filter(({ id }) => id.startsWith(section.id));
  assert.equal(platforms.length, 61);
  assert.equal(section.route.rooms.length, 12);
  ["moving", "falling", "narrow"].forEach((type) => {
    assert.equal(
      platforms.filter((platform) => platform.type === type).length,
      expectation[type],
    );
  });
});

const moonFortressPlatforms = route.filter(({ id }) => {
  return id.startsWith("moon-warden-fortress");
});
[
  { x: 384, y: 8964, type: "path" },
  { x: 160, y: 7564, type: "path" },
  { x: 384, y: 6164, type: "path" },
  { x: 384, y: 792, type: "catch" },
].forEach((expectedPlatform) => {
  assert.ok(moonFortressPlatforms.some((platform) => {
    return platform.x === expectedPlatform.x &&
      platform.y === expectedPlatform.y &&
      platform.type === expectedPlatform.type;
  }));
});

const factoryAnchors = [
  ...levelData.collectables
    .filter(({ id }) => id.startsWith("factory-"))
    .map(({ id, x, y }) => ({ id, x, y, width: 64 })),
  ...levelData.enemies
    .filter(({ id }) => id.startsWith("factory-"))
    .map(({ id, x, y }) => ({ id, x, y, width: 96 })),
];
factoryAnchors.forEach((anchor) => {
  const support = fourthSectionPlatforms.find((platform) => {
    const overlaps = anchor.x < platform.x + platformWidths[platform.type] &&
      anchor.x + anchor.width > platform.x;
    return platform.y === anchor.y + 64 && overlaps;
  });
  assert.ok(support, `${anchor.id} hat keine pixelgenaue feste Plattform.`);
  assert.equal(support.type, "path");
});

const movingData = route.find(({ type }) => type === "moving");
const movingPlatform = new MovingPlatform({
  ...movingData,
  tileFrames: [0, 2, 3],
}, {
  source: "./test.png",
  frameWidth: 32,
  frameHeight: 32,
  frameCount: 32,
  renderScale: 2,
  surfaceOffset: 12,
});
const initialMovingX = movingPlatform.x;
movingPlatform.update(0.5);
assert.notEqual(movingPlatform.x, initialMovingX);

console.log(`QA-005: ${route.length} Plattformen auf ${levelData.height} Pixeln erreichbar.`);
