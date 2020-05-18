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
  Game as IGame,
  GameStatusEnum,
  LocalMove,
  Move,
  Piece,
  PieceBoardLocation,
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
  colorMoves: Record<ColorEnum, DarkChessLocalMove[]> = {
    [ColorEnum.WHITE]: [],
    [ColorEnum.BLACK]: []
  };
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
    this.piecesBeforePremoves = this.pieces;

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
              this.move(premove, false);
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

  getPieceSize(): number {
    return this.isCircularChess
      ? (1 - CIRCULAR_CHESS_EMPTY_CENTER_RATIO) * SVG_SQUARE_SIZE * 0.9
      : this.isHexagonalChess
        ? SVG_SQUARE_SIZE / 1.3
        : SVG_SQUARE_SIZE;
  }

  getUsedMoves(): AnyMove[] {
    return this.darkChessMode && !this.showDarkChessHiddenPieces
      ? this.colorMoves[this.darkChessMode]
      : this.moves;
  }

  move(move: BaseMove, updateGame: boolean) {
    if (!this.player) {
      return;
    }

    if (this.player.color !== this.turn) {
      this.registerPremove(move);
      this.updateGame();

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
      const { algebraic, figurine, revertMove } = this.performMove(move, {
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

    if (updateGame) {
      this.updateGame();
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
    const moves = this.darkChessMode
      ? this.colorMoves[this.darkChessMode]
      : this.moves;
    let { currentMoveIndex } = this;

    if (currentMoveIndex === moves.length - 1) {
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

  registerLocalDarkChessMove(move: DarkChessMove) {
    const revertMove = this.performDarkChessMove(move);

    this.colorMoves[this.darkChessMode!].push({
      ...move,
      revertMove
    });
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
