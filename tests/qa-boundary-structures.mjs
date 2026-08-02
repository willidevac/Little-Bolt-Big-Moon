import assert from "node:assert/strict";
import { BoundaryStructureRenderer } from
  "../classes/systems/boundary-structure-renderer.class.js";
import { GAME_CONFIG } from "../js/config/game-config.js";
import { createLevelOne } from "../js/levels/level-01.js";

const level = createLevelOne(GAME_CONFIG.enemies);
const renderer = new BoundaryStructureRenderer(level.sections, GAME_CONFIG);

assertBiomeWalls(149_000, ["#35251f", "#c86f32", "#efad58"]);
assertBiomeWalls(1_000, ["#393c45", "#e2cfaa", "#7de1df"]);
assert.throws(() => new BoundaryStructureRenderer([], GAME_CONFIG), TypeError);

console.log("FB-005: Sichtbare Biome-Wände stimmen mit der Abprallkante überein.");

function assertBiomeWalls(cameraY, colors) {
  const context = createContext();
  renderer.draw(context, { y: cameraY });
  assertWallBody(context.fills, 0, cameraY, colors[0]);
  assertWallBody(context.fills, 1_232, cameraY, colors[0]);
  colors.forEach((color) => assert.ok(context.fills.some((fill) => {
    return fill.color === color;
  })));
  assert.ok(context.fills.every(staysInsideWall));
}

function assertWallBody(fills, x, y, color) {
  assert.ok(fills.some((fill) => {
    return fill.x === x && fill.y === y && fill.width === 48 &&
      fill.height === 720 && fill.color === color;
  }));
}

function staysInsideWall(fill) {
  return fill.x + fill.width <= 48 || fill.x >= 1_232;
}

function createContext() {
  return {
    fills: [], currentFill: "", currentStroke: "",
    save() {}, restore() {}, beginPath() {}, rect() {}, clip() {},
    fillRect(x, y, width, height) {
      this.fills.push({ x, y, width, height, color: this.currentFill });
    },
    strokeRect() {},
    set fillStyle(value) { this.currentFill = value; },
    set strokeStyle(value) { this.currentStroke = value; },
    set lineWidth(value) { this.currentLineWidth = value; },
  };
}
