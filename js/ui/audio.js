import { AudioManager } from "../../classes/systems/audio-manager.class.js";
import {
  GameAudioController,
} from "../../classes/systems/game-audio-controller.class.js";
import { GAME_CONFIG } from "../config/game-config.js";

/**
 * Creates the central audio controller.
 * @param {import("../../classes/core/game.class.js").Game} game Active game instance coordinated by the controller.
 * @param {EventTarget} [eventTarget=document] Event target used to register interaction listeners.
 * @returns {GameAudioController}
 */
export function initializeAudio(game, eventTarget = document) {
  const audioManager = new AudioManager(GAME_CONFIG.audio).initialize();
  return new GameAudioController(
    game,
    audioManager,
    eventTarget,
  ).initialize();
}
