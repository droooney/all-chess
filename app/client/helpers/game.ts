import * as _ from 'lodash';
import { Socket } from 'socket.io-client';

import {
  AnyMove,
  BaseMove,
  ColorEnum,
  DarkChessGame,
  DarkChessMove,
  DarkChessRevertableMove,
  Game as IGame,
  GameStatusEnum,
  LocalMove,
  Move,
  Piece,
  Player,
  RevertableMove,
  Square,
  TimeControl,
  TimeControlEnum
} from '../../types';
import { Game as GameHelper } from '../../shared/helpers';
import {
  POSSIBLE_TIMER_BASES_IN_MINUTES,
  POSSIBLE_TIMER_BASES_IN_MILLISECONDS,
  POSSIBLE_TIMER_INCREMENTS_IN_SECONDS,
  POSSIBLE_TIMER_INCREMENTS_IN_MILLISECONDS,
  POSSIBLE_CORRESPONDENCE_BASES_IN_DAYS,
  POSSIBLE_CORRESPONDENCE_BASES_IN_MILLISECONDS
} from '../../shared/constants';
import { CIRCULAR_CHESS_EMPTY_CENTER_RATIO, SVG_SQUARE_SIZE } from '../constants';

type GameEvent = 'updateChat' | 'updateGame';

export interface InitGameOptions {
  game: IGame | DarkChessGame;

  socket?: Socket;
  player?: Player | null;
  currentMoveIndex?: number;
  timestamp?: number;
}

export class Game extends GameHelper {
  static getGameFromPgn(pgn: string): Game {
    const game = super.getGameFromPgn(pgn);

    return new Game({ game });
  }

  static isLightColor(color: ColorEnum): boolean {
    return color === ColorEnum.WHITE;
  }

  static getTimeControlString(timeControl: TimeControl): string {
    if (!timeControl) {
      return '∞';
    }

    if (timeControl.type === TimeControlEnum.CORRESPONDENCE) {
      const days = POSSIBLE_CORRESPONDENCE_BASES_IN_DAYS[POSSIBLE_CORRESPONDENCE_BASES_IN_MILLISECONDS.indexOf(timeControl.base)];

      return `${days} ${days === 1 ? 'day' : 'days'}`;
    }

    const base = POSSIBLE_TIMER_BASES_IN_MINUTES[POSSIBLE_TIMER_BASES_IN_MILLISECONDS.indexOf(timeControl.base)];
    const increment = POSSIBLE_TIMER_INCREMENTS_IN_SECONDS[POSSIBLE_TIMER_INCREMENTS_IN_MILLISECONDS.indexOf(timeControl.increment)];

    return `${base} + ${increment}`;
  }

  player?: Player | null;
  socket?: Socket;
  timeDiff = 0;
  moves: LocalMove[] = [];
  currentMoveIndex: number;
  isOngoingDarkChessGame: boolean;
  boardSidesRenderedRatio: number;
  boardCenterX: number;
  boardCenterY: number;
  darkChessMode: ColorEnum | null;
  showDarkChessHiddenPieces: boolean;
  needToCalculateMaterialDifference: boolean;
  listeners: Record<GameEvent, (() => void)[]> = {
    updateChat: [],
    updateGame: []
  };

  constructor({ game, socket, player, currentMoveIndex, timestamp }: InitGameOptions) {
    super({
      id: game.id,
      pgnTags: game.pgnTags,
      startingData: game.startingData,
      timeControl: game.timeControl,
      variants: game.variants
    });

    this.drawOffer = game.drawOffer;
    this.takebackRequest = game.takebackRequest;
    this.lastMoveTimestamp = game.lastMoveTimestamp;
    this.status = game.status;
    this.result = game.result;
    this.players = game.players;
    this.currentMoveIndex = game.moves.length - 1;
    this.chat = game.chat;
    this.player = player;
    this.socket = socket;
    this.isOngoingDarkChessGame = this.isDarkChess && this.status !== GameStatusEnum.FINISHED;
    this.showDarkChessHiddenPieces = !this.isOngoingDarkChessGame;
    this.boardSidesRenderedRatio = this.isCircularChess
      ? 1
      : this.isHexagonalChess
        ? (this.boardWidth * 3 + 1) / 2 / Math.sqrt(3) / this.boardHeight
        : this.boardWidth / this.boardHeight;
    this.boardCenterX = (
      this.isCircularChess
        ? this.boardOrthodoxWidth * SVG_SQUARE_SIZE
        : this.isHexagonalChess
          ? (this.boardWidth * 3 + 1) * SVG_SQUARE_SIZE / 2 / Math.sqrt(3)
          : this.boardWidth * SVG_SQUARE_SIZE
    ) / 2;
    this.boardCenterY = (
      this.isCircularChess
        ? this.boardOrthodoxWidth * SVG_SQUARE_SIZE
        : this.boardHeight * SVG_SQUARE_SIZE
    ) / 2;
    this.darkChessMode = this.isDarkChess && player ? player.color : null;
    this.needToCalculateMaterialDifference = (
      !this.isAbsorption
      && !this.isDarkChess
      && !this.isHorde
    );

    const moves: (Move | DarkChessMove)[] = game.moves;

    if (this.isOngoingDarkChessGame) {
      this.setPieces(this.visiblePieces[player!.color]);

      moves.forEach((move) => {
        this.registerLocalDarkChessMove(move as DarkChessMove);
      });
    } else {
      moves.forEach((move) => {
        this.registerAnyMove(move as Move);
      });
    }

    if (typeof currentMoveIndex === 'number') {
      this.navigateToMove(currentMoveIndex);
    }

    if (typeof timestamp === 'number') {
      this.timeDiff = Date.now() - timestamp;
    }

    if (socket) {
      socket.on('moveMade', ({ move, moveIndex, lastMoveTimestamp }) => {
        this.lastMoveTimestamp = lastMoveTimestamp;

        if (moveIndex >= this.moves.length) {
          this.onMoveMade(move, false);

          if ('vibrate' in navigator) {
            navigator.vibrate(200);
          }
        } else if (moveIndex === this.moves.length - 1) {
          const lastMove = _.last(this.moves)!;

          lastMove.duration = move.duration;

          delete lastMove.isDndMove;
        }
      });

      socket.on('darkChessMoveMade', ({ move, lastMoveTimestamp }) => {
        this.lastMoveTimestamp = lastMoveTimestamp;

        this.onMoveMade(move, true);

        if ('vibrate' in navigator) {
          navigator.vibrate(200);
        }
      });

      socket.on('updatePlayers', (players) => {
        this.players = players;

        this.updateGame();
      });

      socket.on('gameOver', ({ result, players }) => {
        this.players = players;

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

      socket.on('takebackRequested', (takebackRequest) => {
        this.takebackRequest = takebackRequest;

        this.updateGame();
      });

      socket.on('takebackAccepted', (lastMoveTimestamp) => {
        const { takebackRequest } = this;

        if (!takebackRequest) {
          return;
        }

        const { currentMoveIndex } = this;

        this.navigateToMove(this.getUsedMoves().length - 1, false);

        while (takebackRequest.moveIndex < this.getUsedMoves().length - 1) {
          this.unregisterLastMove();

          if (this.currentMoveIndex === this.getUsedMoves().length) {
            this.currentMoveIndex--;
          }
        }

        this.takebackRequest = null;
        this.lastMoveTimestamp = lastMoveTimestamp;

        this.navigateToMove(Math.min(currentMoveIndex, this.getUsedMoves().length - 1), false);
        this.updateGame();
      });

      socket.on('takebackDeclined', () => {
        this.takebackRequest = null;

        this.updateGame();
      });

      socket.on('takebackCanceled', () => {
        this.takebackRequest = null;

        this.updateGame();
      });
    }
  }

  acceptDraw() {
    if (this.socket) {
      this.socket.emit('acceptDraw');
    }
  }

  acceptTakeback() {
    if (this.socket) {
      this.socket.emit('acceptTakeback');
    }
  }

  cancelDraw() {
    if (this.socket) {
      this.socket.emit('cancelDraw');
    }
  }

  cancelTakeback() {
    if (this.socket) {
      this.socket.emit('cancelTakeback');
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
        this.setPieces(this.visiblePieces[this.darkChessMode]);
      } else {
        this.setPieces(this.colorMoves[this.darkChessMode][this.currentMoveIndex].pieces);
      }
    }

    this.updateGame();
  }

  declineDraw() {
    if (this.socket) {
      this.socket.emit('declineDraw');
    }
  }

  declineTakeback() {
    if (this.socket) {
      this.socket.emit('declineTakeback');
    }
  }

  destroy() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }

  emit(event: GameEvent) {
    this.listeners[event].forEach((listener) => listener());
  }

  getLiteralColor(square: Square): 'light' | 'dark' | 'half-dark' {
    return this.getSquareColor(square) === 'light'
      ? 'dark'
      : 'light';
  }

  getPieceSize(): number {
    return this.isCircularChess
      ? (1 - CIRCULAR_CHESS_EMPTY_CENTER_RATIO) * SVG_SQUARE_SIZE * 0.9
      : this.isHexagonalChess
        ? SVG_SQUARE_SIZE / 1.3
        : SVG_SQUARE_SIZE;
  }

  getSquareColor(square: Square): 'light' | 'dark' | 'half-dark' {
    if (this.isHexagonalChess) {
      const x = this.middleFileX - Math.abs(square.x - this.middleFileX);

      return (square.y + x) % 3 === 2
        ? 'light'
        : (square.y + x) % 3 === 1
          ? 'half-dark'
          : 'dark';
    }

    return (square.y + square.x) % 2 ? 'light' : 'dark';
  }

  getUsedMoves(): AnyMove[] {
    return this.darkChessMode && !this.showDarkChessHiddenPieces
      ? this.colorMoves[this.darkChessMode]
      : this.moves;
  }

  move(move: BaseMove) {
    if (!this.isDarkChess) {
      const newTimestamp = Date.now() - this.timeDiff;

      this.onMoveMade({
        ...move,
        duration: newTimestamp - this.lastMoveTimestamp
      }, false, false);

      this.lastMoveTimestamp = newTimestamp;

      this.changePlayerTime();
      this.updateGame();
    }

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

  offerDraw() {
    if (this.socket) {
      this.socket.emit('offerDraw');
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

  onMoveMade(move: DarkChessMove, isDarkChessMove: true, updateGame?: boolean): void;
  onMoveMade(move: Move, isDarkChessMove: false, updateGame?: boolean): void;
  onMoveMade(move: DarkChessMove | Move, isDarkChessMove: boolean, updateGame: boolean = true): void {
    const moves = this.darkChessMode
      ? this.colorMoves[this.darkChessMode]
      : this.moves;
    let { currentMoveIndex } = this;

    if (currentMoveIndex === moves.length - 1) {
      currentMoveIndex++;
    }

    this.navigateToMove(moves.length - 1, false);

    if (isDarkChessMove) {
      this.colorMoves[this.darkChessMode!] = [...(moves as DarkChessRevertableMove[])];

      this.registerLocalDarkChessMove(move as DarkChessMove);
    } else {
      this.moves = [...(moves as RevertableMove[])];

      this.registerMove(move as Move);
    }

    this.currentMoveIndex++;

    this.navigateToMove(currentMoveIndex, false);

    if (updateGame) {
      this.updateGame();
    }
  }

  performAnyMove() {
    if (this.darkChessMode && !this.showDarkChessHiddenPieces) {
      this.performDarkChessMove(this.colorMoves[this.darkChessMode][this.currentMoveIndex]);
    } else {
      this.performMove(this.moves[this.currentMoveIndex]);
    }
  }

  performDarkChessMove(move: DarkChessMove): () => void {
    const oldPieces = this.pieces;
    const oldTurn = this.turn;

    this.setPieces(move.pieces);

    this.turn = this.getOpponentColor();
    this.visiblePieces[this.darkChessMode!] = move.pieces as any;
    this.pliesCount++;

    return () => {
      this.pliesCount--;
      this.visiblePieces[this.darkChessMode!] = oldPieces as any;
      this.turn = oldTurn;

      this.setPieces(oldPieces);
    };
  }

  registerLocalDarkChessMove(move: DarkChessMove) {
    const revertMove = this.performDarkChessMove(move);

    this.colorMoves[this.darkChessMode!].push({
      ...move,
      revertMove
    });
  }

  requestTakeback() {
    if (this.socket) {
      this.socket.emit('requestTakeback', this.getUsedMoves().length - 2);
    }
  }

  requestTakebackUpToCurrentMove() {
    if (this.socket) {
      this.socket.emit('requestTakeback', this.currentMoveIndex);
    }
  }

  resign() {
    if (this.socket) {
      this.socket.emit('resign');
    }
  }

  revertAnyMove() {
    if (this.darkChessMode && !this.showDarkChessHiddenPieces) {
      this.colorMoves[this.darkChessMode][this.currentMoveIndex].revertMove();

      this.setPieces(this.visiblePieces[this.darkChessMode]);
    } else {
      this.moves[this.currentMoveIndex].revertMove();
    }
  }

  setPieces(pieces: readonly Piece[]) {
    this.pieces = pieces;

    this.resetBoards();
  }

  toggleShowDarkChessHiddenPieces() {
    this.showDarkChessHiddenPieces = !this.showDarkChessHiddenPieces;

    if (this.showDarkChessHiddenPieces) {
      this.onDarkChessMoves(this.moves);
    } else if (this.currentMoveIndex === -1) {
      this.onDarkChessMoves(this.moves);
      this.setPieces(this.visiblePieces[this.darkChessMode!]);
    } else {
      this.setPieces(this.colorMoves[this.darkChessMode!][this.currentMoveIndex].pieces);
    }

    this.updateGame();
  }

  unregisterLastMove() {
    if (this.isOngoingDarkChessGame && this.darkChessMode) {
      _.last(this.colorMoves[this.darkChessMode])!.revertMove();

      this.colorMoves[this.darkChessMode] = this.colorMoves[this.darkChessMode].slice(0, -1);

      this.setPieces(this.visiblePieces[this.darkChessMode]);
    } else {
      _.last(this.moves)!.revertMove();

      this.moves = this.moves.slice(0, -1);
    }
  }

  updateGame() {
    this.emit('updateGame');
  }
}
