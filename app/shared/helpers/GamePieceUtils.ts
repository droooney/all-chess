/// <reference path="../typings/generator.d.ts"/>

import findKey from 'lodash/findKey';
import forEach from 'lodash/forEach';
import mapValues from 'lodash/mapValues';

import {
  PIECES_WORTH,
  SHORT_PIECE_NAMES,
} from 'shared/constants';

import {
  BoardPiece,
  Boards,
  ColorEnum,
  EachColor,
  EachPieceType,
  GameCreateOptions,
  GameKings,
  GetPossibleMovesMode,
  MovementType,
  NonExistentPiece,
  Piece,
  PieceLocation,
  PieceLocationEnum,
  PieceTypeEnum,
  PocketPiece,
  PossibleEnPassant,
  RealPiece,
  Square,
  StartingData,
} from 'shared/types';

import GameTurnUtils from './GameTurnUtils';

interface PiecesData {
  kings: GameKings;
  pieces: Piece[];
}

const PIECES_SORTING: readonly PieceTypeEnum[] = [
  PieceTypeEnum.AMAZON,
  PieceTypeEnum.QUEEN,
  PieceTypeEnum.EMPRESS,
  PieceTypeEnum.CARDINAL,
  PieceTypeEnum.ROOK,
  PieceTypeEnum.BISHOP,
  PieceTypeEnum.KNIGHT,
  PieceTypeEnum.PAWN,
];

const STANDARD_VALID_PROMOTIONS: readonly PieceTypeEnum[] = [
  PieceTypeEnum.QUEEN,
  PieceTypeEnum.ROOK,
  PieceTypeEnum.BISHOP,
  PieceTypeEnum.KNIGHT,
];

const CAPABLANCA_VALID_PROMOTIONS: readonly PieceTypeEnum[] = [
  PieceTypeEnum.QUEEN,
  PieceTypeEnum.EMPRESS,
  PieceTypeEnum.CARDINAL,
  PieceTypeEnum.ROOK,
  PieceTypeEnum.BISHOP,
  PieceTypeEnum.KNIGHT,
];

const STANDARD_POCKET: readonly PieceTypeEnum[] = [
  PieceTypeEnum.QUEEN,
  PieceTypeEnum.ROOK,
  PieceTypeEnum.BISHOP,
  PieceTypeEnum.KNIGHT,
  PieceTypeEnum.PAWN,
];

const CAPABLANCA_POCKET: readonly PieceTypeEnum[] = [
  PieceTypeEnum.QUEEN,
  PieceTypeEnum.EMPRESS,
  PieceTypeEnum.CARDINAL,
  PieceTypeEnum.ROOK,
  PieceTypeEnum.BISHOP,
  PieceTypeEnum.KNIGHT,
  PieceTypeEnum.PAWN,
];

export default abstract class GamePieceUtils extends GameTurnUtils {
  static getPieceLiteral(pieceType: PieceTypeEnum): string {
    return SHORT_PIECE_NAMES[pieceType];
  }

  static getPieceFromLiteral(pieceLiteral: string): { color: ColorEnum; type: PieceTypeEnum } | undefined {
    const pieceName = pieceLiteral.toUpperCase();
    const color = pieceName === pieceLiteral ? ColorEnum.WHITE : ColorEnum.BLACK;
    const pieceType = findKey(SHORT_PIECE_NAMES, (shortPieceName) => shortPieceName === pieceName) as PieceTypeEnum | undefined;

    return pieceType && {
      color,
      type: pieceType,
    };
  }

  static getPieceTypeAfterAbsorption(originalPiece: Piece, absorbedPiece: Piece): Pick<Piece, 'type' | 'abilities'> {
    if (GamePieceUtils.isKing(originalPiece)) {
      if (GamePieceUtils.isKing(absorbedPiece)) {
        if (originalPiece.abilities && absorbedPiece.abilities) {
          return GamePieceUtils.getPieceTypeAfterAbsorption(originalPiece, {
            ...absorbedPiece,
            type: absorbedPiece.abilities,
          });
        }

        return {
          type: PieceTypeEnum.KING,
          abilities: originalPiece.abilities || absorbedPiece.abilities,
        };
      }

      if (originalPiece.abilities) {
        return {
          type: PieceTypeEnum.KING,
          abilities: GamePieceUtils.getPieceTypeAfterAbsorption({
            ...originalPiece,
            type: originalPiece.abilities,
          }, absorbedPiece).type,
        };
      }

      return {
        type: PieceTypeEnum.KING,
        abilities: GamePieceUtils.isPawn(absorbedPiece)
          ? null
          : absorbedPiece.type,
      };
    }

    if (GamePieceUtils.isKing(absorbedPiece)) {
      return GamePieceUtils.getPieceTypeAfterAbsorption(absorbedPiece, originalPiece);
    }

    const originalIndex = PIECES_SORTING.indexOf(originalPiece.type);
    const absorbedIndex = PIECES_SORTING.indexOf(absorbedPiece.type);
    const majorPiece = originalIndex > absorbedIndex
      ? absorbedPiece
      : originalPiece;
    const minorPiece = originalIndex > absorbedIndex
      ? originalPiece
      : absorbedPiece;
    let newPieceType = majorPiece.type;

    if (
      GamePieceUtils.isKnight(minorPiece)
      && (
        GamePieceUtils.isQueen(majorPiece)
        || GamePieceUtils.isRook(majorPiece)
        || GamePieceUtils.isBishop(majorPiece)
      )
    ) {
      newPieceType = GamePieceUtils.isQueen(majorPiece)
        ? PieceTypeEnum.AMAZON
        : GamePieceUtils.isRook(majorPiece)
          ? PieceTypeEnum.EMPRESS
          : PieceTypeEnum.CARDINAL;
    } else if (
      GamePieceUtils.isBishop(minorPiece)
      && (
        GamePieceUtils.isEmpress(majorPiece)
        || GamePieceUtils.isRook(majorPiece)
      )
    ) {
      newPieceType = GamePieceUtils.isEmpress(majorPiece)
        ? PieceTypeEnum.AMAZON
        : PieceTypeEnum.QUEEN;
    } else if ((
      GamePieceUtils.isRook(minorPiece)
      && GamePieceUtils.isCardinal(majorPiece)
    ) || (
      GamePieceUtils.isCardinal(minorPiece)
      && (
        GamePieceUtils.isQueen(majorPiece)
        || GamePieceUtils.isEmpress(majorPiece)
      )
    ) || (
      GamePieceUtils.isEmpress(minorPiece)
      && GamePieceUtils.isQueen(majorPiece)
    )) {
      newPieceType = PieceTypeEnum.AMAZON;
    }

    return {
      type: newPieceType,
      abilities: null,
    };
  }

  static getPiecesDataFromStartingData(startingData: StartingData): PiecesData {
    const kings: GameKings = {
      [ColorEnum.WHITE]: [],
      [ColorEnum.BLACK]: [],
    };
    const pieces: Piece[] = startingData.pieces.map((piece) => {
      piece = { ...piece };

      if (GamePieceUtils.isKing(piece)) {
        kings[piece.color].push(piece);
      }

      return piece;
    });

    forEach(kings, (kings) => {
      kings.forEach((king) => {
        pieces.splice(pieces.indexOf(king), 1);
        pieces.unshift(king);
      });
    });

    return {
      kings,
      pieces,
    };
  }

  static hasMovement(piece: Piece, movementType: MovementType) {
    return (
      movementType === PieceTypeEnum.ROOK
        ? GamePieceUtils.isRookLike(piece)
        : movementType === PieceTypeEnum.BISHOP
          ? GamePieceUtils.isBishopLike(piece)
          : GamePieceUtils.isKnightLike(piece)
    );
  }

  static isBishopLike(piece: Piece): boolean {
    return (
      GamePieceUtils.isAmazon(piece)
      || GamePieceUtils.isQueen(piece)
      || GamePieceUtils.isCardinal(piece)
      || GamePieceUtils.isBishop(piece)
    );
  }

  static isBoardPiece(piece: Piece): piece is BoardPiece {
    return GamePieceUtils.isRealPiece(piece) && piece.location.type === PieceLocationEnum.BOARD;
  }

  static isKnightLike(piece: Piece): boolean {
    return (
      GamePieceUtils.isAmazon(piece)
      || GamePieceUtils.isEmpress(piece)
      || GamePieceUtils.isCardinal(piece)
      || GamePieceUtils.isKnight(piece)
    );
  }

  static isNonExistentPiece(piece: Piece): piece is NonExistentPiece {
    return !piece.location;
  }

  static isPiece(piece: Piece, type: PieceTypeEnum): boolean {
    return (
      piece.type === type
      || piece.abilities === type
    );
  }

  static isPocketPiece(piece: Piece): piece is PocketPiece {
    return GamePieceUtils.isRealPiece(piece) && piece.location.type === PieceLocationEnum.POCKET;
  }

  static isRealPiece(piece: Piece): piece is RealPiece {
    return !!piece.location;
  }

  static isRookLike(piece: Piece): boolean {
    return (
      GamePieceUtils.isAmazon(piece)
      || GamePieceUtils.isQueen(piece)
      || GamePieceUtils.isEmpress(piece)
      || GamePieceUtils.isRook(piece)
    );
  }

  static isKing = (piece: Piece): boolean => GamePieceUtils.isPiece(piece, PieceTypeEnum.KING);
  static isAmazon = (piece: Piece): boolean => GamePieceUtils.isPiece(piece, PieceTypeEnum.AMAZON);
  static isQueen = (piece: Piece): boolean => GamePieceUtils.isPiece(piece, PieceTypeEnum.QUEEN);
  static isEmpress = (piece: Piece): boolean => GamePieceUtils.isPiece(piece, PieceTypeEnum.EMPRESS);
  static isCardinal = (piece: Piece): boolean => GamePieceUtils.isPiece(piece, PieceTypeEnum.CARDINAL);
  static isRook = (piece: Piece): boolean => GamePieceUtils.isPiece(piece, PieceTypeEnum.ROOK);
  static isBishop = (piece: Piece): boolean => GamePieceUtils.isPiece(piece, PieceTypeEnum.BISHOP);
  static isKnight = (piece: Piece): boolean => GamePieceUtils.isPiece(piece, PieceTypeEnum.KNIGHT);
  static isPawn = (piece: Piece): boolean => GamePieceUtils.isPiece(piece, PieceTypeEnum.PAWN);

  abstract boards: Boards;
  abstract possibleEnPassant: PossibleEnPassant | null = null;

  abstract getFilteredPossibleMoves(piece: RealPiece, move: GetPossibleMovesMode): Generator<Square>;
  abstract isLastRank(square: Square, color: ColorEnum): boolean;

  kings: GameKings = {
    [ColorEnum.WHITE]: [],
    [ColorEnum.BLACK]: [],
  };
  pieces: readonly Piece[] = [];
  piecesWorth: EachPieceType<number>;
  pocketPiecesUsed: readonly PieceTypeEnum[] = STANDARD_POCKET;
  validPromotions: readonly PieceTypeEnum[] = STANDARD_VALID_PROMOTIONS;

  protected constructor(options: GameCreateOptions) {
    super(options);

    this.piecesWorth = PIECES_WORTH[
      this.isCircularChess
        ? 'circular'
        : this.isHexagonalChess
          ? 'hexagonal'
          : 'orthodox'
    ];

    if (this.isCapablanca) {
      this.validPromotions = CAPABLANCA_VALID_PROMOTIONS;
      this.pocketPiecesUsed = CAPABLANCA_POCKET;
    }

    if (this.isAntichess) {
      this.validPromotions = [
        PieceTypeEnum.KING,
        ...this.validPromotions,
      ];
    }
  }

  areKingsOnTheBoard(color: ColorEnum): boolean {
    return this.kings[color].every(GamePieceUtils.isBoardPiece);
  }

  changePieceLocation(piece: Piece, location: PieceLocation) {
    if (GamePieceUtils.isBoardPiece(piece)) {
      const pieceInSquare = this.boards[piece.location.board][piece.location.y][piece.location.x];

      if (pieceInSquare && pieceInSquare.id === piece.id) {
        this.boards[piece.location.board][piece.location.y][piece.location.x] = null;
      }
    }

    piece.location = location;

    if (location && location.type === PieceLocationEnum.BOARD) {
      this.boards[location.board][location.y][location.x] = piece as BoardPiece;
    }
  }

  getBoardPiece(square: Square): BoardPiece | null {
    return this.boards[square.board][square.y][square.x];
  }

  getBoardPieces(playerColor: ColorEnum): BoardPiece[] {
    return this.pieces.filter((piece) => (
      GamePieceUtils.isBoardPiece(piece)
      && piece.color === playerColor
    )) as BoardPiece[];
  }

  getCapturedPiece(piece: RealPiece, square: Square): BoardPiece | null {
    const pieceInSquare = this.getBoardPiece(square);

    if (pieceInSquare) {
      return pieceInSquare.color === piece.color
        ? null
        : pieceInSquare;
    }

    if (
      GamePieceUtils.isPawn(piece)
      && GamePieceUtils.isBoardPiece(piece)
      && this.possibleEnPassant
      && square.board === this.possibleEnPassant.enPassantSquare.board
      && square.y === this.possibleEnPassant.enPassantSquare.y
      && square.x === this.possibleEnPassant.enPassantSquare.x
    ) {
      return this.getBoardPiece(this.possibleEnPassant.pieceLocation);
    }

    return null;
  }

  getPieces(playerColor: ColorEnum): RealPiece[] {
    return this.pieces
      .filter(GamePieceUtils.isRealPiece)
      .filter(({ color }) => color === playerColor);
  }

  getPiecesWorth(): EachColor<number> {
    return mapValues(ColorEnum, (color) => {
      let sumPiecesWorth = 0;

      this.getPieces(color).forEach(({ type }) => {
        if (type !== PieceTypeEnum.KING) {
          sumPiecesWorth += this.piecesWorth[type];
        }
      });

      return sumPiecesWorth;
    });
  }

  getPocketPiece(type: PieceTypeEnum, color: ColorEnum): PocketPiece | null {
    return this.pieces.find((piece) => (
      GamePieceUtils.isPocketPiece(piece)
      && piece.color === color
      && piece.location.pieceType === type
    )) as PocketPiece | undefined || null;
  }

  hasCapturePieces(color: ColorEnum): boolean {
    return this.getPieces(color).some((piece) => (
      this.getFilteredPossibleMoves(piece, GetPossibleMovesMode.FOR_MOVE).any((square) => (
        !!this.getCapturedPiece(piece, square)
      ))
    ));
  }

  isNoPieces(color: ColorEnum): boolean {
    return !this.getPieces(color).length;
  }

  isParalysed(piece: RealPiece): boolean {
    return (
      GamePieceUtils.isBoardPiece(piece)
      && this.getFilteredPossibleMoves(piece, GetPossibleMovesMode.POSSIBLE).any((square) => {
        const pieceInSquare = this.getBoardPiece(square);

        return (
          !!pieceInSquare
          && pieceInSquare.color !== piece.color
          && pieceInSquare.type === piece.type
          && pieceInSquare.abilities === piece.abilities
        );
      })
    );
  }

  isPromoting(piece: Piece, square: Square): boolean {
    return (
      this.isLastRank(square, piece.color)
      && GamePieceUtils.isPawn(
        this.isFrankfurt
          ? this.getBoardPiece(square) || piece
          : piece,
      )
    );
  }

  setupStartingData() {
    super.setupStartingData();

    ({
      pieces: this.pieces,
      kings: this.kings,
    } = GamePieceUtils.getPiecesDataFromStartingData(this.startingData));
  }
}
