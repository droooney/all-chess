import * as _ from 'lodash';
import { Socket } from 'socket.io-client';

import {
  AnyMove,
  BaseMove,
  ColorEnum,
  DarkChessGame,
  DarkChessMove,
  Game as IGame,
  GameStatusEnum,
  Move,
  Player,
  RevertableMove
} from '../../types';
import { Game as GameHelper } from '../../shared/helpers';

type GameEvent = 'updateChat' | 'updateGame';

export class Game extends GameHelper {
  static getGameFromPgn(pgn: string): Game {
    const game = super.getGameFromPgn(pgn);

    return new Game(game);
  }

  static isLightColor(color: ColorEnum): boolean {
    return color === ColorEnum.WHITE;
  }

  socket?: Socket;
  currentMoveIndex: number;
  isOngoingDarkChessGame: boolean;
  darkChessMode: ColorEnum | null;
  showDarkChessHiddenPieces: boolean;
  listeners: {
    [event in GameEvent]: (() => void)[];
  } = {
    updateChat: [],
    updateGame: []
  };

  constructor(game: IGame | DarkChessGame, socket?: Socket, player?: Player | null) {
    super({
      id: game.id,
      pgnTags: game.pgnTags,
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
    this.isOngoingDarkChessGame = this.isDarkChess && this.status !== GameStatusEnum.FINISHED;
    this.showDarkChessHiddenPieces = !this.isOngoingDarkChessGame;
    this.darkChessMode = this.isDarkChess && player ? player.color : null;

    const moves: (Move | DarkChessMove)[] = game.moves;

    if (this.isOngoingDarkChessGame) {
      this.pieces = this.visiblePieces[player!.color];

      moves.forEach((move) => {
        this.registerLocalDarkChessMove(move as DarkChessMove);
      });
    } else {
      moves.forEach((move) => {
        this.registerAnyMove(move as Move);
      });
    }

    if (socket) {
      socket.on('moveMade', (move) => {
        this.onMoveMade(move, false);
      });

      socket.on('darkChessMoveMade', (move) => {
        this.onMoveMade(move, true);
      });

      socket.on('updatePlayers', (players) => {
        this.players = players;

        this.updateGame();
      });

      socket.on('gameOver', (result) => {
        this.end(result.winner, result.reason);
        this.updateGame();
      });

      socket.on('darkChessMoves', (moves) => {
        this.isOngoingDarkChessGame = false;
        this.showDarkChessHiddenPieces = true;

        this.onDarkChessMoves(moves);
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
  }

  changeDarkChessMode() {
    if (this.darkChessMode === ColorEnum.BLACK) {
      this.darkChessMode = null;
      this.showDarkChessHiddenPieces = true;

      this.onDarkChessMoves(this.moves);
    } else {
      this.darkChessMode = this.darkChessMode
        ? ColorEnum.BLACK
        : ColorEnum.WHITE;

      if (this.showDarkChessHiddenPieces) {
        if (this.darkChessMode === ColorEnum.BLACK) {
          this.onDarkChessMoves(this.moves);
        }
      } else if (this.currentMoveIndex === -1) {
        this.onDarkChessMoves(this.moves);

        this.pieces = this.visiblePieces[this.darkChessMode];
      } else {
        this.pieces = this.colorMoves[this.darkChessMode][this.currentMoveIndex].pieces;
      }
    }

    this.updateGame();
  }

  destroy() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }

  emit(event: GameEvent) {
    this.listeners[event].forEach((listener) => listener());
  }

  getUsedMoves(): AnyMove[] {
    return this.darkChessMode && !this.showDarkChessHiddenPieces
      ? this.colorMoves[this.darkChessMode]
      : this.moves;
  }

  move(move: BaseMove) {
    if (this.socket) {
      this.socket.emit('makeMove', move);
    }
  }

  moveBack(updateGame: boolean = true) {
    if (this.currentMoveIndex > -1) {
      this.revertAnyMove();
      this.currentMoveIndex--;

      if (updateGame) {
        this.updateGame();
      }
    }
  }

  moveForward(updateGame: boolean = true) {
    if (this.currentMoveIndex < this.getUsedMoves().length - 1) {
      this.currentMoveIndex++;
      this.performAnyMove();

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

  onDarkChessMoves(moves: Move[]) {
    this.colorMoves = {
      [ColorEnum.WHITE]: [],
      [ColorEnum.BLACK]: []
    };
    this.moves = [];

    this.setupStartingData();

    const { currentMoveIndex } = this;

    moves.forEach((move) => {
      this.registerAnyMove(move);
    });

    this.currentMoveIndex = this.moves.length - 1;

    this.navigateToMove(currentMoveIndex, false);
  }

  onMoveMade(move: DarkChessMove, isDarkChessMove: true): void;
  onMoveMade(move: Move, isDarkChessMove: false): void;
  onMoveMade(move: DarkChessMove | Move, isDarkChessMove: boolean): void {
    const moves = this.darkChessMode
      ? this.colorMoves[this.darkChessMode]
      : this.moves;
    let { currentMoveIndex } = this;

    if (currentMoveIndex === moves.length - 1) {
      currentMoveIndex++;
    }

    this.navigateToMove(moves.length - 1, false);

    if (isDarkChessMove) {
      this.colorMoves[this.darkChessMode!] = [...(moves as DarkChessMove[])];

      this.registerLocalDarkChessMove(move as DarkChessMove);
    } else {
      this.moves = [...(moves as RevertableMove[])];

      this.registerMove(move as Move);
    }

    this.currentMoveIndex++;

    this.navigateToMove(currentMoveIndex, false);
    this.updateGame();
  }

  performAnyMove() {
    if (this.darkChessMode && !this.showDarkChessHiddenPieces) {
      this.performDarkChessMove(this.colorMoves[this.darkChessMode][this.currentMoveIndex]);
    } else {
      this.performMove(this.moves[this.currentMoveIndex], false, false);
    }
  }

  performDarkChessMove(move: DarkChessMove): () => void {
    const oldPieces = this.pieces;
    const oldTurn = this.turn;

    this.movesCount++;
    this.turn = this.getNextTurn();
    this.pieces = move.pieces;
    this.visiblePieces[this.darkChessMode!] = move.pieces as any;

    return () => {
      this.movesCount--;
      this.turn = oldTurn;
      this.pieces = oldPieces;
      this.visiblePieces[this.darkChessMode!] = oldPieces as any;
    };
  }

  registerLocalDarkChessMove(move: DarkChessMove) {
    const revertMove = this.performDarkChessMove(move);

    this.colorMoves[this.darkChessMode!].push({
      ...move,
      revertMove
    });
  }

  revertAnyMove() {
    if (this.darkChessMode && !this.showDarkChessHiddenPieces) {
      this.colorMoves[this.darkChessMode][this.currentMoveIndex].revertMove();

      this.pieces = this.visiblePieces[this.darkChessMode];
    } else {
      this.moves[this.currentMoveIndex].revertMove();
    }
  }

  toggleShowDarkChessHiddenPieces() {
    this.showDarkChessHiddenPieces = !this.showDarkChessHiddenPieces;

    if (this.showDarkChessHiddenPieces) {
      this.onDarkChessMoves(this.moves);
    } else if (this.currentMoveIndex === -1) {
      this.onDarkChessMoves(this.moves);

      this.pieces = this.visiblePieces[this.darkChessMode!];
    } else {
      this.pieces = this.colorMoves[this.darkChessMode!][this.currentMoveIndex].pieces;
    }

    this.updateGame();
  }

  updateGame() {
    this.emit('updateGame');
  }
}
