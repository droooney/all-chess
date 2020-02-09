/// <reference path="../../typings/generator.d.ts"/>

import * as _ from 'lodash';

import GamePieceUtils from './GamePieceUtils';
import {
  BoardDimensions,
  Boards,
  CenterSquareParams,
  ColorEnum,
  GameCreateOptions,
  GameVariantEnum,
  GetPossibleMovesMode,
  Square
} from '../../types';

const HEXAGONAL_EMPTY_SQUARES: readonly Square[] = [
  [6, 0], [6, 10],
  [7, 0], [7, 1], [7, 9], [7, 10],
  [8, 0], [8, 1], [8, 2], [8, 8], [8, 9], [8, 10],
  [9, 0], [9, 1], [9, 2], [9, 3], [9, 7], [9, 8], [9, 9], [9, 10],
  [10, 0], [10, 1], [10, 2], [10, 3], [10, 4], [10, 6], [10, 7], [10, 8], [10, 9], [10, 10]
].map(([y, x]) => ({ board: 0, x, y }));

export default abstract class GameBoardUtils extends GamePieceUtils {
  static areSquaresEqual(square1: Square, square2: Square): boolean {
    return (
      square1.board === square2.board
      && square1.y === square2.y
      && square1.x === square2.x
    );
  }

  static getBoardDimensions(variants: readonly GameVariantEnum[]): BoardDimensions {
    const {
      isAliceChess,
      isAmazons,
      isCapablanca,
      isCircularChess,
      isHexagonalChess,
      isTwoFamilies
    } = GameBoardUtils.getVariantsInfo(variants);
    const dimensions: BoardDimensions = {
      boardCount: isAliceChess ? 2 : 1,
      boardWidth: isTwoFamilies || isCapablanca || isAmazons
        ? 10
        : isHexagonalChess
          ? 11
          : 8,
      boardHeight: isHexagonalChess
        ? 11
        : 8
    };

    if (!isCircularChess) {
      return dimensions;
    }

    return {
      ...dimensions,
      boardWidth: dimensions.boardWidth / 2,
      boardHeight: dimensions.boardHeight * 2
    };
  }

  static getBoardLiteral(board: number): string {
    return (board + 1)
      .toString()
      .split('')
      .map((digit) => String.fromCharCode(+digit + 8320))
      .join('');
  }

  static getBoardNumber(boardLiteral: string): number {
    const digitCharCodes = boardLiteral
      .split('')
      .map((digit) => digit.charCodeAt(0) - 8320);

    if (digitCharCodes.some((charCode) => charCode < 0 || charCode > 9)) {
      return -1;
    }

    return +digitCharCodes.join('') - 1;
  }

  static getEmptySquares(variants: readonly GameVariantEnum[]): readonly Square[] {
    const {
      isAliceChess,
      isHexagonalChess
    } = GameBoardUtils.getVariantsInfo(variants);

    if (!isHexagonalChess) {
      return [];
    }

    return isAliceChess
      ? [...HEXAGONAL_EMPTY_SQUARES, ...HEXAGONAL_EMPTY_SQUARES.map((square) => ({ ...square, board: 1 }))]
      : HEXAGONAL_EMPTY_SQUARES;
  }

  static getFileLiteral(file: number): string {
    return String.fromCharCode(file + 97);
  }

  static getFileNumber(fileLiteral: string): number {
    return fileLiteral.length
      ? fileLiteral.charCodeAt(0) - 97
      : -1;
  }

  static getRankLiteral(rank: number): string {
    return `${rank + 1}`;
  }

  static getRankNumber(rankLiteral: string): number {
    return (Number(rankLiteral) || 0) - 1;
  }

  boards: Boards = [];
  boardCount: number;
  boardHeight: number;
  boardOrthodoxHeight: number;
  boardOrthodoxWidth: number;
  boardWidth: number;
  emptySquares: readonly Square[];
  middleFileX: number;
  middleRankY: number;

  protected constructor(options: GameCreateOptions) {
    super(options);

    ({
      boardCount: this.boardCount,
      boardWidth: this.boardWidth,
      boardHeight: this.boardHeight
    } = GameBoardUtils.getBoardDimensions(options.variants));

    this.boardOrthodoxWidth = this.isCircularChess
      ? this.boardWidth * 2
      : this.boardWidth;
    this.boardOrthodoxHeight = this.isCircularChess
      ? this.boardHeight / 2
      : this.boardHeight;
    this.middleFileX = Math.ceil(this.boardWidth / 2) - 1;
    this.middleRankY = Math.ceil(this.boardHeight / 2) - 1;

    this.emptySquares = GameBoardUtils.getEmptySquares(this.variants);
  }

  adjustFileX(fileX: number): number {
    return this.isCylinderChess
      ? (fileX + this.boardWidth) % this.boardWidth
      : fileX;
  }

  adjustRankY(rankY: number): number {
    return this.isCircularChess
      ? (rankY + this.boardHeight) % this.boardHeight
      : rankY;
  }

  getCenterSquareParams(square: Square): CenterSquareParams | null {
    const leftCenterX = Math.round(this.boardWidth / 2) - 1;
    const rightCenterX = leftCenterX + 1;
    const topCenterY = Math.round(this.boardHeight / 2);
    const bottomCenterY = topCenterY - 1;
    const {
      x: squareX,
      y: squareY
    } = square;

    if (squareX === leftCenterX && squareY === topCenterY) {
      return { top: true, left: true };
    }

    if (squareX === leftCenterX && squareY === bottomCenterY) {
      return { bottom: true, left: true };
    }

    if (squareX === rightCenterX && squareY === topCenterY) {
      return { top: true, right: true };
    }

    if (squareX === rightCenterX && squareY === bottomCenterY) {
      return { bottom: true, right: true };
    }

    return null;
  }

  getNextBoard(board: number): number {
    return (board + 1) % this.boardCount;
  }

  getPrevBoard(board: number): number {
    return (board + this.boardCount - 1) % this.boardCount;
  }

  getVisibleSquares(forColor: ColorEnum): Square[] {
    return this.getPieces(forColor)
      .filter(GameBoardUtils.isBoardPiece)
      .reduce((squares, piece) => {
        let newSquares = this.getFilteredPossibleMoves(piece, GetPossibleMovesMode.VISIBLE)
          .map(({ square }) => square)
          .toArray();

        if (this.isAliceChess) {
          _.times(this.boardCount - 1, (board) => {
            newSquares = [
              ...newSquares,
              ...newSquares.map((square) => ({
                ...square,
                board: this.getNextBoard(square.board + board)
              }))
            ];
          });
        }

        return [
          ...squares,
          ...newSquares
        ];
      }, [] as Square[]);
  }

  isAttackedByOpponentPiece(square: Square, opponentColor: ColorEnum): boolean {
    return this.getPieces(opponentColor).some((piece) => (
      GameBoardUtils.isBoardPiece(piece)
      && this.getFilteredPossibleMoves(piece, GetPossibleMovesMode.ATTACKED).any(({ square: possibleSquare }) => (
        GameBoardUtils.areSquaresEqual(possibleSquare, square)
      ))
    ));
  }

  isAvailableSquare(square: Square): boolean {
    return !this.isAliceChess || _.times(this.boardCount - 1).every((board) => (
      !this.getBoardPiece({
        ...square,
        board: this.getNextBoard(square.board + board)
      })
    ));
  }

  isEmptySquare(square: Square): boolean {
    return this.emptySquares.some((emptySquare) => (
      GameBoardUtils.areSquaresEqual(square, emptySquare)
    ));
  }

  isKingInTheCenter(color: ColorEnum): boolean {
    return this.kings[color].some((king) => (
      GameBoardUtils.isBoardPiece(king)
      && !!this.getCenterSquareParams(king.location)
    ));
  }

  isNullSquare(square: Square): boolean {
    return (
      square.board < 0
      || square.board > this.boardCount - 1
      || square.y < 0
      || square.y > this.boardHeight - 1
      || square.x < 0
      || square.x > this.boardWidth - 1
      || this.isEmptySquare(square)
    );
  }

  isPatrolledByFriendlyPiece(square: Square, color: ColorEnum): boolean {
    return this.getPieces(color).some((piece) => (
      GameBoardUtils.isBoardPiece(piece)
      && this.getFilteredPossibleMoves(piece, GetPossibleMovesMode.CONTROLLED).any(({ square: sq }) => (
        GameBoardUtils.areSquaresEqual(sq, square)
      ))
    ));
  }

  resetBoards() {
    this.boards = _.times(this.boardCount, () => (
      _.times(this.boardHeight, () => (
        _.times(this.boardWidth, () => null)
      ))
    ));

    this.pieces.forEach((piece) => {
      if (GameBoardUtils.isBoardPiece(piece)) {
        this.changePieceLocation(piece, piece.location);
      }
    });
  }

  setupStartingData() {
    super.setupStartingData();

    this.resetBoards();
  }
}
