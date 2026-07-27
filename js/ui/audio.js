import { AudioManager } from "../../classes/systems/audio-manager.class.js";
import {
  GameAudioController,
} from "../../classes/systems/game-audio-controller.class.js";
import { GAME_CONFIG } from "../config/game-config.js";

let audioController = null;

/**
 * Erstellt die zentrale Audiosteuerung genau einmal.
 * @param {import("../../classes/core/game.class.js").Game} game
 * @param {EventTarget} [eventTarget=document]
 * @returns {GameAudioController}
 */
export function initializeAudio(game, eventTarget = document) {
  if (audioController) return audioController;
  const audioManager = new AudioManager(GAME_CONFIG.audio).initialize();
  audioController = new GameAudioController(
    game,
    audioManager,
    eventTarget,
  ).initialize();
  return audioController;
}
