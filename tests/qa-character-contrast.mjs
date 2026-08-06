import assert from "node:assert/strict";
import { BYTE_CONTRAST_SHADOW } from
  "../js/config/character-visual-config.js";

globalThis.Image = class FakeImage {
  constructor() {
    this.naturalWidth = 512;
    this.naturalHeight = 320;
  }

  set src(value) {
    this.source = value;
    this.onload?.();
  }
};

const { Character } = await import("../classes/entities/character.class.js");
const character = new Character();

assertContrast(1);
assertContrast(-1);

console.log("ART-020: Byte besitzt in beiden Blickrichtungen eine Kontrastkontur.");

/** Verifies the configured dark shadow reaches each sprite draw direction. */
function assertContrast(direction) {
  const context = createContext();
  character.facingDirection = direction;
  character.draw(context);
  assert.equal(context.drawCalls, 1);
  assert.equal(context.shadowColor, BYTE_CONTRAST_SHADOW.color);
  assert.equal(context.shadowBlur, BYTE_CONTRAST_SHADOW.blurPixels);
  assert.equal(context.shadowOffsetX, BYTE_CONTRAST_SHADOW.offsetXPixels);
  assert.equal(context.shadowOffsetY, BYTE_CONTRAST_SHADOW.offsetYPixels);
}

/** Creates the complete canvas contract used by Byte's sprite renderer. */
function createContext() {
  return {
    drawCalls: 0,
    save() {}, restore() {}, translate() {}, scale() {},
    drawImage() { this.drawCalls += 1; },
    set globalAlpha(value) { this.alpha = value; },
  };
}
