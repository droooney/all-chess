import * as _ from 'lodash';
import { Socket } from 'socket.io-client';

import {
  AnyMove,
  BaseMove,
  BoardPiece,
  ColorEnum,
  DarkChessGame,
  DarkChessLocalMove,
  DarkChessMove,
  Dictionary,
  EachColor,
  Game as IGame,
  GameStatusEnum,
  LocalMove,
  Move,
  Piece,
  PieceBoardLocation,
  PieceLocation,
  PieceLocationEnum,
  PieceTypeEnum,
  Player,
  Premove,
  ResultReasonEnum,
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

import { Sound } from './sounds';
import { RegisterMoveReturnValue } from 'shared/helpers/GameMovesUtils';

type GameEvent = 'updateChat' | 'updateGame';

export interface InitGameOptions {
  game: IGame | DarkChessGame;

  socket?: Socket;
  player?: Player | null;
  currentMoveIndex?: number;
  timestamp?: number;
}

interface Point {
  x: number;
  y: number;
}

interface HexPoints {
  topLeft: Point;
  left: Point;
  bottomLeft: Point;
  bottomRight: Point;
  right: Point;
  topRight: Point;
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
  premoves: Premove[] = [];
  piecesBeforePremoves: readonly Piece[];
  colorMoves: EachColor<DarkChessLocalMove[]> = {
    [ColorEnum.WHITE]: [],
    [ColorEnum.BLACK]: []
  };
  pieceLocations: Partial<Record<number, Dictionary<PieceLocation>>> = {};
  colorPieceLocations: EachColor<Record<number, Dictionary<PieceLocation>>> = {
    [ColorEnum.WHITE]: {},
    [ColorEnum.BLACK]: {}
  };
  currentMoveIndex: number;
  isOngoingDarkChessGame: boolean;
  boardSidesRenderedRatio: number;
  boardCenterX: number;
  boardCenterY: number;
  isBlackBase: boolean;
  boardsShiftX: number;
  darkChessMode: ColorEnum | null;
  showDarkChessHiddenPieces: boolean;
  needToCalculateMaterialDifference: boolean;
  listeners: Record<GameEvent, (() => void)[]> = {
    updateChat: [],
    updateGame: []
  };
  sounds = {
    pieceMove: new Sound('piece-move2'),
    pieceCapture: new Sound('piece-capture4')
  };

  constructor({
    game,
    socket,
    player,
    currentMoveIndex,
    timestamp
  }: InitGameOptions) {
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
    this.isBlackBase = !!player && player.color === ColorEnum.BLACK;
    this.boardsShiftX = 0;
    this.darkChessMode = this.isDarkChess && player ? player.color : null;
    this.needToCalculateMaterialDifference = (
      !this.isAbsorption
      && !this.isDarkChess
      && !this.isHorde
    );
    this.piecesBeforePremoves = this.pieces;

    this.savePieceLocations();

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
      socket.on('gamePing', (timestamp) => {
        socket.emit('gamePong', timestamp);

        this.timeDiff = Date.now() - timestamp;
      });

      socket.on('moveMade', ({ move, moveIndex, lastMoveTimestamp }) => {
        this.lastMoveTimestamp = lastMoveTimestamp;

        if (moveIndex === this.getUsedMoves().length - 1) {
          const lastMove = _.last(this.getUsedMoves())!;

          if (
            !this.isOngoingDarkChessGame
            && _.isEqual(lastMove.from, move.from)
            && _.isEqual(lastMove.to, move.to)
            && lastMove.promotion === move.promotion
          ) {
            lastMove.duration = move.duration;

            return;
          }

          if (!this.isOngoingDarkChessGame) {
            this.cancelPremoves(false);
          }
        }

        if (this.premoves.length) {
          this.setPieces(this.piecesBeforePremoves);
        }

        if (moveIndex === this.getUsedMoves().length - 1) {
          this.unregisterLastMove();
        }

        if (this.currentMoveIndex === this.getUsedMoves().length) {
          this.currentMoveIndex--;
        }

        if (moveIndex >= this.getUsedMoves().length) {
          this.onMoveMade(move as Move, this.isOngoingDarkChessGame as false, false);
          this.notifyAboutNewMove();

          if (!this.isOngoing()) {
            this.cancelPremoves(false);
          }

          if (this.player && this.player.color === this.turn && this.premoves.length) {
            const premove = this.premoves.shift()!;
            const piece = premove.from.type === PieceLocationEnum.BOARD
              ? this.getBoardPiece(premove.from)
              : this.getPocketPiece(premove.from.pieceType, premove.from.color);

            if (piece && piece.color === this.player.color && this.isMoveAllowed(piece, premove.to, premove.promotion)) {
              this.move(premove);
            } else {
              this.cancelPremoves(false);
            }
          }

          if (this.premoves.length) {
            this.piecesBeforePremoves = this.pieces;

            this.setPieces(_.cloneDeep(this.pieces));

            this.premoves.forEach((premove) => {
              this.performPremove(premove);
            });
          }

          this.updateGame();
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

        this.cancelPremoves(false);
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

        this.cancelPremoves(false);
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

  cancelPremoves(updateGame: boolean) {
    if (this.premoves.length) {
      this.premoves = [];

      this.setPieces(this.piecesBeforePremoves);

      if (updateGame) {
        this.updateGame();
      }
    }
  }

  cancelTakeback() {
    if (this.socket) {
      this.socket.emit('cancelTakeback');
    }
  }

  changeDarkChessMode(darkChessMode: ColorEnum | null) {
    this.darkChessMode = darkChessMode;

    if (darkChessMode) {
      if (!this.showDarkChessHiddenPieces) {
        this.setPieces(this.getMoveVisiblePieces(this.currentMoveIndex));
      }
    } else {
      const wasShowingHiddenPieces = this.showDarkChessHiddenPieces;

      this.showDarkChessHiddenPieces = true;

      if (!wasShowingHiddenPieces) {
        this.onDarkChessMoves(this.moves);
      }
    }
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

    this.removeListeners();
  }

  emit(event: GameEvent) {
    this.listeners[event].forEach((listener) => listener());
  }

  end(winner: ColorEnum | null, reason: ResultReasonEnum) {
    super.end(winner, reason);

    this.cancelPremoves(false);
  }

  getHexPoints(square: Square): HexPoints {
    const a = SVG_SQUARE_SIZE / 2 / Math.sqrt(3);
    const x0 = (square.x * 3 + 1) * a;
    const rankAdjustmentY = 1 / 2 * Math.abs(square.x - this.middleFileX);
    const y0 = (this.boardHeight - square.y - rankAdjustmentY) * SVG_SQUARE_SIZE;

    return {
      bottomLeft: { x: x0, y: y0 },
      left: { x: x0 - a, y: y0 - SVG_SQUARE_SIZE / 2 },
      topLeft: { x: x0, y: y0 - SVG_SQUARE_SIZE },
      topRight: { x: x0 + 2 * a, y: y0 - SVG_SQUARE_SIZE },
      right: { x: x0 + 3 * a, y: y0 - SVG_SQUARE_SIZE / 2 },
      bottomRight: { x: x0 + 2 * a, y: y0 }
    };
  }

  getLiteralColor(square: Square): 'light' | 'dark' | 'half-dark' {
    return this.getSquareColor(square) === 'light'
      ? 'dark'
      : 'light';
  }

  getLocalVisibleSquares(color: ColorEnum): Square[] {
    if (this.premoves.length) {
      const pieces = this.pieces;

      this.setPieces(this.piecesBeforePremoves);

      const visibleSquares = this.getVisibleSquares(color);

      this.setPieces(pieces);

      return visibleSquares;
    }

    return this.getVisibleSquares(color);
  }

  getMovePieceLocations(moveIndex: number): Dictionary<PieceLocation> {
    return (
      this.darkChessMode && !this.showDarkChessHiddenPieces
        ? this.colorPieceLocations[this.darkChessMode][moveIndex]
        : this.pieceLocations[moveIndex]
    ) || {};
  }

  getMoveVisiblePieces(moveIndex: number): readonly Piece[] {
    return moveIndex === -1
      ? this.startingVisiblePieces[this.darkChessMode!]
      : this.colorMoves[this.darkChessMode!][moveIndex].pieces;
  }

  getPieceSize(): number {
    return this.isCircularChess
      ? (1 - CIRCULAR_CHESS_EMPTY_CENTER_RATIO) * SVG_SQUARE_SIZE * 0.9
      : this.isHexagonalChess
        ? SVG_SQUARE_SIZE / 1.3
        : SVG_SQUARE_SIZE;
  }

  getSquareCenter(square: Square): { x: number; y: number; } {
    if (this.isCircularChess) {
      const rOuter = this.boardWidth * SVG_SQUARE_SIZE;
      const rDiff = (1 - CIRCULAR_CHESS_EMPTY_CENTER_RATIO) * SVG_SQUARE_SIZE;
      const r = rOuter - square.x * rDiff;
      const centerR = r - rDiff / 2;
      const centerAngle = (square.y + 0.5) * 2 * Math.PI / this.boardHeight;

      return {
        x: this.boardCenterX - centerR * Math.sin(centerAngle),
        y: this.boardOrthodoxWidth * SVG_SQUARE_SIZE - (this.boardCenterY - centerR * Math.cos(centerAngle))
      };
    }

    if (this.isHexagonalChess) {
      const a = SVG_SQUARE_SIZE / 2 / Math.sqrt(3);
      const x0 = (square.x * 3 + 1) * a;
      const rankAdjustmentY = 1 / 2 * Math.abs(square.x - this.middleFileX);
      const y0 = (this.boardHeight - square.y - rankAdjustmentY) * SVG_SQUARE_SIZE;

      return {
        x: x0 + a,
        y: y0 - SVG_SQUARE_SIZE / 2
      };
    }

    return {
      x: (square.x + 0.5) * SVG_SQUARE_SIZE,
      y: (this.boardHeight - square.y - 0.5) * SVG_SQUARE_SIZE
    };
  }

  getUsedMoves(): AnyMove[] {
    return this.darkChessMode && !this.showDarkChessHiddenPieces
      ? this.colorMoves[this.darkChessMode]
      : this.moves;
  }

  move(move: BaseMove) {
    if (!this.player) {
      return;
    }

    if (this.player.color !== this.turn) {
      this.registerPremove(move);

      return;
    }

    if (this.socket) {
      this.socket.emit('makeMove', move);
    }

    const newTimestamp = Date.now() - this.timeDiff;
    const duration = newTimestamp - this.lastMoveTimestamp;

    if (this.isDarkChess) {
      const prevVisibleSquares = this.darkChessMode
        ? this.getVisibleSquares(this.darkChessMode)
        : undefined;
      const { algebraic, figurine, isCapture, revertMove } = this.performMove(move, {
        constructMoveLiterals: true
      });
      const pieces = _.cloneDeep(this.pieces.filter(Game.isRealPiece));

      revertMove();

      this.onMoveMade({
        ...move,
        prevVisibleSquares,
        duration,
        algebraic,
        figurine,
        isCapture,
        pieces
      }, true, false);
    } else {
      this.onMoveMade({
        ...move,
        duration
      }, false, false);
    }

    this.lastMoveTimestamp = newTimestamp;

    this.changePlayerTime();
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

  moveForward(updateGame: boolean = true, withSound: boolean = false) {
    if (this.currentMoveIndex < this.getUsedMoves().length - 1) {
      this.currentMoveIndex++;
      this.performAnyMove();

      if (withSound) {
        this.playMoveSound();
      }

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

  notifyAboutNewMove() {
    if (this.player && this.player.color === this.turn) {
      if ('vibrate' in navigator) {
        navigator.vibrate(200);
      }
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
    this.savePieceLocations();

    const { currentMoveIndex } = this;

    moves.forEach((move) => {
      this.registerAnyMove(move);
    });

    this.currentMoveIndex = this.moves.length - 1;

    this.navigateToMove(currentMoveIndex, false);
  }

  onMoveMade(move: DarkChessMove & { prevVisibleSquares?: Square[]; }, isDarkChessMove: true, updateGame?: boolean): void;
  onMoveMade(move: Move, isDarkChessMove: false, updateGame?: boolean): void;
  onMoveMade(move: DarkChessMove & { prevVisibleSquares?: Square[]; } | Move, isDarkChessMove: boolean, updateGame: boolean = true): void {
    const moves = this.getUsedMoves();
    let { currentMoveIndex } = this;
    let atTheEndOfMoves = false;

    if (currentMoveIndex === moves.length - 1) {
      atTheEndOfMoves = true;
      currentMoveIndex++;
    }

    this.navigateToMove(moves.length - 1, false);

    if (isDarkChessMove) {
      this.colorMoves[this.darkChessMode!] = [...(moves as DarkChessLocalMove[])];

      this.registerLocalDarkChessMove(move as DarkChessMove);
    } else {
      this.moves = [...(moves as LocalMove[])];

      this.registerMove(move as Move);
    }

    this.currentMoveIndex++;

    this.navigateToMove(currentMoveIndex, false);

    if (atTheEndOfMoves) {
      this.playMoveSound();
    }

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

  performPremove(move: Premove) {
    const {
      from: fromLocation,
      to: toLocation,
      to: {
        board: toBoard,
        x: toX,
        y: toY
      },
      promotion
    } = move;
    const piece = fromLocation.type === PieceLocationEnum.BOARD
      ? this.getBoardPiece(fromLocation)!
      : this.getPocketPiece(fromLocation.pieceType, fromLocation.color)!;
    const pieceInSquare = this.getBoardPiece(toLocation);
    const isPawnPromotion = this.isPromoting(piece, toLocation);
    const wasKing = Game.isKing(piece);
    const castlingRook = this.getCastlingRook(piece, toLocation);
    const isCastling = !!castlingRook;
    const isKingSideCastling = isCastling && toX - (fromLocation as PieceBoardLocation).x > 0;
    const isRoyalKing = wasKing && !this.isAntichess;
    const isCapture = (
      !castlingRook
      && !!pieceInSquare
      && pieceInSquare.color !== piece.color
      && fromLocation.type === PieceLocationEnum.BOARD
      && (
        !Game.isPawn(piece)
        || fromLocation.x - toX !== 0
      )
    );
    const movedPieces: BoardPiece[] = [piece as BoardPiece];

    if (pieceInSquare && (!castlingRook || pieceInSquare.id !== castlingRook.id)) {
      const goesToPocket = this.isCrazyhouse && isCapture;

      if (goesToPocket) {
        pieceInSquare.type = pieceInSquare.originalType;
        pieceInSquare.moved = false;
        pieceInSquare.color = piece.color;
      }

      this.changePieceLocation(
        pieceInSquare,
        goesToPocket
          ? { type: PieceLocationEnum.POCKET, pieceType: pieceInSquare.originalType, color: piece.color }
          : null
      );
    }

    if (castlingRook) {
      const newRookLocation: PieceBoardLocation = {
        type: PieceLocationEnum.BOARD,
        board: toBoard,
        x: isKingSideCastling ? this.boardWidth - 3 : 3,
        y: toY
      };
      const pieceInRookLocation = this.getBoardPiece(newRookLocation);

      if (pieceInRookLocation) {
        this.changePieceLocation(pieceInRookLocation, null);
      }

      this.changePieceLocation(castlingRook, newRookLocation);

      movedPieces.push(castlingRook);
    }

    piece.moved = fromLocation.type === PieceLocationEnum.BOARD;
    piece.type = isPawnPromotion && (!this.isFrankfurt || !isRoyalKing)
      ? promotion!
      : piece.type;
    piece.originalType = this.isCrazyhouse
      ? piece.originalType
      : piece.type;
    piece.abilities = this.isFrankfurt && isRoyalKing && isPawnPromotion
      ? promotion!
      : piece.abilities;

    if (this.isAbsorption && isCapture) {
      const {
        type,
        abilities
      } = Game.getPieceTypeAfterAbsorption(piece, pieceInSquare!);

      piece.type = type;
      piece.originalType = type;
      piece.abilities = abilities;
    } else if (this.isFrankfurt && isCapture && (!isRoyalKing || !isPawnPromotion)) {
      const isOpponentPieceRoyalKing = Game.isKing(pieceInSquare!) && !this.isAntichess;
      const newPieceType = isPawnPromotion
        ? piece.type
        : isRoyalKing || isOpponentPieceRoyalKing
          ? PieceTypeEnum.KING
          : pieceInSquare!.type;
      const newAbilities = isRoyalKing
        ? isOpponentPieceRoyalKing
          ? pieceInSquare!.abilities
          : pieceInSquare!.type
        : null;

      piece.type = newPieceType;
      piece.originalType = newPieceType;
      piece.abilities = newAbilities;
    }

    this.changePieceLocation(piece, {
      type: PieceLocationEnum.BOARD,
      ...toLocation
    });

    movedPieces.forEach((piece) => {
      _.times(this.boardCount - 1, (board) => {
        const pieceInSquare = this.getBoardPiece({
          ...piece.location,
          board: this.getNextBoard(piece.location.board + board)
        });

        if (pieceInSquare) {
          this.changePieceLocation(pieceInSquare, null);
        }
      });

      if (fromLocation.type === PieceLocationEnum.BOARD) {
        this.changePieceLocation(piece, {
          ...piece.location,
          board: this.getNextBoard(piece.location.board)
        });
      }
    });
  }

  playMoveSound() {
    const move = this.getUsedMoves()[this.currentMoveIndex];

    if (move) {
      if (move.isCapture) {
        this.sounds.pieceCapture.play();
      } else {
        this.sounds.pieceMove.play();
      }
    }
  }

  registerAnyMove(move: Move) {
    super.registerAnyMove(move);

    if (this.isDarkChess) {
      this.savePieceLocations();
    }
  }

  registerLocalDarkChessMove(move: DarkChessMove) {
    const revertMove = this.performDarkChessMove(move);

    this.colorMoves[this.darkChessMode!].push({
      ...move,
      revertMove
    });

    this.savePieceLocations();
  }

  registerMove(move: Move): RegisterMoveReturnValue {
    const returnValue = super.registerMove(move);

    this.savePieceLocations();

    return returnValue;
  }

  registerPremove(move: Premove) {
    if (!this.premoves.length) {
      this.piecesBeforePremoves = this.pieces;

      this.setPieces(_.cloneDeep(this.pieces));
    }

    this.performPremove(move);

    this.premoves = [
      ...this.premoves,
      move
    ];
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

  removeListeners() {
    this.listeners = {
      updateChat: [],
      updateGame: []
    };
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

  savePieceLocations() {
    const moveIndex = this.getUsedMoves().length - 1;
    const locations = this.pieceLocations[moveIndex] = {} as Dictionary<PieceLocation>;

    this.pieces.forEach(({ location, id }) => {
      locations[id] = location;
    });

    if (this.isDarkChess) {
      _.forEach(ColorEnum, (color) => {
        const locations = this.colorPieceLocations[color][moveIndex] = {} as Dictionary<PieceLocation>;
        const pieces = moveIndex === -1
          ? this.startingVisiblePieces[color]
          : this.colorMoves[color][moveIndex]?.pieces;

        if (pieces) {
          pieces.forEach(({ location, id }) => {
            locations[id] = location;
          });
        }
      });
    }
  }

  setBoardsShiftX(boardsShiftX: number) {
    this.boardsShiftX = boardsShiftX;

    this.updateGame();
  }

  setPieces(pieces: readonly Piece[]) {
    this.pieces = pieces;

    this.resetBoards();
  }

  toggleIsBlackBase(changeDarkChessMode: boolean) {
    this.isBlackBase = !this.isBlackBase;

    if (changeDarkChessMode && this.isDarkChess && this.status === GameStatusEnum.FINISHED) {
      this.changeDarkChessMode(
        this.isBlackBase
          ? ColorEnum.BLACK
          : ColorEnum.WHITE
      );
    }

    this.updateGame();
  }

  toggleShowDarkChessHiddenPieces() {
    this.showDarkChessHiddenPieces = !this.showDarkChessHiddenPieces;

    if (this.showDarkChessHiddenPieces) {
      this.onDarkChessMoves(this.moves);
    } else {
      this.setPieces(this.getMoveVisiblePieces(this.currentMoveIndex));
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
