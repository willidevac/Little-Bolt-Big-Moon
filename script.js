import { Game } from "./classes/core/game.class.js";

const canvas = document.querySelector("#game-canvas");
const game = new Game(canvas);

game.initialize();

