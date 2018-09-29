import * as _ from 'lodash';
import { Socket } from 'socket.io-client';

import {
  ColorEnum,
  Game as IGame
} from '../../types';
import { Game as GameHelper } from '../../shared/helpers';

type GameEvent = 'updateChat' | 'updateGame';

export class Game extends GameHelper {
  static isLightColor(color: ColorEnum): boolean {
    return color === ColorEnum.WHITE;
  }

  socket: Socket;
  currentMoveIndex: number;
  listeners: {
    [event in GameEvent]: (() => void)[];
  } = {
    updateChat: [],
    updateGame: []
  };

  constructor(game: IGame, socket: Socket) {
    super({
      id: game.id,
      startingData: game.startingData,
      timeControl: game.timeControl,
      variants: game.variants
    });

    this.drawOffer = game.drawOffer;
    this.status = game.status;
    this.result = game.result;
    this.players = game.players;
    this.currentMoveIndex = game.moves.length - 1;
    this.chat = game.chat;
    this.socket = socket;

    game.moves.forEach((move) => {
      this.registerMove(move);
    });

    socket.on('moveMade', (move) => {
      let { currentMoveIndex } = this;

      if (currentMoveIndex === this.moves.length - 1) {
        currentMoveIndex++;
      }

      this.navigateToMove(this.moves.length - 1, false);

      this.moves = [...this.moves];

      this.registerMove(move);

      this.currentMoveIndex++;

      this.navigateToMove(currentMoveIndex, false);
      this.updateGame();
    });

    socket.on('updatePlayers', (players) => {
      this.players = players;

      this.updateGame();
    });

    socket.on('gameOver', (result) => {
      this.end(result.winner, result.reason);
      this.updateGame();
    });

    socket.on('newChatMessage', (chatMessage) => {
      this.chat = [
        ...this.chat,
        chatMessage
      ];

      this.emit('updateChat');
    });

    socket.on('drawOffered', (color) => {
      this.drawOffer = color;

      this.updateGame();
    });

    socket.on('drawDeclined', () => {
      this.drawOffer = null;

      this.updateGame();
    });

    socket.on('drawCanceled', () => {
      this.drawOffer = null;

      this.updateGame();
    });
  }

  destroy() {
    this.socket.disconnect();
  }

  emit(event: GameEvent) {
    this.listeners[event].forEach((listener) => listener());
  }

  moveBack(updateGame: boolean = true) {
    if (this.currentMoveIndex > -1) {
      this.moves[this.currentMoveIndex].revertMove();
      this.currentMoveIndex--;

      if (updateGame) {
        this.updateGame();
      }
    }
  }

  moveForward(updateGame: boolean = true) {
    if (this.currentMoveIndex + 1 < this.moves.length) {
      this.currentMoveIndex++;
      this.performMove(this.moves[this.currentMoveIndex], false, false);

      if (updateGame) {
        this.updateGame();
      }
    }
  }

  navigateToMove(moveIndex: number, updateGame: boolean = true) {
    if (this.currentMoveIndex === moveIndex) {
      return;
    }

    if (moveIndex < this.currentMoveIndex) {
      _.times(this.currentMoveIndex - moveIndex, () => {
        this.moveBack(false);
      });
    } else {
      _.times(moveIndex - this.currentMoveIndex, () => {
        this.moveForward(false);
      });
    }

    if (updateGame) {
      this.updateGame();
    }
  }

  on<K extends GameEvent>(event: K, listener: () => void) {
    this.listeners[event].push(listener);
  }

  updateGame() {
    this.emit('updateGame');
  }
}
