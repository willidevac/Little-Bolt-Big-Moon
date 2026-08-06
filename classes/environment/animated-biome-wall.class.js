import { DrawableObject } from "../base/drawable-object.class.js";
import { WALL_TILE_HEIGHT, WALL_WIDTH } from
  "../../js/config/wall-course-config.js";

const DRAW_PADDING = 64;
const DEFAULT_FRAME_SECONDS = 0.18;
const EXIT_ASSIST_GRAVITY = 2200;
const EXIT_ASSIST_LANDING_MARGIN = 24;
const EXIT_ASSIST_MINIMUM_HORIZONTAL_SPEED = 140;

/** Draws one thin, animated, vertically tiled wall for a complete biome. */
export class AnimatedBiomeWall extends DrawableObject {
  /** @param {Readonly<object>} data @param {Readonly<object>} spriteConfig */
  constructor(data, spriteConfig) {
    super();
    this.#validate(data);
    this.#initialize(data, spriteConfig);
  }

  /** Initializes operation. */
  #initialize(data, spriteConfig) {
    const width = data.role === "early-trickshot-wall" ? data.width : WALL_WIDTH;
    Object.assign(this, data, { width });
    this.animationTime = data.phaseOffset ?? 0;
    this.animationFrameSeconds = data.animationFrameSeconds ??
      DEFAULT_FRAME_SECONDS;
    this.flowDirection = data.guidanceDirection === "up" ? -1 : 1;
    this.impactGlowSeconds = 0;
    this.contactTarget = null;
    this.contactSeconds = 0;
    this.loadSprite(spriteConfig);
  }

  /** Advances the four light-flow frames. */
  update(deltaTimeSeconds) {
    if (!Number.isFinite(deltaTimeSeconds) || deltaTimeSeconds <= 0) return;
    this.animationTime = (this.animationTime + deltaTimeSeconds) %
      (this.animationFrameSeconds * 4);
    this.impactGlowSeconds = Math.max(0, this.impactGlowSeconds - deltaTimeSeconds);
    this.contactSeconds = Math.max(0, this.contactSeconds - deltaTimeSeconds);
    if (this.contactSeconds === 0) this.contactTarget = null;
  }

  /** Draws only wall modules intersecting the current camera view. */
  draw(context, world) {
    if (this.imageState !== "ready") return;
    if (this.role === "early-trickshot-wall") {
      this.#drawTrickshotWall(context);
      this.#drawMeaningfulLight(context, this.y, this.y + this.height);
      return;
    }
    this.#drawBiomeWall(context, world);
  }

  /** Draws biome wall. */
  #drawBiomeWall(context, world) {
    const camera = world.camera;
    const top = Math.max(this.y, camera.y - DRAW_PADDING);
    const bottom = Math.min(
      this.y + this.height,
      camera.y + world.config.canvas.height + DRAW_PADDING,
    );
    if (bottom <= top) return;
    const firstTile = Math.floor((top - this.y) / WALL_TILE_HEIGHT);
    const lastTile = Math.floor((bottom - this.y) / WALL_TILE_HEIGHT);
    this.#drawTiles(context, firstTile, lastTile);
    this.#drawMeaningfulLight(context, top, bottom);
  }

  /** Draws tiles. */
  #drawTiles(context, firstTile, lastTile) {
    context.save();
    context.beginPath();
    context.rect(this.x, this.y, this.width, this.height);
    context.clip();
    for (let tileIndex = firstTile; tileIndex <= lastTile; tileIndex += 1) {
      this.#drawTile(context, tileIndex);
    }
    context.restore();
  }

  /** Draws trickshot wall. */
  #drawTrickshotWall(context) {
    this.setFrameIndex(0);
    if (this.side === "left") {
      this.drawCurrentFrame(
        context, this.x, this.y, this.width, this.height,
      );
      return;
    }
    context.save();
    context.translate(this.x * 2 + this.width, 0);
    context.scale(-1, 1);
    this.drawCurrentFrame(context, this.x, this.y, this.width, this.height);
    context.restore();
  }

  /** Makes a successful wall rebound immediately readable. */
  onWallImpact(character, collisionDirection) {
    this.impactGlowSeconds = 0.3;
    if (!this.#isInnerImpact(collisionDirection)) return;
    this.contactTarget = character;
    this.contactSeconds = 0.1;
    this.#applyReboundImpulse(character);
  }

  /** Applies rebound impulse. */
  #applyReboundImpulse(character) {
    if (this.role !== "wall-bounce-choke" || character?.isOnGround) return;
    const regularDirection = this.side === "left" ? 1 : -1;
    const exitAssist = this.#getExitAssist(character, regularDirection);
    const rebound = this.#createRebound(exitAssist, regularDirection);
    if (typeof character?.beginControlledWallRebound === "function") {
      character.beginControlledWallRebound(rebound);
      return;
    }
    this.#applyFallbackRebound(character, rebound);
  }

  /** Creates rebound. */
  #createRebound(exitAssist, regularDirection) {
    return Object.freeze({
      direction: exitAssist?.direction ?? regularDirection,
      horizontalSpeedPixelsPerSecond: exitAssist?.horizontalSpeed ??
        this.reboundHorizontalSpeedPixelsPerSecond,
      verticalSpeedPixelsPerSecond: exitAssist?.verticalSpeed ??
        this.reboundVerticalSpeedPixelsPerSecond,
      controlSeconds: exitAssist?.controlSeconds ?? this.reboundControlSeconds,
      releasedVerticalRatio: this.reboundReleasedVerticalRatio,
      dropVerticalRatio: this.reboundDropVerticalRatio,
      forceFullVertical: Boolean(exitAssist),
    });
  }

  /** Applies fallback rebound. */
  #applyFallbackRebound(character, rebound) {
    if (typeof character?.applyUpwardImpulse !== "function") return;
    const input = character.wallReboundInput ?? {};
    const ratio = input.down
      ? rebound.dropVerticalRatio
      : input.jump ? 1 : rebound.releasedVerticalRatio;
    character.velocityX = rebound.direction *
      rebound.horizontalSpeedPixelsPerSecond;
    character.facingDirection = rebound.direction;
    character.applyUpwardImpulse(
      rebound.verticalSpeedPixelsPerSecond *
        (rebound.forceFullVertical ? 1 : ratio),
    );
  }

  /** Returns exit assist. */
  #getExitAssist(character, regularDirection) {
    if (!this.#canAssistExit(character)) return null;
    const { centerX, rise } = this.#getExitGeometry(character);
    const motion = this.#getExitMotion(rise, centerX, regularDirection);
    return Object.freeze({ ...motion,
      controlSeconds: this.exitAssistControlSeconds });
  }

  /** Checks whether assist exit. */
  #canAssistExit(character) {
    return Number.isFinite(character?.x) && Number.isFinite(character?.y) &&
      Number.isFinite(character?.width) && Number.isFinite(character?.height) &&
      character.y <= this.y + this.exitAssistBandPixels;
  }

  /** Returns exit geometry. */
  #getExitGeometry(character) {
    const bounds = typeof character.getCollisionBounds === "function"
      ? character.getCollisionBounds()
      : null;
    const centerX = bounds
      ? bounds.x + bounds.width / 2
      : character.x + character.width / 2;
    const footOffset = bounds
      ? bounds.y + bounds.height - character.y
      : character.height;
    const targetCharacterY = this.exitTargetSurfaceY - footOffset;
    const rise = Math.max(0, character.y - targetCharacterY);
    return { centerX, rise };
  }

  /** Returns exit motion. */
  #getExitMotion(rise, centerX, regularDirection) {
    const verticalSpeed = this.#getExitVerticalSpeed(rise);
    const discriminant = Math.max(
      0, verticalSpeed ** 2 - 2 * EXIT_ASSIST_GRAVITY * rise,
    );
    const flightSeconds = (verticalSpeed + Math.sqrt(discriminant)) /
      EXIT_ASSIST_GRAVITY;
    const horizontalDistance = this.exitTargetCenterX - centerX;
    const direction = Math.sign(horizontalDistance) || regularDirection;
    const horizontalSpeed = this.#getExitHorizontalSpeed(
      horizontalDistance, flightSeconds,
    );
    return { direction, verticalSpeed, horizontalSpeed };
  }

  /** Returns exit horizontal speed. */
  #getExitHorizontalSpeed(distance, flightSeconds) {
    return Math.min(
      this.exitAssistMaximumHorizontalSpeedPixelsPerSecond,
      Math.max(
        EXIT_ASSIST_MINIMUM_HORIZONTAL_SPEED,
        Math.abs(distance) / Math.max(0.1, flightSeconds),
      ),
    );
  }

  /** Returns exit vertical speed. */
  #getExitVerticalSpeed(rise) {
    const minimum = Math.sqrt(
      2 * EXIT_ASSIST_GRAVITY * (rise + EXIT_ASSIST_LANDING_MARGIN),
    );
    return Math.max(this.exitAssistVerticalSpeedPixelsPerSecond, minimum);
  }

  /** Checks whether inner impact. */
  #isInnerImpact(collisionDirection) {
    if (this.role !== "wall-bounce-choke") return true;
    const innerDirection = this.side === "left" ? 1 : -1;
    return collisionDirection === innerDirection;
  }

  /** Returns whether the character currently touches this wall. */
  wasTouchedBy(character) {
    return this.contactSeconds > 0 && this.contactTarget === character;
  }

  /** Returns one continuous thin wall collider. */
  getCollisionBoundsList() {
    return Object.freeze([Object.freeze({
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
      owner: this,
    })]);
  }

  /** Draws tile. */
  #drawTile(context, tileIndex) {
    const y = this.y + tileIndex * WALL_TILE_HEIGHT;
    if (y >= this.y + this.height) return;
    const phase = Math.floor(this.animationTime / this.animationFrameSeconds);
    const frame = ((phase * this.flowDirection + tileIndex) % 4 + 4) % 4;
    this.setFrameIndex(frame);
    if (this.side === "left") {
      this.drawCurrentFrame(context, this.x, y, this.width, WALL_TILE_HEIGHT);
      return;
    }
    this.#drawMirroredTile(context, y);
  }

  /** Draws mirrored tile. */
  #drawMirroredTile(context, y) {
    context.save();
    context.translate(this.x * 2 + this.width, 0);
    context.scale(-1, 1);
    this.drawCurrentFrame(context, this.x, y, this.width, WALL_TILE_HEIGHT);
    context.restore();
  }

  /** Draws meaningful light. */
  #drawMeaningfulLight(context, top, bottom) {
    if (bottom <= top || (!this.guidanceDirection &&
      this.impactGlowSeconds <= 0)) return;
    context.save();
    context.globalCompositeOperation = "lighter";
    if (this.guidanceDirection) this.#drawGuidance(context, top, bottom);
    if (this.impactGlowSeconds > 0) {
      context.globalAlpha = Math.min(0.72, this.impactGlowSeconds * 2.4);
      context.fillStyle = "#d9ffff";
      context.fillRect(this.x, top, this.width, bottom - top);
    }
    context.restore();
  }

  /** Draws guidance. */
  #drawGuidance(context, top, bottom) {
    const span = Math.max(1, bottom - top);
    const travel = (this.animationTime * 180) % span;
    context.fillStyle = this.guidanceColor ?? "#48f6f2";
    for (let index = 0; index < 3; index += 1) {
      const y = bottom - ((travel + index * 52) % span);
      context.globalAlpha = 0.2 + index * 0.09;
      context.fillRect(this.x + this.width / 2 - 3, y, 6, 18);
    }
  }

  /** Validates operation. */
  #validate(data) {
    const values = [data?.x, data?.y, data?.height];
    const hasValues = values.every(Number.isFinite) && data.height > 0;
    const trickshotWidthIsValid = data?.role !== "early-trickshot-wall" ||
      (Number.isFinite(data.width) && data.width > 0);
    const hasSide = data?.side === "left" || data?.side === "right";
    const reboundIsValid = this.#hasValidRebound(data);
    const reboundRatiosAreValid = data?.role !== "wall-bounce-choke" ||
      (data.reboundDropVerticalRatio < data.reboundReleasedVerticalRatio &&
        data.reboundReleasedVerticalRatio < 1);
    if (typeof data?.id === "string" && hasValues && hasSide &&
      trickshotWidthIsValid && reboundIsValid && reboundRatiosAreValid) return;
    throw new TypeError("The animated biome wall definition is invalid.");
  }

  /** Checks whether valid rebound. */
  #hasValidRebound(data) {
    return data?.role !== "wall-bounce-choke" || [
      data.reboundHorizontalSpeedPixelsPerSecond,
      data.reboundVerticalSpeedPixelsPerSecond,
      data.reboundControlSeconds,
      data.reboundReleasedVerticalRatio,
      data.reboundDropVerticalRatio,
      data.exitTargetCenterX,
      data.exitTargetSurfaceY,
      data.exitAssistBandPixels,
      data.exitAssistVerticalSpeedPixelsPerSecond,
      data.exitAssistMaximumHorizontalSpeedPixelsPerSecond, data.exitAssistControlSeconds,
    ].every((value) => Number.isFinite(value) && value > 0);
  }
}
