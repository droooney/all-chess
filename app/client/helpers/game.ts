import { Socket } from 'socket.io-client';
import clone from 'lodash/clone';
import forEach from 'lodash/forEach';
import isEqual from 'lodash/isEqual';
import last from 'lodash/last';
import times from 'lodash/times';

import {
  POSSIBLE_TIMER_BASES_IN_MINUTES,
  POSSIBLE_TIMER_BASES_IN_MILLISECONDS,
  POSSIBLE_TIMER_INCREMENTS_IN_SECONDS,
  POSSIBLE_TIMER_INCREMENTS_IN_MILLISECONDS,
  POSSIBLE_CORRESPONDENCE_BASES_IN_DAYS,
  POSSIBLE_CORRESPONDENCE_BASES_IN_MILLISECONDS,
} from 'shared/constants';
import { CIRCULAR_CHESS_EMPTY_CENTER_RATIO, SVG_SQUARE_SIZE } from 'client/constants';

import {
  AnyMove,
  BaseMove,
  BoardPiece,
  ColorEnum,
  DarkChessGame,
  DarkChessLocalMove,
  DarkChessMove,
  Dictionary,
  DrawnSymbol,
  DrawnSymbolType,
  EachColor,
  Game as IGame,
  GameStatusEnum,
  GameVariantEnum,
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
  SquareColor,
  TimeControl,
  TimeControlEnum,
} from 'shared/types';

import { Game as BaseGame, Game as GameHelper } from 'shared/helpers';
import { Sound } from 'client/helpers/sounds';
import { RegisterMoveReturnValue } from 'shared/helpers/GameMovesUtils';
import { history } from 'client/helpers/history';

type GameEvent = 'updateChat' | 'updateGame';

export interface InitGameOptions {
  game: IGame | DarkChessGame;

  socket?: Socket;
  player?: Player | null;
  currentMoveIndex?: number;
  timestamp?: number;
  startingPositionSymbols?: DrawnSymbol[];
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

interface CircularPoints {
  outerFirst: Point;
  outerSecond: Point;
  innerSecond: Point;
  innerFirst: Point;
}

const INPUT_ELEMENTS = ['input', 'textarea'];

export class Game extends GameHelper {
  static areSameVariants(variants1: GameVariantEnum[], variants2: GameVariantEnum[]): boolean {
    return (
      variants1.length === variants2.length
      && variants1.every((variant) => variants2.includes(variant))
    );
  }

  static getGameFromFen(fen: string, variants: readonly GameVariantEnum[]): Game {
    return new Game({
      game: new BaseGame({
        startingData: null,
        startingFen: fen,
        timeControl: null,
        variants,
        id: '',
        status: GameStatusEnum.ONGOING,
        pgnTags: {},
        rated: false,
        isLive: false,
      }),
    });
  }

  static getGameFromPgn(pgn: string, id: string): Game {
    const game = super.getGameFromPgn(pgn, id);

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

  player: Player | null;
  socket?: Socket;
  timeDiff = 0;
  moves: LocalMove[] = [];
  premoves: Premove[] = [];
  piecesBeforePremoves: readonly Piece[];
  colorMoves: EachColor<DarkChessLocalMove[]> = {
    [ColorEnum.WHITE]: [],
    [ColorEnum.BLACK]: [],
  };
  piecesByMove: Partial<Record<number, Dictionary<Piece>>> = {};
  colorPiecesByMove: EachColor<Partial<Record<number, Dictionary<Piece>>>> = {
    [ColorEnum.WHITE]: {},
    [ColorEnum.BLACK]: {},
  };
  symbolsByMove: Partial<Record<number, DrawnSymbol[]>> = {};
  currentMoveIndex: number;
  isOngoingDarkChessGame: boolean;
  boardSidesRenderedRatio: number;
  boardCenterX: number;
  boardCenterY: number;
  isBlackBase: boolean;
  boardsShiftX: number;
  boardToShow: number | 'all';
  darkChessMode: ColorEnum | null;
  showDarkChessHiddenPieces: boolean;
  listeners: Record<GameEvent, (() => void)[]> = {
    updateChat: [],
    updateGame: [],
  };
  sounds = {
    pieceMove: new Sound('piece-move2'),
    pieceCapture: new Sound('piece-capture4'),
  };

  constructor({
    game,
    socket,
    player,
    currentMoveIndex,
    timestamp,
    startingPositionSymbols,
  }: InitGameOptions) {
    super({
      id: game.id,
      status: GameStatusEnum.ONGOING,
      pgnTags: game.pgnTags,
      rated: game.rated,
      startingData: game.startingData || null,
      startingFen: game.startingFen,
      timeControl: game.timeControl,
      variants: game.variants,
      isLive: game.isLive,
    });

    const now = Date.now();

    this.drawOffer = game.drawOffer;
    this.takebackRequest = game.takebackRequest;
    this.rematchOffer = game.rematchOffer;
    this.rematchAllowed = game.rematchAllowed;
    this.lastMoveTimestamp = game.lastMoveTimestamp;
    this.currentMoveIndex = game.moves.length - 1;
    this.chat = game.chat;
    this.player = player || null;
    this.socket = socket;
    this.isOngoingDarkChessGame = this.isDarkChess && game.status === GameStatusEnum.ONGOING;
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
    this.boardToShow = 'all';
    this.darkChessMode = this.isDarkChess && player ? player.color : null;
    this.piecesBeforePremoves = this.pieces;
    this.symbolsByMove[-1] = startingPositionSymbols;

    this.savePieces();

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

    this.status = game.status;
    this.result = game.result;
    this.players = game.players;

    if (typeof currentMoveIndex === 'number') {
      this.navigateToMove(currentMoveIndex);
    }

    if (typeof timestamp === 'number') {
      this.timeDiff = now - timestamp;
    }

    if (socket) {
      socket.on('gamePing', (timestamp) => {
        socket.emit('gamePong', timestamp);

        const newDiff = Date.now() - timestamp;

        if (Math.abs(newDiff - this.timeDiff) > 700) {
          this.timeDiff = newDiff;
        }
      });

      socket.on('moveMade', ({ move, moveIndex, lastMoveTimestamp }) => {
        this.lastMoveTimestamp = lastMoveTimestamp;
        this.timeDiff = Date.now() - lastMoveTimestamp;

        if (moveIndex === this.getUsedMoves().length - 1) {
          const lastMove = last(this.getUsedMoves())!;

          // already locally registered move
          if (
            !this.isOngoingDarkChessGame
            && isEqual(lastMove.from, move.from)
            && isEqual(lastMove.to, move.to)
            && lastMove.promotion === move.promotion
          ) {
            lastMove.duration = move.duration;

            this.updateGame();

            return;
          }

          // move from the server is different from local one
          if (!this.isOngoingDarkChessGame) {
            this.cancelPremoves(false);
          }
        }

        if (this.premoves.length) {
          this.setPieces(this.piecesBeforePremoves);
        }

        // move from the server is different from local one or it's dark chess
        if (moveIndex === this.getUsedMoves().length - 1) {
          this.unregisterLastMove();
        }

        if (this.currentMoveIndex === this.getUsedMoves().length) {
          this.currentMoveIndex--;
        }

        if (moveIndex >= this.getUsedMoves().length) {
          this.onMoveMade(move as Move, this.isOngoingDarkChessGame as false, false);
          this.notifyAboutNewMove();

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

            this.setPieces(this.pieces.map(clone));

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
        setTimeout(() => {
          this.isOngoingDarkChessGame = false;
          this.showDarkChessHiddenPieces = true;

          this.onDarkChessMoves(moves);
          this.updateGame();
        }, 0);
      });

      socket.on('newChatMessage', (chatMessage) => {
        this.chat = [
          ...this.chat,
          chatMessage,
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
          this.clearSymbols(false);
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

      socket.on('rematchOffered', (color) => {
        this.rematchOffer = color;

        this.updateGame();
      });

      socket.on('rematchAccepted', (gameId) => {
        history.push(`/game/${gameId}`, { rematch: true });
      });

      socket.on('rematchDeclined', () => {
        this.rematchOffer = null;

        this.updateGame();
      });

      socket.on('rematchCanceled', () => {
        this.rematchOffer = null;

        this.updateGame();
      });

      socket.on('rematchNotAllowed', () => {
        this.rematchOffer = null;
        this.rematchAllowed = false;

        this.updateGame();
      });
    }
  }

  acceptDraw() {
    this.socket?.emit('acceptDraw');
  }

  acceptRematch() {
    this.socket?.emit('acceptRematch');
  }

  acceptTakeback() {
    this.socket?.emit('acceptTakeback');
  }

  addOrRemoveSymbol(drawnSymbol: DrawnSymbol) {
    const drawnSymbols = this.getDrawnSymbols();
    const existingIndex = drawnSymbols.findIndex((symbol) => (
      drawnSymbol.type === DrawnSymbolType.CIRCLE
      && symbol.type === DrawnSymbolType.CIRCLE
      && GameHelper.areSquaresEqual(drawnSymbol.square, symbol.square, false)
    ) || (
      drawnSymbol.type === DrawnSymbolType.ARROW
      && symbol.type === DrawnSymbolType.ARROW
      && GameHelper.areSquaresEqual(drawnSymbol.from, symbol.from, false)
      && GameHelper.areSquaresEqual(drawnSymbol.to, symbol.to, false)
    ));

    if (existingIndex === -1) {
      drawnSymbols.push(drawnSymbol);
    } else if (drawnSymbols[existingIndex].color === drawnSymbol.color) {
      drawnSymbols.splice(existingIndex, 1);
    } else {
      drawnSymbols[existingIndex] = drawnSymbol;
    }

    this.symbolsByMove[this.currentMoveIndex] = [...drawnSymbols];
  }

  cancelDraw() {
    this.socket?.emit('cancelDraw');
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

  cancelRematch() {
    this.socket?.emit('cancelRematch');
  }

  cancelTakeback() {
    this.socket?.emit('cancelTakeback');
  }

  changeDarkChessMode(darkChessMode: ColorEnum | null) {
    this.darkChessMode = darkChessMode;

    if (!darkChessMode) {
      this.showDarkChessHiddenPieces = true;
    }
  }

  clearSymbols(updateGame: boolean) {
    const hasSymbols = this.getDrawnSymbols().length !== 0;

    if (hasSymbols) {
      this.symbolsByMove[this.currentMoveIndex] = [];

      if (updateGame) {
        this.updateGame();
      }
    }
  }

  declineDraw() {
    this.socket?.emit('declineDraw');
  }

  declineRematch() {
    this.socket?.emit('declineRematch');
  }

  declineTakeback() {
    this.socket?.emit('declineTakeback');
  }

  destroy() {
    this.socket?.disconnect();

    this.removeListeners();
  }

  emit(event: GameEvent) {
    this.listeners[event].forEach((listener) => listener());
  }

  end(winner: ColorEnum | null, reason: ResultReasonEnum) {
    super.end(winner, reason);

    this.cancelPremoves(false);
  }

  getCircularRadiuses(square: Square): { outer: number; inner: number; } {
    const rBoard = this.boardWidth * SVG_SQUARE_SIZE;
    const rDiff = (1 - CIRCULAR_CHESS_EMPTY_CENTER_RATIO) * SVG_SQUARE_SIZE;
    const r = rBoard - square.x * rDiff;

    return {
      outer: r,
      inner: r - rDiff,
    };
  }

  getCircularPoints(square: Square): CircularPoints {
    const {
      outer: rOuter,
      inner: rInner,
    } = this.getCircularRadiuses(square);
    const angle = square.y * 2 * Math.PI / this.boardHeight;
    const nextAngle = (square.y + 1) * 2 * Math.PI / this.boardHeight;
    const getCirclePoint = (r: number, angle: number) => {
      const x = this.boardCenterX - r * Math.sin(angle);
      const y = this.boardCenterY - r * Math.cos(angle);

      return { x, y: this.boardOrthodoxWidth * SVG_SQUARE_SIZE - y };
    };

    return {
      outerFirst: getCirclePoint(rOuter, angle),
      outerSecond: getCirclePoint(rOuter, nextAngle),
      innerSecond: getCirclePoint(rInner, nextAngle),
      innerFirst: getCirclePoint(rInner, angle),
    };
  }

  getDrawnSymbols(): DrawnSymbol[] {
    return this.symbolsByMove[this.currentMoveIndex] ||= [];
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
      bottomRight: { x: x0 + 2 * a, y: y0 },
    };
  }

  getLiteralColor(square: Square): SquareColor {
    return this.getSquareColor(square) === SquareColor.LIGHT
      ? SquareColor.DARK
      : SquareColor.LIGHT;
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

  getMovePieces(moveIndex: number): Dictionary<Piece> {
    return (
      this.darkChessMode && !this.showDarkChessHiddenPieces
        ? this.colorPiecesByMove[this.darkChessMode][moveIndex]
        : this.piecesByMove[moveIndex]
    ) || {};
  }

  getMoveVisiblePieces(moveIndex: number, color: ColorEnum): readonly Piece[] {
    return moveIndex === -1
      ? this.startingVisiblePieces[color]
      : this.colorMoves[color][moveIndex]?.pieces || [];
  }

  getPieceSize(): number {
    return this.isCircularChess
      ? (1 - CIRCULAR_CHESS_EMPTY_CENTER_RATIO) * SVG_SQUARE_SIZE * 0.9
      : this.isHexagonalChess
        ? SVG_SQUARE_SIZE / 1.3
        : SVG_SQUARE_SIZE;
  }

  getSquareCenter(square: Square): Point {
    if (this.isCircularChess) {
      const {
        outer: rOuter,
        inner: rInner,
      } = this.getCircularRadiuses(square);
      const rMiddle = (rOuter + rInner) / 2;
      const angleMiddle = (square.y + 0.5) * 2 * Math.PI / this.boardHeight;

      return {
        x: this.boardCenterX - rMiddle * Math.sin(angleMiddle),
        y: this.boardOrthodoxWidth * SVG_SQUARE_SIZE - (this.boardCenterY - rMiddle * Math.cos(angleMiddle)),
      };
    }

    if (this.isHexagonalChess) {
      const hexPoints = this.getHexPoints(square);

      return {
        x: (hexPoints.left.x + hexPoints.right.x) / 2,
        y: (hexPoints.left.y + hexPoints.right.y) / 2,
      };
    }

    return {
      x: (square.x + 0.5) * SVG_SQUARE_SIZE,
      y: (this.boardHeight - square.y - 0.5) * SVG_SQUARE_SIZE,
    };
  }

  getUsedMoves(): AnyMove[] {
    return this.darkChessMode && !this.showDarkChessHiddenPieces
      ? this.colorMoves[this.darkChessMode]
      : this.moves;
  }

  handleKeyPress(e: KeyboardEvent) {
    if (
      e.target instanceof HTMLElement
      && INPUT_ELEMENTS.includes(e.target.tagName.toLowerCase())
    ) {
      return;
    }

    let preventDefault = true;

    if (e.key === 'ArrowLeft') {
      this.moveBack();
    } else if (e.key === 'ArrowRight') {
      this.moveForward(true, true);
    } else if (e.key === 'ArrowUp') {
      this.navigateToMove(-1);
    } else if (e.key === 'ArrowDown') {
      this.navigateToMove(this.getUsedMoves().length - 1);
    } else if (e.key === '1' || e.key === '2') {
      if (this.boardToShow !== 'all') {
        this.setBoardToShow(+e.key - 1);
      }
    } else {
      preventDefault = false;
    }

    if (preventDefault) {
      e.preventDefault();
    }
  }

  isMaterialDiffShown(): boolean {
    return (
      !this.isAbsorption
      && !this.isOngoingDarkChessGame
    );
  }

  move(move: BaseMove) {
    if (!this.player) {
      return;
    }

    if (this.player.color !== this.turn) {
      this.registerPremove(move);

      return;
    }

    this.socket?.emit('makeMove', move);

    const newTimestamp = Date.now() - this.timeDiff;
    const duration = newTimestamp - this.lastMoveTimestamp;

    if (this.isDarkChess) {
      const prevVisibleSquares = this.darkChessMode
        ? this.getVisibleSquares(this.darkChessMode)
        : undefined;
      const { notation, isCapture, revertMove } = this.performMove(move, {
        constructMoveNotation: true,
      });
      const pieces = this.pieces.filter(Game.isRealPiece).map(clone);

      revertMove();

      this.onMoveMade({
        ...move,
        prevVisibleSquares,
        duration,
        notation,
        isCapture,
        pieces,
        prevPiecesWorth: this.getPiecesWorth(),
        timeBeforeMove: {
          [ColorEnum.WHITE]: this.players[ColorEnum.WHITE].time,
          [ColorEnum.BLACK]: this.players[ColorEnum.BLACK].time,
        },
      }, true, false);
    } else {
      this.onMoveMade({
        ...move,
        duration,
      }, false, false);
    }

    this.lastMoveTimestamp = newTimestamp;
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
      times(this.currentMoveIndex - moveIndex, () => {
        this.moveBack(false);
      });
    } else {
      times(moveIndex - this.currentMoveIndex, () => {
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
    this.socket?.emit('offerDraw');
  }

  offerRematch() {
    this.socket?.emit('offerRematch');
  }

  off<K extends GameEvent>(event: K, listener: () => void) {
    this.listeners[event] = this.listeners[event].filter((savedListener) => savedListener !== listener);
  }

  on<K extends GameEvent>(event: K, listener: () => void) {
    this.listeners[event].push(listener);
  }

  onDarkChessMoves(moves: Move[]) {
    this.colorMoves = {
      [ColorEnum.WHITE]: [],
      [ColorEnum.BLACK]: [],
    };
    this.moves = [];

    this.setupStartingData();
    this.savePieces();

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

      this.registerMove(move as Move, true);
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
    if (this.isOngoingDarkChessGame && this.darkChessMode) {
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
        y: toY,
      },
      promotion,
    } = move;
    const piece = fromLocation.type === PieceLocationEnum.BOARD
      ? this.getBoardPiece(fromLocation)
      : this.getPocketPiece(fromLocation.pieceType, fromLocation.color);

    if (!piece) {
      throw new Error('No piece found');
    }

    const pieceInSquare = this.getBoardPiece(toLocation);
    const isPawnPromotion = this.isPromoting(piece, toLocation);
    const wasKing = Game.isKing(piece);
    const castlingRook = this.getCastlingRook(piece, toLocation);
    const isCastling = !!castlingRook;
    const isKingSideCastling = isCastling && toX - (fromLocation as PieceBoardLocation).x > 0;
    const newLocation: PieceBoardLocation = {
      ...(
        isCastling
          ? isKingSideCastling
            ? { board: toBoard, x: this.boardWidth - 2, y: toY }
            : { board: toBoard, x: 2, y: toY }
          : toLocation
      ),
      type: PieceLocationEnum.BOARD,
    };
    const isRoyalKing = wasKing && !this.isAntichess;
    const isAnyCapture = (
      !castlingRook
      && !!pieceInSquare
      && fromLocation.type === PieceLocationEnum.BOARD
      && (
        !Game.isPawn(piece)
        || fromLocation.x - toX !== 0
      )
    );
    const isOpponentCapture = isAnyCapture && !!pieceInSquare && pieceInSquare.color !== piece.color;
    const movedPieces: BoardPiece[] = [piece as BoardPiece];

    if (pieceInSquare && (!castlingRook || pieceInSquare.id !== castlingRook.id)) {
      const goesToPocket = this.isCrazyhouse && isOpponentCapture;

      if (goesToPocket) {
        pieceInSquare.type = pieceInSquare.originalType;
        pieceInSquare.moved = false;
        pieceInSquare.color = piece.color;
      }

      this.changePieceLocation(
        pieceInSquare,
        goesToPocket
          ? { type: PieceLocationEnum.POCKET, pieceType: pieceInSquare.originalType, color: piece.color }
          : null,
      );
    }

    if (castlingRook) {
      const newRookLocation: PieceBoardLocation = {
        type: PieceLocationEnum.BOARD,
        board: toBoard,
        x: isKingSideCastling ? this.boardWidth - 3 : 3,
        y: toY,
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

    if (this.isAbsorption && isAnyCapture) {
      const {
        type,
        abilities,
      } = Game.getPieceTypeAfterAbsorption(piece, pieceInSquare!);

      piece.type = type;
      piece.originalType = type;
      piece.abilities = abilities;
    } else if (this.isFrankfurt && isAnyCapture && (!isRoyalKing || !isPawnPromotion)) {
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

    this.changePieceLocation(piece, newLocation);

    movedPieces.forEach((piece) => {
      times(this.boardCount - 1, (board) => {
        const pieceInSquare = this.getBoardPiece({
          ...piece.location,
          board: this.getNextBoard(piece.location.board + board),
        });

        if (pieceInSquare) {
          this.changePieceLocation(pieceInSquare, null);
        }
      });

      if (fromLocation.type === PieceLocationEnum.BOARD) {
        this.changePieceLocation(piece, {
          ...piece.location,
          board: this.getNextBoard(piece.location.board),
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
    super.registerAnyMove(move, true);

    if (this.isDarkChess) {
      this.savePieces();
    }
  }

  registerLocalDarkChessMove(move: DarkChessMove) {
    const revertMove = this.performDarkChessMove(move);

    this.colorMoves[this.darkChessMode!].push({
      ...move,
      revertMove,
    });

    this.changePlayerTime();
    this.savePieces();
  }

  registerMove(move: Move, constructMoveNotation: boolean): RegisterMoveReturnValue {
    const returnValue = super.registerMove(move, constructMoveNotation);

    this.changePlayerTime();

    if (!this.isDarkChess) {
      this.savePieces();
    }

    return returnValue;
  }

  registerPremove(move: Premove) {
    if (!this.premoves.length) {
      this.piecesBeforePremoves = this.pieces;

      this.setPieces(this.pieces.map(clone));
    }

    this.performPremove(move);

    this.premoves = [
      ...this.premoves,
      move,
    ];
  }

  requestTakeback() {
    this.socket?.emit('requestTakeback');
  }

  removeListeners() {
    this.listeners = {
      updateChat: [],
      updateGame: [],
    };
  }

  resign() {
    this.socket?.emit('resign');
  }

  revertAnyMove() {
    if (this.isOngoingDarkChessGame && this.darkChessMode) {
      this.colorMoves[this.darkChessMode][this.currentMoveIndex].revertMove();

      this.setPieces(this.visiblePieces[this.darkChessMode]);
    } else {
      this.moves[this.currentMoveIndex].revertMove();
    }
  }

  savePieces() {
    const moveIndex = this.getUsedMoves().length - 1;
    const pieces: Dictionary<Piece> = this.piecesByMove[moveIndex] = {};

    this.pieces.forEach((piece) => {
      pieces[piece.id] = clone(piece);
    });

    if (this.isDarkChess) {
      forEach(ColorEnum, (color) => {
        const pieces: Dictionary<Piece> = this.colorPiecesByMove[color][moveIndex] = {};

        this.getMoveVisiblePieces(moveIndex, color).forEach((piece) => {
          pieces[piece.id] = clone(piece);
        });
      });
    }
  }

  setBoardsShiftX(boardsShiftX: number) {
    this.boardsShiftX = boardsShiftX;

    this.updateGame();
  }

  setBoardToShow(boardNumber: number | 'all') {
    this.boardToShow = boardNumber;

    this.updateGame();
  }

  sendMessage(message: string) {
    this.socket?.emit('addChatMessage', message);
  }

  setPieces(pieces: readonly Piece[]) {
    this.pieces = pieces;

    this.resetBoards();
  }

  toggleIsBlackBase(changeDarkChessMode: boolean) {
    this.isBlackBase = !this.isBlackBase;

    if (changeDarkChessMode && this.isDarkChess && !this.isOngoingDarkChessGame) {
      this.changeDarkChessMode(
        this.isBlackBase
          ? ColorEnum.BLACK
          : ColorEnum.WHITE,
      );
    }

    this.updateGame();
  }

  toggleShowDarkChessHiddenPieces() {
    this.showDarkChessHiddenPieces = !this.showDarkChessHiddenPieces;

    this.updateGame();
  }

  unregisterLastMove() {
    const move = last(this.getUsedMoves())!;
    const needToUpdateTime = this.needToChangeTime();

    if (this.isOngoingDarkChessGame && this.darkChessMode) {
      last(this.colorMoves[this.darkChessMode])!.revertMove();

      this.colorMoves[this.darkChessMode] = this.colorMoves[this.darkChessMode].slice(0, -1);

      this.setPieces(this.visiblePieces[this.darkChessMode]);
    } else {
      last(this.moves)!.revertMove();

      this.moves = this.moves.slice(0, -1);
    }

    const player = this.players[this.turn];

    if (this.timeControl && needToUpdateTime) {
      player.time = move.timeBeforeMove[player.color];
    }
  }

  updateGame() {
    this.emit('updateGame');
  }
}
