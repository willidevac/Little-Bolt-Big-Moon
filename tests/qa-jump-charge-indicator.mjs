import assert from "node:assert/strict";
import { JumpChargeIndicator } from
  "../classes/effects/jump-charge-indicator.class.js";

const context = createContext();
const indicator = new JumpChargeIndicator({ width: 1280, height: 720 });
const camera = { x: 0, y: 0 };
const character = {
  x: 100,
  y: 200,
  width: 64,
  height: 64,
  isChargingJump: false,
  jumpChargePercent: 50,
};

assert.equal(indicator.draw(context, character, camera), false);
assert.deepEqual(context.rectangles, []);

character.isChargingJump = true;
assert.equal(indicator.draw(context, character, camera), true);
assert.deepEqual(context.rectangles, [
  ["fill", "#02070d", 96, 178, 72, 10],
  ["fill", "#32e1df", 98, 180, 34, 6],
  ["stroke", "#f1d6a4", 96, 178, 72, 10],
]);

context.rectangles.length = 0;
character.y = 10;
character.jumpChargePercent = 100;
indicator.draw(context, character, camera);
assert.deepEqual(context.rectangles[1], [
  "fill", "#cf6f28", 98, 88, 68, 6,
]);

console.log("FB-002: Die Sprungkraft wird direkt bei Byte angezeigt.");

function createContext() {
  return {
    rectangles: [], fillStyle: "", strokeStyle: "", lineWidth: 0,
    save() {}, restore() {},
    fillRect(x, y, width, height) {
      this.rectangles.push(["fill", this.fillStyle, x, y, width, height]);
    },
    strokeRect(x, y, width, height) {
      this.rectangles.push(["stroke", this.strokeStyle, x, y, width, height]);
    },
  };
}
