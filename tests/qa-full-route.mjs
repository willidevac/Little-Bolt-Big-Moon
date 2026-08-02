import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PlatformRouteBuilder } from "../classes/systems/platform-route-builder.class.js";
import { MovingPlatform } from "../classes/environment/moving-platform.class.js";

const levelData = JSON.parse(
  await readFile(new URL("../data/levels/level-01.json", import.meta.url), "utf8"),
);
const route = new PlatformRouteBuilder(levelData.width).build(levelData.sections);
const mainRoute = route.filter(({ roomRole }) => roomRole !== "shortcut");

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
assert.equal(new Set(mainRoute.map((platform) => platform.y)).size, mainRoute.length);
assert.deepEqual(
  new Set(route.map((platform) => platform.tileset)),
  new Set(["scrapyard", "factory", "launch-tower", "space-station", "moon"]),
);
assert.ok(route.some(({ type }) => type === "moving"));
assert.ok(route.some(({ type }) => type === "falling"));
assert.ok(route.some(({ type }) => type === "narrow"));

levelData.sections.forEach(assertSectionRoute);

function assertSectionRoute(section) {
  const sectionPlatforms = mainRoute
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
  const boundaryPlatforms = mainRoute.filter((platform) => {
    return Math.abs(platform.y - section.topY) <= 128;
  });
  const catchPlatforms = boundaryPlatforms.filter((platform) => {
    return platform.type === "catch" && !platform.roomId;
  });
  assert.equal(catchPlatforms.length, 1);
});

const completeRoute = [...mainRoute].sort((first, second) => second.y - first.y);
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

const movingPlatforms = route.filter(({ type }) => type === "moving");
assert.ok(movingPlatforms.every(({ movement }) => {
  return movement.minimumX >= 64 &&
    movement.maximumX <= levelData.width - 64 - platformWidths.moving &&
    movement.minimumX < movement.maximumX;
}));

const moonFortressPlatforms = route.filter(({ id }) => {
  return id.startsWith("moon-warden-fortress");
});
[
  { x: 544, y: 8964, type: "narrow" },
  { x: 160, y: 7564, type: "path" },
  { x: 384, y: 6164, type: "falling" },
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
    .map(({ id, x, y, anchorPlatformId }) => ({
      id, x, y, width: 64, anchorPlatformId,
    })),
  ...levelData.enemies
    .filter(({ id, type }) => {
      return id.startsWith("factory-") && type === "scrapCrawler";
    })
    .map(({ id, x, y }) => ({ id, x, y, width: 96 })),
];
const factoryPlatforms = route.filter(({ y }) => y >= 90000 && y < 120000);
factoryAnchors.forEach((anchor) => {
  const support = factoryPlatforms.find((platform) => {
    const overlaps = anchor.x < platform.x + platformWidths[platform.type] &&
      anchor.x + anchor.width > platform.x;
    return platform.y === anchor.y + 64 && overlaps;
  });
  assert.ok(support, `${anchor.id} hat keine pixelgenaue feste Plattform.`);
  if (!anchor.anchorPlatformId && anchor.id !== "factory-gear-01") {
    assert.equal(support.type, "path");
  }
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
