import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { GAME_CONFIG } from "../js/config/game-config.js";

const VIEWPORTS = Object.freeze([
  Object.freeze({ width: 320, height: 180 }),
  Object.freeze({ width: 568, height: 320 }),
  Object.freeze({ width: 1024, height: 576 }),
  Object.freeze({ width: 1280, height: 720 }),
  Object.freeze({ width: 1440, height: 810 }),
]);
const layoutCss = await fs.readFile("styles/layout.css", "utf8");
const responsiveCss = await fs.readFile("styles/responsive.css", "utf8");
const touchCss = await fs.readFile("styles/touch-controls.css", "utf8");
const ignoreDrawCommand = () => {};
globalThis.Image = class FakeImage {
  constructor() {
    this.naturalWidth = 1024;
    this.naturalHeight = 1536;
  }

  set src(source) {
    this.source = source;
    this.onload?.();
  }
};
const { BackgroundRenderer } = await import(
  "../classes/systems/background-renderer.class.js"
);
const { createLevelOne } = await import("../js/levels/level-01.js");
const level = createLevelOne(GAME_CONFIG.enemies);

assert.equal(level.height, 150000);
assert.equal(level.sections.length, 15);
assertGaplessSections(level.sections);
assertResponsiveCss();
VIEWPORTS.forEach(assertViewportCoverage);
assertBiomeTransition();

console.log("QA-003: 320 bis 1440 Pixel und 150.000 Pixel Welt abgedeckt.");

function assertGaplessSections(sections) {
  sections.forEach((section, index) => {
    if (index === 0) assert.equal(section.bottomY, level.height);
    else assert.equal(section.bottomY, sections[index - 1].topY);
  });
  assert.equal(sections.at(-1).topY, 0);
}

function assertResponsiveCss() {
  assert.match(layoutCss, /overflow:\s*hidden/);
  assert.match(layoutCss, /1440px/);
  assert.match(layoutCss, /aspect-ratio:\s*16\s*\/\s*9/);
  assert.match(responsiveCss, /max-width:\s*1024px[\s\S]*orientation:\s*portrait/);
  assert.match(touchCss, /max-width:\s*1024px[\s\S]*orientation:\s*landscape/);
}

function assertViewportCoverage(viewport) {
  const renderer = new BackgroundRenderer(level.sections, viewport);
  for (let cameraY = 0; cameraY <= 149280; cameraY += 241) {
    const context = createContext();
    renderer.draw(context, { y: cameraY });
    assert.ok(context.images.length > 0, `${viewport.width}x${viewport.height}`);
    context.images.forEach((image) => {
      assert.equal(image[7], viewport.width);
      assert.equal(image[8], viewport.height);
    });
  }
}

function createContext() {
  return {
    images: [], gradients: [], fills: [],
    save: ignoreDrawCommand,
    restore: ignoreDrawCommand,
    beginPath: ignoreDrawCommand,
    rect: ignoreDrawCommand,
    clip: ignoreDrawCommand,
    fillRect: recordFill,
    strokeRect: ignoreDrawCommand,
    createLinearGradient: recordGradient,
    drawImage: recordImage,
  };
}

function recordImage(...parameters) {
  this.images.push(parameters);
}

function recordFill(...parameters) {
  this.fills.push(parameters);
}

function recordGradient(...coordinates) {
  const gradient = createGradient(coordinates);
  this.gradients.push(gradient);
  return gradient;
}

function createGradient(coordinates) {
  return {
    coordinates,
    stops: [],
    addColorStop(offset, color) { this.stops.push({ offset, color }); },
  };
}

function assertBiomeTransition() {
  const renderer = new BackgroundRenderer(level.sections, VIEWPORTS[3]);
  const context = createContext();
  renderer.draw(context, { y: 119640 });
  assert.equal(context.gradients.length, 1);
  assert.equal(context.gradients[0].stops.length, 5);
  assert.deepEqual(context.fills[0], [0, 264, 1280, 192]);
}
