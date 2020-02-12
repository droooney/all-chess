import * as _ from 'lodash';

import GameBoardUtils from './GameBoardUtils';
import {
  CastlingTypeEnum,
  ColorEnum,
  GameCreateOptions,
  GameVariantEnum,
  PieceLocationEnum,
  PieceTypeEnum,
  RealPiece,
  StartingData
} from '../../types';

const STANDARD_PIECE_PLACEMENT: readonly PieceTypeEnum[] = [
  PieceTypeEnum.ROOK,
  PieceTypeEnum.KNIGHT,
  PieceTypeEnum.BISHOP,
  PieceTypeEnum.QUEEN,
  PieceTypeEnum.KING,
  PieceTypeEnum.BISHOP,
  PieceTypeEnum.KNIGHT,
  PieceTypeEnum.ROOK
];

const TWO_FAMILIES_PIECE_PLACEMENT: readonly PieceTypeEnum[] = [
  PieceTypeEnum.ROOK,
  PieceTypeEnum.KNIGHT,
  PieceTypeEnum.BISHOP,
  PieceTypeEnum.QUEEN,
  PieceTypeEnum.KING,
  PieceTypeEnum.QUEEN,
  PieceTypeEnum.KING,
  PieceTypeEnum.BISHOP,
  PieceTypeEnum.KNIGHT,
  PieceTypeEnum.ROOK
];

const CAPABLANCA_PIECE_PLACEMENT: readonly PieceTypeEnum[] = [
  PieceTypeEnum.ROOK,
  PieceTypeEnum.KNIGHT,
  PieceTypeEnum.BISHOP,
  PieceTypeEnum.EMPRESS,
  PieceTypeEnum.QUEEN,
  PieceTypeEnum.KING,
  PieceTypeEnum.CARDINAL,
  PieceTypeEnum.BISHOP,
  PieceTypeEnum.KNIGHT,
  PieceTypeEnum.ROOK
];

const HEXAGONAL_PIECE_PLACEMENT: readonly PieceTypeEnum[] = [
  PieceTypeEnum.ROOK,
  PieceTypeEnum.KNIGHT,
  PieceTypeEnum.QUEEN,
  PieceTypeEnum.BISHOP,
  PieceTypeEnum.KING,
  PieceTypeEnum.KNIGHT,
  PieceTypeEnum.ROOK,
  PieceTypeEnum.BISHOP,
  PieceTypeEnum.BISHOP
];

const HEXAGONAL_PIECE_SQUARES: readonly [number, number][] = [
  [0, 2],
  [0, 3],
  [0, 4],
  [0, 5],
  [0, 6],
  [0, 7],
  [0, 8],
  [1, 5],
  [2, 5]
];

const STANDARD_STARTING_DATA: StartingData = {
  result: null,
  turn: ColorEnum.WHITE,
  startingMoveIndex: 0,
  pliesWithoutCaptureOrPawnMove: 0,
  possibleEnPassant: null,
  possibleCastling: {
    [ColorEnum.WHITE]: {
      [CastlingTypeEnum.KING_SIDE]: true,
      [CastlingTypeEnum.QUEEN_SIDE]: true
    },
    [ColorEnum.BLACK]: {
      [CastlingTypeEnum.KING_SIDE]: true,
      [CastlingTypeEnum.QUEEN_SIDE]: true
    }
  },
  checksCount: {
    [ColorEnum.WHITE]: 0,
    [ColorEnum.BLACK]: 0
  },
  pieces: []
};

export default abstract class GameStartingDataUtils extends GameBoardUtils {
  static generateClassicStartingData(variants: readonly GameVariantEnum[]): StartingData {
    const {
      boardWidth,
      boardHeight
    } = GameStartingDataUtils.getBoardDimensions(variants);
    const {
      isCapablanca,
      isCircularChess,
      isHorde,
      isTwoFamilies
    } = GameStartingDataUtils.getVariantsInfo(variants);
    const orthodoxBoardWidth = isCircularChess
      ? boardWidth * 2
      : boardWidth;
    const orthodoxBoardHeight = isCircularChess
      ? boardHeight / 2
      : boardHeight;
    const halfBoard = Math.round(orthodoxBoardWidth / 2);
    let id = 0;
    let pieceTypes: readonly PieceTypeEnum[];

    if (variants.includes(GameVariantEnum.CHESS_960)) {
      const randomPieceTypes: (PieceTypeEnum | null)[] = _.times(orthodoxBoardWidth, () => null!);

      const darkColoredBishopPosition = 2 * Math.floor(halfBoard * Math.random());
      const lightColoredBishopPosition = 2 * Math.floor(halfBoard * Math.random()) + 1;

      randomPieceTypes[darkColoredBishopPosition] = PieceTypeEnum.BISHOP;
      randomPieceTypes[lightColoredBishopPosition] = PieceTypeEnum.BISHOP;

      const placePiece = (type: PieceTypeEnum, position: number) => {
        let currentPosition = 0;

        randomPieceTypes.some((piece, ix) => {
          if (!piece && currentPosition++ === position) {
            randomPieceTypes[ix] = type;

            return true;
          }

          return false;
        });
      };

      placePiece(PieceTypeEnum.QUEEN, Math.floor((orthodoxBoardWidth - 2) * Math.random()));
      placePiece(PieceTypeEnum.KNIGHT, Math.floor((orthodoxBoardWidth - 3) * Math.random()));
      placePiece(PieceTypeEnum.KNIGHT, Math.floor((orthodoxBoardWidth - 4) * Math.random()));

      if (isTwoFamilies) {
        placePiece(PieceTypeEnum.QUEEN, Math.floor((orthodoxBoardWidth - 5) * Math.random()));
      } else if (isCapablanca) {
        placePiece(PieceTypeEnum.EMPRESS, Math.floor((orthodoxBoardWidth - 5) * Math.random()));
        placePiece(PieceTypeEnum.CARDINAL, Math.floor((orthodoxBoardWidth - 6) * Math.random()));
      }

      const restPieces = [PieceTypeEnum.ROOK, PieceTypeEnum.KING, PieceTypeEnum.ROOK];

      if (isTwoFamilies) {
        restPieces.splice(1, 0, PieceTypeEnum.KING);
      }

      let placedPieces = 0;

      randomPieceTypes.some((piece, ix) => {
        if (!piece) {
          randomPieceTypes[ix] = restPieces[placedPieces++];

          if (placedPieces === restPieces.length) {
            return true;
          }
        }

        return false;
      });

      pieceTypes = randomPieceTypes as readonly PieceTypeEnum[];
    } else if (isTwoFamilies) {
      pieceTypes = TWO_FAMILIES_PIECE_PLACEMENT;
    } else if (isCapablanca) {
      pieceTypes = CAPABLANCA_PIECE_PLACEMENT;
    } else {
      pieceTypes = STANDARD_PIECE_PLACEMENT;
    }

    const pieces: RealPiece[] = [];

    _.forEach(ColorEnum, (color) => {
      const addPiece = (type: PieceTypeEnum, x: number, y: number) => {
        pieces.push({
          id: `${++id}`,
          type,
          originalType: type,
          color,
          moved: false,
          abilities: null,
          location: {
            type: PieceLocationEnum.BOARD,
            board: 0,
            x,
            y
          }
        });
      };

      if (isHorde && color === ColorEnum.WHITE) {
        const lastPawnRank = 4;

        _.times(lastPawnRank, (y) => {
          _.times(orthodoxBoardWidth, (x) => {
            addPiece(PieceTypeEnum.PAWN, x, y);
          });
        });

        addPiece(PieceTypeEnum.PAWN, 1, lastPawnRank);
        addPiece(PieceTypeEnum.PAWN, 2, lastPawnRank);

        if (isCapablanca) {
          addPiece(PieceTypeEnum.PAWN, halfBoard - 1, lastPawnRank);
          addPiece(PieceTypeEnum.PAWN, halfBoard, lastPawnRank);
        }

        addPiece(PieceTypeEnum.PAWN, orthodoxBoardWidth - 2, lastPawnRank);
        addPiece(PieceTypeEnum.PAWN, orthodoxBoardWidth - 3, lastPawnRank);
      } else {
        const pieceRankY = color === ColorEnum.WHITE ? 0 : orthodoxBoardHeight - 1;
        const pawnRankY = color === ColorEnum.WHITE ? 1 : orthodoxBoardHeight - 2;

        pieceTypes.forEach((type, x) => {
          addPiece(type, x, pieceRankY);
        });

        _.times(orthodoxBoardWidth, (x) => {
          addPiece(PieceTypeEnum.PAWN, x, pawnRankY);
        });
      }
    });

    if (isCircularChess) {
      pieces.forEach((piece) => {
        if (GameStartingDataUtils.isBoardPiece(piece) && piece.location.x >= boardWidth) {
          piece.location = {
            ...piece.location,
            x: orthodoxBoardWidth - 1 - piece.location.x,
            y: boardHeight - 1 - piece.location.y
          };
        }
      });
    }

    return {
      ...STANDARD_STARTING_DATA,
      pieces
    };
  }

  static generateHexagonalStartingData(): StartingData {
    const pieces: RealPiece[] = [];
    const boardHeight = 11;
    const middleFile = 5;
    let id = 0;

    _.forEach(ColorEnum, (color) => {
      const addPiece = (type: PieceTypeEnum, x: number, y: number) => {
        pieces.push({
          id: `${++id}`,
          type,
          originalType: type,
          color,
          moved: false,
          abilities: null,
          location: {
            type: PieceLocationEnum.BOARD,
            board: 0,
            x,
            y: color === ColorEnum.WHITE
              ? y
              : boardHeight - 1 - y - Math.abs(x - middleFile)
          }
        });
      };

      HEXAGONAL_PIECE_SQUARES.forEach(([y, x], ix) => {
        addPiece(HEXAGONAL_PIECE_PLACEMENT[ix], x, y);
      });

      _.times(9, (x) => {
        addPiece(PieceTypeEnum.PAWN, x + 1, middleFile - 1 - Math.abs(x + 1 - middleFile));
      });
    });

    return {
      ...STANDARD_STARTING_DATA,
      pieces
    };
  }

  static getStartingData(variants: readonly GameVariantEnum[]): StartingData {
    const {
      isAntichess,
      isCircularChess,
      isCylinderChess,
      isHexagonalChess
    } = GameStartingDataUtils.getVariantsInfo(variants);
    const startingData = isHexagonalChess
      ? GameStartingDataUtils.generateHexagonalStartingData()
      : GameStartingDataUtils.generateClassicStartingData(variants);

    if (isAntichess || isCylinderChess || isCircularChess || isHexagonalChess) {
      startingData.possibleCastling = {
        [ColorEnum.WHITE]: {
          [CastlingTypeEnum.KING_SIDE]: false,
          [CastlingTypeEnum.QUEEN_SIDE]: false
        },
        [ColorEnum.BLACK]: {
          [CastlingTypeEnum.KING_SIDE]: false,
          [CastlingTypeEnum.QUEEN_SIDE]: false
        }
      };
    }

    return startingData;
  }

  startingData: StartingData;
  startingMoveIndex: number;

  protected constructor(options: GameCreateOptions) {
    super(options);

    this.startingData = options.startingData || GameStartingDataUtils.getStartingData(options.variants);
    this.startingMoveIndex = this.startingData.startingMoveIndex;
  }
}
