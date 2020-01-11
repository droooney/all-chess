import * as _ from 'lodash';
import {
  BoardDimensions,
  BoardPiece,
  CastlingTypeEnum,
  CenterSquareParams,
  ChatMessage,
  ChecksCount,
  ColorEnum,
  DarkChessRevertableMove,
  Game as IGame,
  GameCreateSettings,
  GameKings,
  GamePlayers,
  GameResult,
  GameStatusEnum,
  GameVariantEnum,
  Move,
  NonExistentPiece,
  PGNTags,
  Piece,
  PieceBoardLocation,
  PieceLocationEnum,
  PiecePocketLocation,
  PieceTypeEnum,
  PocketPiece,
  PossibleEnPassant,
  PossibleMove,
  RealPiece,
  RealPieceLocation,
  ResultReasonEnum,
  RevertableMove,
  Square,
  StandardPiece,
  StartingData,
  TakebackRequest,
  TimeControl,
  TimeControlEnum
} from '../../types';
import {
  COLOR_NAMES,
  GAME_VARIANT_PGN_NAMES,
  PIECE_LITERALS,
  SHORT_PIECE_NAMES
} from '../constants';

interface BoardData {
  kings: GameKings;
  pieces: Piece[];
}

interface PerformMoveReturnValue {
  allowed: boolean;
  algebraic: string;
  figurine: string;
  movedPiece: RealPiece;
  isCapture: boolean;
  revertMove(): void;
}

interface RegisterMoveReturnValue {
  movedPiece: RealPiece;
  isWin: boolean;
  isCapture: boolean;
}

interface PossibleMovesOptions {
  onlyAttacked?: true;
  onlyControlled?: true;
  onlyVisible?: true;
  onlyPossible?: true;
}

interface PerformMoveOptions {
  constructMoveLiterals?: boolean;
  constructPositionString?: boolean;
  checkIfAllowed?: boolean;
}

type CastlingRookCoordinates = {
  [castling in CastlingTypeEnum]: Square | null;
};

const ATOMIC_SQUARE_INCREMENTS: ReadonlyArray<[number, number]> = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 0],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1]
];

const KNIGHT_MOVE_INCREMENTS: ReadonlyArray<[number, number]> = [
  [-2, -1],
  [-2, +1],
  [-1, -2],
  [-1, +2],
  [+1, -2],
  [+1, +2],
  [+2, -1],
  [+2, +1]
];

const HEX_KNIGHT_MOVE_INCREMENTS: ReadonlyArray<[number, number]> = [
  [-2, -3],
  [-1, -3],
  [+1, +3],
  [+2, +3],
  [-3, -1],
  [-3, -2],
  [+3, +1],
  [+3, +2],
  [-2, +1],
  [-1, +2],
  [+1, -2],
  [+2, -1]
];

const BISHOP_MOVE_INCREMENTS: ReadonlyArray<[number, number]> = [
  [-1, -1],
  [-1, +1],
  [+1, -1],
  [+1, +1]
];

const HEX_BISHOP_MOVE_INCREMENTS: ReadonlyArray<[number, number]> = [
  [-1, -2],
  [+1, +2],
  [-2, -1],
  [-1, +1],
  [+1, -1],
  [+2, +1]
];

const ROOK_MOVE_INCREMENTS: ReadonlyArray<[number, number]> = [
  [-1, 0],
  [0, -1],
  [0, +1],
  [+1, 0]
];

const HEX_ROOK_MOVE_INCREMENTS: ReadonlyArray<[number, number]> = [
  [-1, 0],
  [0, -1],
  [0, 1],
  [1, 0],
  [-1, -1],
  [1, 1]
];

const STANDARD_PIECES: ReadonlyArray<PieceTypeEnum> = [
  PieceTypeEnum.KING,
  PieceTypeEnum.QUEEN,
  PieceTypeEnum.ROOK,
  PieceTypeEnum.BISHOP,
  PieceTypeEnum.KNIGHT,
  PieceTypeEnum.PAWN
];

const STANDARD_PIECE_PLACEMENT: ReadonlyArray<PieceTypeEnum> = [
  PieceTypeEnum.ROOK,
  PieceTypeEnum.KNIGHT,
  PieceTypeEnum.BISHOP,
  PieceTypeEnum.QUEEN,
  PieceTypeEnum.KING,
  PieceTypeEnum.BISHOP,
  PieceTypeEnum.KNIGHT,
  PieceTypeEnum.ROOK
];

const TWO_FAMILIES_PIECE_PLACEMENT: PieceTypeEnum[] = [
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

const CAPABLANCA_PIECE_PLACEMENT: PieceTypeEnum[] = [
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

const STANDARD_VALID_PROMOTIONS: PieceTypeEnum[] = [
  PieceTypeEnum.QUEEN,
  PieceTypeEnum.ROOK,
  PieceTypeEnum.BISHOP,
  PieceTypeEnum.KNIGHT
];

const CAPABLANCA_VALID_PROMOTIONS: PieceTypeEnum[] = [
  PieceTypeEnum.QUEEN,
  PieceTypeEnum.EMPRESS,
  PieceTypeEnum.CARDINAL,
  PieceTypeEnum.ROOK,
  PieceTypeEnum.BISHOP,
  PieceTypeEnum.KNIGHT
];

const STANDARD_POCKET: PieceTypeEnum[] = [
  PieceTypeEnum.QUEEN,
  PieceTypeEnum.ROOK,
  PieceTypeEnum.BISHOP,
  PieceTypeEnum.KNIGHT,
  PieceTypeEnum.PAWN
];

const CAPABLANCA_POCKET: PieceTypeEnum[] = [
  PieceTypeEnum.QUEEN,
  PieceTypeEnum.EMPRESS,
  PieceTypeEnum.CARDINAL,
  PieceTypeEnum.ROOK,
  PieceTypeEnum.BISHOP,
  PieceTypeEnum.KNIGHT,
  PieceTypeEnum.PAWN
];

const PIECES_SORTING: PieceTypeEnum[] = [
  PieceTypeEnum.AMAZON,
  PieceTypeEnum.QUEEN,
  PieceTypeEnum.EMPRESS,
  PieceTypeEnum.CARDINAL,
  PieceTypeEnum.ROOK,
  PieceTypeEnum.BISHOP,
  PieceTypeEnum.KNIGHT,
  PieceTypeEnum.PAWN
];

const HEXAGONAL_EMPTY_SQUARES: ReadonlyArray<Square> = [
  [6, 0], [6, 10],
  [7, 0], [7, 1], [7, 9], [7, 10],
  [8, 0], [8, 1], [8, 2], [8, 8], [8, 9], [8, 10],
  [9, 0], [9, 1], [9, 2], [9, 3], [9, 7], [9, 8], [9, 9], [9, 10],
  [10, 0], [10, 1], [10, 2], [10, 3], [10, 4], [10, 6], [10, 7], [10, 8], [10, 9], [10, 10]
].map(([y, x]) => ({ board: 0, x, y }));

const HEXAGONAL_PIECE_SQUARES: ReadonlyArray<[number, number]> = [
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

const HEXAGONAL_PIECE_PLACEMENT: ReadonlyArray<PieceTypeEnum> = [
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
  pieces: [],
  emptySquares: []
};

const DEFAULT_MOVE = {
  capture: null,
  castling: null,
  isPawnPromotion: false
};

const DIGITS_REGEX = /^\d+$/;

const FEN_CASTLING_REGEX = /^[kq]+$/i;
const FEN_CHECKS_COUNT_REGEX = /^\+([0-3])\+([0-3])$/i;

const PGN_TAG_REGEX = /^\[([a-z0-9]+) +"((?:[^"\\]|\\"|\\\\)*)"]$/i;
const PGN_MOVE_REGEX = /^\S+(?=\s|$)/;
const PGN_MOVE_SQUARES_REGEX = /^(?:([A-Z]?)(@?)([₀-₉]*)([a-w]*)(\d*)x?([₀-₉]*)([a-w])(\d+))|O-O(-O)?/;
const PGN_PROMOTION_REGEX = /^=([A-Z])/;
const PGN_SQUARE_REGEX = /^[a-w]\d+$/;

const RESULT_WIN_WHITE = '1-0';
const RESULT_WIN_BLACK = '0-1';
const RESULT_DRAW = '1/2-1/2';

export class Game implements IGame {
  static validateVariants(variants: ReadonlyArray<GameVariantEnum>): boolean {
    const isCrazyhouse = _.includes(variants, GameVariantEnum.CRAZYHOUSE);
    const is960 = _.includes(variants, GameVariantEnum.CHESS_960);
    const isKingOfTheHill = _.includes(variants, GameVariantEnum.KING_OF_THE_HILL);
    const isAtomic = _.includes(variants, GameVariantEnum.ATOMIC);
    const isCirce = _.includes(variants, GameVariantEnum.CIRCE);
    const isPatrol = _.includes(variants, GameVariantEnum.PATROL);
    const isMadrasi = _.includes(variants, GameVariantEnum.MADRASI);
    const isMonsterChess = _.includes(variants, GameVariantEnum.MONSTER_CHESS);
    const isAliceChess = _.includes(variants, GameVariantEnum.ALICE_CHESS);
    const isTwoFamilies = _.includes(variants, GameVariantEnum.TWO_FAMILIES);
    const isHorde = _.includes(variants, GameVariantEnum.HORDE);
    const isDarkChess = _.includes(variants, GameVariantEnum.DARK_CHESS);
    const isAntichess = _.includes(variants, GameVariantEnum.ANTICHESS);
    const isAbsorption = _.includes(variants, GameVariantEnum.ABSORPTION);
    const isFrankfurt = _.includes(variants, GameVariantEnum.FRANKFURT);
    const isCapablanca = _.includes(variants, GameVariantEnum.CAPABLANCA);
    const isAmazons = _.includes(variants, GameVariantEnum.AMAZONS);
    const isThreeCheck = _.includes(variants, GameVariantEnum.THREE_CHECK);
    const isCylinderChess = _.includes(variants, GameVariantEnum.CYLINDER_CHESS);
    const isCircularChess = _.includes(variants, GameVariantEnum.CIRCULAR_CHESS);
    const isHexagonalChess = _.includes(variants, GameVariantEnum.HEXAGONAL_CHESS);

    return ((
      !isKingOfTheHill
      || isAntichess
      || !isDarkChess
    ) && (
      !isAtomic
      || !isAliceChess
      || isCircularChess
    ) && (
      !isMonsterChess
      || (
        !isCrazyhouse
        && !isKingOfTheHill
        && !isAtomic
        && !isCirce
        && !isPatrol
        && !isMadrasi
        && !isAliceChess
        && !isHorde
        && !isDarkChess
        && !isAntichess
        && !isAbsorption
        && !isFrankfurt
        && !isCapablanca
        && !isAmazons
        && !isThreeCheck
        && !isCircularChess
        && !isHexagonalChess
      )
    ) && (
      !isHorde
      || (
        !isKingOfTheHill
        && !isCirce
        && !isPatrol
        && !isMadrasi
        && !isAliceChess
        && !isAtomic
        && !isCrazyhouse
        && !isDarkChess
        && !isAntichess
        && !isAbsorption
        && !isFrankfurt
        && !isAmazons
        && !isThreeCheck
        // TODO: add support for horde + hex
        && !isHexagonalChess
      )
    ) && (
      !isAtomic
      || (
        !isDarkChess
        && !isAmazons
        // TODO: add support for hex + atomic
        && !isHexagonalChess
      )
    ) && (
      !isAntichess
      || (
        !isCrazyhouse
        && !isCirce
        && !isPatrol
        && !isMadrasi
        && !isAmazons
        && !isThreeCheck
      )
    ) && (
      !isAbsorption
      || (
        !isCrazyhouse
        && !isAtomic
        && !isCirce
        && !isMadrasi
        && !isFrankfurt
        && !isAmazons
      )
    ) && (
      !isFrankfurt
      || (
        // TODO: add support for frankfurt + crazyhouse
        !isCrazyhouse
        && !isAtomic
        && !isAmazons
      )
    ) && (
      !isTwoFamilies
      || (
        !isCapablanca
        && !isAmazons
      )
    ) && (
      !isAmazons
      || (
        !isCapablanca
        && !isKingOfTheHill
        && !isThreeCheck
        && !isCirce
        && !isCrazyhouse
        && !isPatrol
        && !isMadrasi
        && !isAliceChess
        && !isHexagonalChess
      )
    ) && (
      !isThreeCheck
      || (
        !isDarkChess
        && !isAtomic
      )
    ) && (
      !isCircularChess
      || (
        !isCylinderChess
        // TODO: add support for circular + circe
        && !isCirce
        && !isKingOfTheHill
        && !isHexagonalChess
      )
    ) && (
      !isHexagonalChess
      || (
        // TODO: add support for hex + 960
        !is960
        // TODO: add support for hex + crazyhouse (pawns)
        && !isCrazyhouse
        && !isCylinderChess
        // TODO: add support for hex + koth
        && !isKingOfTheHill
        // TODO: add support for hex + two families
        && !isTwoFamilies
        // TODO: add support for hex + capablanca
        && !isCapablanca
        && !isCirce
        // TODO: add support for hex + frankfurt (promotion when capturing pawn)
        && !isFrankfurt
      )
    ));
  }

  static getBoardDimensions(variants: ReadonlyArray<GameVariantEnum>): BoardDimensions {
    const isAliceChess = _.includes(variants, GameVariantEnum.ALICE_CHESS);
    const isTwoFamilies = _.includes(variants, GameVariantEnum.TWO_FAMILIES);
    const isCapablanca = _.includes(variants, GameVariantEnum.CAPABLANCA);
    const isAmazons = _.includes(variants, GameVariantEnum.AMAZONS);
    const isCircularChess = _.includes(variants, GameVariantEnum.CIRCULAR_CHESS);
    const isHexagonalChess = _.includes(variants, GameVariantEnum.HEXAGONAL_CHESS);
    const dimensions = {
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
      pieces,
      emptySquares: HEXAGONAL_EMPTY_SQUARES
    };
  }

  static generateClassicStartingData(boardDimensions: BoardDimensions, variants: ReadonlyArray<GameVariantEnum>): StartingData {
    const {
      boardWidth,
      boardHeight
    } = boardDimensions;
    const isHorde = _.includes(variants, GameVariantEnum.HORDE);
    const isTwoFamilies = _.includes(variants, GameVariantEnum.TWO_FAMILIES);
    const isCapablanca = _.includes(variants, GameVariantEnum.CAPABLANCA);
    const isAmazons = _.includes(variants, GameVariantEnum.AMAZONS);
    const isCircularChess = _.includes(variants, GameVariantEnum.CIRCULAR_CHESS);
    const orthodoxBoardWidth = isCircularChess
      ? boardWidth * 2
      : boardWidth;
    const orthodoxBoardHeight = isCircularChess
      ? boardHeight / 2
      : boardHeight;
    const halfBoard = Math.round(orthodoxBoardWidth / 2);
    let id = 0;
    let pieceTypes: ReadonlyArray<PieceTypeEnum>;

    if (_.includes(variants, GameVariantEnum.CHESS_960)) {
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
      } else if (isCapablanca || isAmazons) {
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

      pieceTypes = randomPieceTypes as ReadonlyArray<PieceTypeEnum>;
    } else if (isTwoFamilies) {
      pieceTypes = TWO_FAMILIES_PIECE_PLACEMENT;
    } else if (isCapablanca || isAmazons) {
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
      } else if (isAmazons && color === ColorEnum.WHITE) {
        addPiece(PieceTypeEnum.AMAZON, halfBoard - 1, 0);
        addPiece(PieceTypeEnum.AMAZON, halfBoard, 0);
        addPiece(PieceTypeEnum.AMAZON, halfBoard + 1, 0);
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
        if (Game.isBoardPiece(piece) && piece.location.x >= boardWidth) {
          piece.location.x = orthodoxBoardWidth - 1 - piece.location.x;
          piece.location.y = boardHeight - 1 - piece.location.y;
        }
      });
    }

    return {
      ...STANDARD_STARTING_DATA,
      pieces
    };
  }

  static getStartingData(variants: ReadonlyArray<GameVariantEnum>): StartingData {
    const isMonsterChess = _.includes(variants, GameVariantEnum.MONSTER_CHESS);
    const isAliceChess = _.includes(variants, GameVariantEnum.ALICE_CHESS);
    const isAntichess = _.includes(variants, GameVariantEnum.ANTICHESS);
    const isCylinderChess = _.includes(variants, GameVariantEnum.CYLINDER_CHESS);
    const isCircularChess = _.includes(variants, GameVariantEnum.CIRCULAR_CHESS);
    const isHexagonalChess = _.includes(variants, GameVariantEnum.HEXAGONAL_CHESS);
    const boardDimensions = Game.getBoardDimensions(variants);
    const startingData = isHexagonalChess
      ? Game.generateHexagonalStartingData()
      : Game.generateClassicStartingData(boardDimensions, variants);

    let pieces = [...startingData.pieces];

    if (isMonsterChess) {
      const halfWidth = Math.round(boardDimensions.boardWidth / 2);
      const left = Math.ceil(halfWidth / 2);
      const right = boardDimensions.boardWidth - Math.floor(halfWidth / 2);

      pieces = [...pieces];

      for (let i = pieces.length - 1; i >= 0; i--) {
        const piece = pieces[i];

        if (
          piece
          && piece.color === ColorEnum.WHITE
          && piece.location.type === PieceLocationEnum.BOARD
          && !Game.isKing(piece)
          && (
            !Game.isPawn(piece)
            || piece.location.x < left
            || piece.location.x >= right
          )
        ) {
          pieces.splice(i, 1);
        }
      }
    }

    if (isAliceChess) {
      startingData.emptySquares = [
        ...startingData.emptySquares,
        ...startingData.emptySquares.map((square) => ({ ...square, board: 1 }))
      ];
    }

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

    startingData.pieces = pieces;

    return startingData;
  }

  static getStartingDataFromFen(fen: string, variants: ReadonlyArray<GameVariantEnum>): StartingData {
    const {
      boardCount,
      boardWidth,
      boardHeight
    } = Game.getBoardDimensions(variants);
    const startingData: StartingData = {
      possibleCastling: {
        [ColorEnum.WHITE]: {
          [CastlingTypeEnum.KING_SIDE]: false,
          [CastlingTypeEnum.QUEEN_SIDE]: false
        },
        [ColorEnum.BLACK]: {
          [CastlingTypeEnum.KING_SIDE]: false,
          [CastlingTypeEnum.QUEEN_SIDE]: false
        }
      },
      possibleEnPassant: null,
      checksCount: {
        [ColorEnum.WHITE]: 0,
        [ColorEnum.BLACK]: 0
      },
      result: null,
      turn: ColorEnum.WHITE,
      startingMoveIndex: 0,
      pliesWithoutCaptureOrPawnMove: 0,
      pieces: [],
      emptySquares: []
    };
    const isPocketUsed = Game.getIsPocketUsed(variants);
    const isMonsterChess = _.includes(variants, GameVariantEnum.MONSTER_CHESS);
    const isAntichess = _.includes(variants, GameVariantEnum.ANTICHESS);
    const isThreeCheck = _.includes(variants, GameVariantEnum.THREE_CHECK);
    const isCylinderChess = _.includes(variants, GameVariantEnum.CYLINDER_CHESS);
    const isDarkChess = _.includes(variants, GameVariantEnum.DARK_CHESS);
    const isHexagonalChess = _.includes(variants, GameVariantEnum.HEXAGONAL_CHESS);
    const fenData = fen.trim().split(/\s+/);
    const boards = fenData.slice(0, boardCount);

    // 5 is turn, possible castling, possible en passant, pliesWithoutCaptureOrPawnMove, startingMoveIndex
    // 1 for checks count in three-check
    if (fenData.length !== boardCount + 5 + (isThreeCheck ? 1 : 0)) {
      throw new Error('Invalid FEN: wrong text blocks count');
    }

    const [
      turnString,
      possibleCastlingString,
      possibleEnPassantString,
      pliesWithoutCaptureOrPawnMoveString,
      startingMoveIndexString,
      checksCount
    ] = fenData.slice(boardCount);
    const possibleTurnValues = isMonsterChess
      ? ['w1', 'w2', 'b']
      : ['w', 'b'];

    if (!_.includes(possibleTurnValues, turnString)) {
      throw new Error('Invalid FEN: wrong turn');
    }

    startingData.turn = turnString === 'b' ? ColorEnum.BLACK : ColorEnum.WHITE;

    if (possibleCastlingString !== '-' && !FEN_CASTLING_REGEX.test(possibleCastlingString)) {
      throw new Error('Invalid FEN: wrong castling block');
    }

    if (possibleCastlingString !== '-' && !isAntichess && !isCylinderChess) {
      startingData.possibleCastling[ColorEnum.WHITE][CastlingTypeEnum.KING_SIDE] = _.includes(possibleCastlingString, 'K');
      startingData.possibleCastling[ColorEnum.WHITE][CastlingTypeEnum.QUEEN_SIDE] = _.includes(possibleCastlingString, 'Q');
      startingData.possibleCastling[ColorEnum.BLACK][CastlingTypeEnum.KING_SIDE] = _.includes(possibleCastlingString, 'k');
      startingData.possibleCastling[ColorEnum.BLACK][CastlingTypeEnum.QUEEN_SIDE] = _.includes(possibleCastlingString, 'q');
    }

    if (possibleEnPassantString !== '-') {
      if (
        isDarkChess
        || (isMonsterChess && turnString === 'w2')
      ) {
        throw new Error('Invalid FEN: wrong en passant');
      }

      const enPassantSquareMatch = possibleEnPassantString.match(PGN_SQUARE_REGEX);

      if (!enPassantSquareMatch) {
        throw new Error('Invalid FEN: wrong en passant');
      }

      const file = Game.getFileNumber(enPassantSquareMatch[1]);
      const rank = Game.getFileNumber(enPassantSquareMatch[2]);

      if (
        !(file >= 0)
        || !(file < boardWidth)
        || (
          rank !== 2
          && rank !== boardHeight - 3
        )
      ) {
        throw new Error('Invalid FEN: wrong en passant');
      }

      startingData.possibleEnPassant = {
        enPassantSquare: {
          board: 0,
          x: file,
          y: rank
        },
        pieceLocation: {
          board: 0,
          x: file,
          y: startingData.turn === ColorEnum.WHITE ? boardHeight - 4 : 3
        }
      };
    }

    if (!DIGITS_REGEX.test(pliesWithoutCaptureOrPawnMoveString)) {
      throw new Error('Invalid FEN: wrong plies without capture or pawn move count');
    }

    startingData.pliesWithoutCaptureOrPawnMove = +pliesWithoutCaptureOrPawnMoveString;

    if (startingMoveIndexString === '0' || !DIGITS_REGEX.test(startingMoveIndexString)) {
      throw new Error('Invalid FEN: wrong starting move index');
    }

    const startingMoveIndexNumber = +startingMoveIndexString - 1;

    startingData.startingMoveIndex = isMonsterChess
      ? 3 * startingMoveIndexNumber + (turnString === 'b' ? 2 : turnString === 'w2' ? 1 : 0)
      : 2 * startingMoveIndexNumber + (turnString === 'b' ? 1 : 0);

    let id = 0;
    const pieces: RealPiece[] = [];
    const addPiece = (color: ColorEnum, type: PieceTypeEnum, location: RealPieceLocation) => {
      pieces.push({
        id: `${++id}`,
        type,
        originalType: type,
        color,
        moved: false,
        abilities: null,
        location
      } as RealPiece);
    };

    for (let board = 0; board < boards.length; board++) {
      const ranks = boards[board].split('/').reverse();
      const ranksCount = isPocketUsed && board === 0 ? boardHeight + 1 : boardHeight;

      if (ranks.length !== ranksCount) {
        throw new Error(`Invalid FEN: wrong ranks blocks count on board ${board}`);
      }

      for (let rank = ranksCount - boardHeight; rank < ranks.length; rank++) {
        const fileData = ranks[rank];
        let file = isHexagonalChess && rank > 5 ? rank - 5 : 0;
        let string = fileData;

        // TODO: fix piece parsing for absorption/frankfurt

        while (string) {
          const emptySquaresMatch = string.match(/^\d+/);

          if (emptySquaresMatch) {
            file += +emptySquaresMatch[0];
            string = string.slice(emptySquaresMatch[0].length);
          } else {
            const character = string[0];
            const piece = Game.getPieceFromLiteral(character);

            if (!piece) {
              throw new Error(`Invalid FEN: wrong piece literal (${character})`);
            }

            addPiece(
              piece.color,
              piece.type,
              {
                type: PieceLocationEnum.BOARD,
                board,
                x: file,
                y: rank
              }
            );

            file += 1;
            string = string.slice(1);
          }
        }

        if (file !== (isHexagonalChess && rank > 5 ? boardWidth - (rank - 5) : boardWidth)) {
          throw new Error('Invalid FEN: wrong files count in a rank');
        }
      }

      if (ranksCount !== boardHeight) {
        const pocket = ranks[0];

        for (let pieceIndex = 0; pieceIndex < pocket.length; pieceIndex++) {
          const piece = Game.getPieceFromLiteral(pocket[pieceIndex]);

          if (!piece) {
            throw new Error(`Invalid FEN: wrong pocket piece literal (${pocket[pieceIndex]})`);
          }

          addPiece(
            piece.color,
            piece.type,
            {
              type: PieceLocationEnum.POCKET,
              pieceType: piece.type,
              color: piece.color
            }
          );
        }
      }
    }

    if (startingData.possibleEnPassant) {
      const { x, y } = startingData.possibleEnPassant.pieceLocation;
      const enPassantPiece = _.find(pieces, (piece) => (
        Game.isPawn(piece)
        && piece.location.type === PieceLocationEnum.BOARD
        && piece.location.x === x
        && piece.location.y === y
      )) as BoardPiece | undefined;

      if (!enPassantPiece) {
        throw new Error('Invalid FEN: wrong en passant');
      }

      startingData.possibleEnPassant.enPassantSquare.board = (enPassantPiece.location.board + boardCount - 1) % boardCount;
      startingData.possibleEnPassant.pieceLocation.board = enPassantPiece.location.board;
    }

    if (isThreeCheck) {
      const checksCountMatch = checksCount.match(FEN_CHECKS_COUNT_REGEX);

      if (!checksCountMatch) {
        throw new Error('Invalid FEN: wrong checks count');
      }

      startingData.checksCount[ColorEnum.WHITE] = +checksCountMatch[1];
      startingData.checksCount[ColorEnum.BLACK] = +checksCountMatch[2];
    }

    startingData.pieces = pieces;

    return startingData;
  }

  static getGameFromPgn(pgn: string): Game {
    const pgnData = pgn
      .split('\n')
      .map((string) => string.trim())
      .filter(Boolean);
    const variants: GameVariantEnum[] = [];
    const pgnTags: PGNTags = {};
    let timeControl: TimeControl = null;
    let startingData: StartingData;
    let fen = '';
    let i = 0;

    for (; i < pgnData.length; i++) {
      const tag = pgnData[i];
      const match = tag.match(PGN_TAG_REGEX);

      if (!match) {
        break;
      }

      const [, tagName, tagValue] = match;
      const trueTagValue = tagValue
        .replace(/\\"/g, '"')
        .replace(/\\\\/, '\\');

      if (tagName === 'Variant') {
        if (trueTagValue !== 'Standard') {
          trueTagValue.split(/\s*\+\s*/).forEach((variantString) => {
            const variant = _.findKey(GAME_VARIANT_PGN_NAMES, (name) => name === variantString) as GameVariantEnum | undefined;

            if (!variant) {
              throw new Error(`Invalid PGN: invalid variant (${variantString})`);
            }

            variants.push(variant);
          });

          if (!Game.validateVariants(variants)) {
            throw new Error('Invalid PGN: invalid variants combination');
          }
        }
      } else if (tagName === 'TimeControl') {
        if (trueTagValue !== '-') {
          const values = trueTagValue.split(/\s*\+\s*/);
          const baseString = values[0];
          const base = +(+baseString * 1000).toFixed(2);

          if (
            (
              values.length !== 1
              && values.length !== 2
            )
            || baseString === '0'
            || !DIGITS_REGEX.test(baseString)
          ) {
            throw new Error(`Invalid PGN: invalid time control base (${baseString})`);
          }

          if (values.length === 1) {
            timeControl = {
              type: TimeControlEnum.CORRESPONDENCE,
              base
            };
          } else {
            const incrementString = values[1];

            if (!DIGITS_REGEX.test(incrementString)) {
              throw new Error(`Invalid PGN: invalid time control increment (${incrementString})`);
            }

            const increment = +(+incrementString * 1000).toFixed(2);

            timeControl = {
              type: TimeControlEnum.TIMER,
              base,
              increment
            };
          }
        }
      } else if (tagName === 'FEN') {
        fen = trueTagValue;
      }

      pgnTags[tagName] = trueTagValue;
    }

    if (fen) {
      startingData = Game.getStartingDataFromFen(fen, variants);
    } else {
      startingData = Game.getStartingData(variants);
    }

    const resultString = 'Result' in pgnTags
      ? pgnTags.Result
      : null;
    let result: GameResult | null = null;

    if (
      resultString === RESULT_WIN_WHITE
      || resultString === RESULT_WIN_BLACK
      || resultString === RESULT_DRAW
    ) {
      if (resultString === RESULT_WIN_WHITE || resultString === RESULT_WIN_BLACK) {
        result = {
          winner: resultString === RESULT_WIN_WHITE
            ? ColorEnum.WHITE
            : ColorEnum.BLACK,
          reason: ResultReasonEnum.RESIGN
        };
      } else {
        result = {
          winner: null,
          reason: ResultReasonEnum.AGREED_TO_DRAW
        };
      }

      if ('Termination' in pgnTags && pgnTags.Termination !== 'Normal') {
        result.reason = pgnTags.Termination as any;
      }
    }

    startingData.result = result;

    const game = new Game({
      id: '',
      startingData,
      variants,
      timeControl,
      pgnTags
    });

    if (!game.isLeftInCheckAllowed && game.isInCheck(game.getPrevTurn())) {
      throw new Error('Invalid FEN: the king is in check');
    }

    if (i < pgnData.length) {
      let movesString = pgnData
        .slice(i)
        .map((string) => string.replace(/;[\s\S]*$/, ''))
        .filter(Boolean)
        .join(' ');
      let shouldBeMoveIndex = true;
      let wasMoveIndex = false;

      while (movesString) {
        const whitespace = movesString.match(/^\s+/);

        // whitespace
        if (whitespace) {
          movesString = movesString.slice(whitespace.length);

          continue;
        }

        const isUsualComment = movesString.indexOf('{') === 0;
        const isMovesComment = movesString.indexOf('(') === 0;

        // comment
        if (isUsualComment || isMovesComment) {
          const commentEnd = movesString.indexOf(isUsualComment ? '}' : ')');

          if (commentEnd === -1) {
            throw new Error('Invalid PGN: unterminated comment');
          }

          movesString = movesString.slice(commentEnd + 1);
          shouldBeMoveIndex = true;

          continue;
        }

        // game result
        if (movesString === resultString) {
          break;
        }

        // move index including dots
        if (shouldBeMoveIndex) {
          const moveIndex = Math.floor(game.movesCount / game.pliesPerMove) + 1;
          const moveIndexString = (startingData.startingMoveIndex && !wasMoveIndex) || game.movesCount % game.pliesPerMove !== 0
            ? `${moveIndex}...`
            : `${moveIndex}.`;

          if (movesString.indexOf(moveIndexString) !== 0) {
            throw new Error('Invalid PGN: wrong move index');
          }

          movesString = movesString.slice(moveIndexString.length);
          shouldBeMoveIndex = false;
          wasMoveIndex = true;

          continue;
        }

        // move
        const moveMatch = movesString.match(PGN_MOVE_REGEX);

        if (!moveMatch) {
          throw new Error('Invalid PGN: wrong move string');
        }

        const moveString = moveMatch[0];
        const moveSquaresMatch = moveString.match(PGN_MOVE_SQUARES_REGEX);

        if (!moveSquaresMatch) {
          throw new Error('Invalid PGN: wrong move string');
        }

        const [
          moveSquares,
          pieceLiteral,
          drop,
          fromBoardLiteral = '',
          fromFileLiteral = '',
          fromRankLiteral = '',
          toBoardLiteral,
          toFileLiteral,
          toRankLiteral,
          queenSideCastling
        ] = moveSquaresMatch;
        const isDrop = !!drop;
        const isCastling = _.includes(moveSquares, 'O-O');
        const isQueenSideCastling = !!queenSideCastling;
        // TODO: fix piece parsing for absorption/frankfurt
        const pieceFromLiteral = Game.getPieceFromLiteral(isCastling ? 'K' : pieceLiteral || 'P');

        if (!pieceFromLiteral) {
          throw new Error(`Invalid PGN: wrong piece name (${pieceLiteral})`);
        }

        const pieceType = pieceFromLiteral.type;
        const fromBoard = Game.getBoardNumber(fromBoardLiteral);
        const fromFile = Game.getFileNumber(fromFileLiteral);
        const fromRank = Game.getRankNumber(fromRankLiteral);
        let toBoard: number;
        let toFile: number;
        let toRank: number;

        if (isCastling) {
          const kings = game.kings[game.turn];
          const king = isQueenSideCastling ? kings[0] : _.last(kings);

          if (!king || !king.location || king.location.type !== PieceLocationEnum.BOARD) {
            throw new Error('Invalid PGN: wrong castling move');
          }

          const castlingRooks = game.getCastlingRooks(game.turn);
          const castlingRook = castlingRooks[isQueenSideCastling ? CastlingTypeEnum.QUEEN_SIDE : CastlingTypeEnum.KING_SIDE];

          if (!castlingRook) {
            throw new Error('Invalid PGN: wrong castling move');
          }

          toBoard = king.location.board;
          toFile = game.is960
            ? castlingRook.location.x
            : isQueenSideCastling
              ? 2
              : game.boardWidth - 2;
          toRank = king.location.y;
        } else {
          toBoard = Game.getBoardNumber(toBoardLiteral);
          toFile = Game.getFileNumber(toFileLiteral);
          toRank = Game.getRankNumber(toRankLiteral);
        }

        const getToSquare = (piece: RealPiece): Square => ({
          board: piece.location.type === PieceLocationEnum.POCKET
            ? game.isAliceChess
              ? toBoard
              : 0
            : piece.location.board,
          x: toFile,
          y: toRank
        });
        const pieces = game.getPieces(game.turn)
          .filter(Game.isRealPiece)
          .filter((piece) => {
            const toSquare = getToSquare(piece);

            return (
              piece.type === pieceType
              && ((
                isDrop
                && piece.location.type === PieceLocationEnum.POCKET
              ) || (
                piece.location.type === PieceLocationEnum.BOARD
                && (!fromBoardLiteral || piece.location.board === fromBoard)
                && (!fromFileLiteral || piece.location.x === fromFile)
                && (!fromRankLiteral || piece.location.x === fromRank)
              ))
              && game.getAllowedMoves(piece).some(({ square }) => Game.areSquaresEqual(square, toSquare))
            );
          });

        if (isDrop && !pieces.length) {
          throw new Error('Invalid PGN: no pieces to drop');
        }

        if (!isDrop && pieces.length !== 1) {
          throw pieces.length
            ? new Error('Invalid PGN: ambiguous move')
            : new Error('Invalid PGN: no pieces to move');
        }

        const piece = pieces[0];
        const toSquare = getToSquare(piece);
        const move: Move = {
          from: piece.location,
          to: toSquare,
          duration: 0
        };
        const isPawnPromotion = game.getAllowedMoves(piece).some(({ isPawnPromotion }) => isPawnPromotion);

        if (isPawnPromotion) {
          const promotionMatch = moveString.slice(moveSquares.length).match(PGN_PROMOTION_REGEX);

          if (!promotionMatch) {
            throw new Error('Invalid PGN: wrong promotion');
          }

          const promotedPiece = Game.getPieceFromLiteral(promotionMatch[1]);

          if (!promotedPiece || !_.includes(game.validPromotions, promotedPiece.type)) {
            throw new Error(`Invalid PGN: wrong promotion piece (${promotionMatch[1]})`);
          }

          move.promotion = promotedPiece.type;
        }

        game.registerMove(move);

        movesString = movesString.slice(moveString.length);
        shouldBeMoveIndex = game.movesCount % game.pliesPerMove === 0;
      }
    }

    return game;
  }

  static validateStartingData(startingData: StartingData, variants: ReadonlyArray<GameVariantEnum>): void {
    const isTwoFamilies = _.includes(variants, GameVariantEnum.TWO_FAMILIES);
    const isAliceChess = _.includes(variants, GameVariantEnum.ALICE_CHESS);
    const isHorde = _.includes(variants, GameVariantEnum.HORDE);
    const isAntichess = _.includes(variants, GameVariantEnum.ANTICHESS);
    const isHexagonalChess = _.includes(variants, GameVariantEnum.HEXAGONAL_CHESS);
    const middleFile = 5;

    if (isAliceChess) {
      // pieces on the same square
      startingData.pieces.forEach(({ location }) => {
        if (
          location.type === PieceLocationEnum.BOARD
          && startingData.pieces.some(({ location: pieceLocation }) => (
            pieceLocation.type === PieceLocationEnum.BOARD
            && location.x === pieceLocation.x
            && location.y === pieceLocation.y
            && location.board !== pieceLocation.board
          ))
        ) {
          throw new Error(`Invalid FEN: multiple pieces on the same square (${Game.getFileLiteral(location.x) + Game.getRankLiteral(location.y)})`);
        }
      });
    }

    const whiteKingsNumber = startingData.pieces.filter((piece) => (
      piece.color === ColorEnum.WHITE
      && Game.isKing(piece)
    )).length;
    const blackKingsNumber = startingData.pieces.filter((piece) => (
      piece.color === ColorEnum.BLACK
      && Game.isKing(piece)
    )).length;

    // wrong number of kings on the board
    if (
      !isAntichess && (
        whiteKingsNumber !== (isHorde ? 0 : isTwoFamilies ? 2 : 1)
        || blackKingsNumber !== (isTwoFamilies ? 2 : 1)
      )
    ) {
      throw new Error('Invalid FEN: wrong number of kings');
    }

    const {
      boardHeight
    } = Game.getBoardDimensions(variants);

    // not promoted pawns
    startingData.pieces.forEach((piece) => {
      if (
        Game.isBoardPiece(piece)
        && Game.isPawn(piece)
      ) {
        if (
          piece.location.y === (
            piece.color === ColorEnum.WHITE
              ? isHexagonalChess
                ? boardHeight - 1 - Math.abs(piece.location.x - middleFile)
                : boardHeight - 1
              : 0
          )
        ) {
          throw new Error(`Invalid FEN: not promoted pawn (${Game.getFileLiteral(piece.location.x) + Game.getRankLiteral(piece.location.y)})`);
        }

        if (isHexagonalChess) {
          if (
            piece.color === ColorEnum.WHITE
              ? piece.location.y < middleFile - 1 - Math.abs(piece.location.x - middleFile)
              : piece.location.y > 6
          ) {
            throw new Error(`Invalid FEN: pawn behind the initial pawn structure (${Game.getFileLiteral(piece.location.x) + Game.getRankLiteral(piece.location.y)})`);
          }
        } else if (
          piece.location.y === (
            piece.color === ColorEnum.WHITE
              ? isHorde ? Infinity : 0
              : boardHeight - 1
          )
        ) {
          throw new Error(`Invalid FEN: pawn on the pieces rank (${Game.getFileLiteral(piece.location.x) + Game.getRankLiteral(piece.location.y)})`);
        }
      }
    });

    // king may be captured
    const game = new Game({
      timeControl: null,
      id: '',
      startingData,
      variants
    });

    if (game.isInCheck(game.getPrevTurn())) {
      throw new Error('Invalid FEN: king may be captured');
    }

    if (game.isNoMoves()) {
      throw new Error('Invalid FEN: no legal moves');
    }

    const opponentColor = Game.getOppositeColor(game.turn);

    if (!game.getPieces(opponentColor).length) {
      throw new Error(`Invalid FEN: no pieces (${COLOR_NAMES[opponentColor]})`);
    }
  }

  static generateGameDataFromStartingData(startingData: StartingData): BoardData {
    const kings: GameKings = {
      [ColorEnum.WHITE]: [],
      [ColorEnum.BLACK]: []
    };
    const pieces: Piece[] = startingData.pieces.map((piece) => {
      piece = { ...piece };

      if (Game.isKing(piece)) {
        kings[piece.color].push(piece);
      }

      return piece;
    });

    _.forEach(kings, (kings) => {
      kings.forEach((king) => {
        pieces.splice(pieces.indexOf(king), 1);
        pieces.unshift(king);
      });
    });

    return {
      kings,
      pieces
    };
  }

  static generateUid(map: { [id: string]: any; }): string {
    let id: string;

    do {
      id = _.times(10, () => String.fromCharCode(97 + Math.floor(Math.random() * 26))).join('');
    } while (map[id]);

    return id;
  }

  static getIsPocketUsed(variants: ReadonlyArray<GameVariantEnum>): boolean {
    return _.includes(variants, GameVariantEnum.CRAZYHOUSE);
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

  static getPieceFromLiteral(pieceLiteral: string): { color: ColorEnum; type: PieceTypeEnum } | undefined {
    const pieceName = pieceLiteral.toUpperCase();
    const color = pieceName === pieceLiteral ? ColorEnum.WHITE : ColorEnum.BLACK;
    const pieceType = _.findKey(SHORT_PIECE_NAMES, (shortPieceName) => shortPieceName === pieceName) as PieceTypeEnum | undefined;

    return pieceType && {
      color,
      type: pieceType
    };
  }

  static getPieceFigurineLiteral(pieceType: PieceTypeEnum, color: ColorEnum): string {
    const pieceLiterals = PIECE_LITERALS[color];

    if (_.includes(STANDARD_PIECES, pieceType)) {
      return pieceLiterals[pieceType as StandardPiece];
    }

    if (pieceType === PieceTypeEnum.AMAZON) {
      return pieceLiterals[PieceTypeEnum.QUEEN] + pieceLiterals[PieceTypeEnum.KNIGHT];
    }

    if (pieceType === PieceTypeEnum.EMPRESS) {
      return pieceLiterals[PieceTypeEnum.ROOK] + pieceLiterals[PieceTypeEnum.KNIGHT];
    }

    if (pieceType === PieceTypeEnum.CARDINAL) {
      return pieceLiterals[PieceTypeEnum.BISHOP] + pieceLiterals[PieceTypeEnum.KNIGHT];
    }

    return '';
  }

  static getPieceFullFigurineLiteral(piece: Piece): string {
    const pieceLiteral = Game.getPieceFigurineLiteral(piece.type, piece.color);

    return piece.abilities
      ? pieceLiteral + Game.getPieceFigurineLiteral(piece.abilities, piece.color)
      : pieceLiteral;
  }

  static getPieceAlgebraicLiteral(pieceType: PieceTypeEnum): string {
    return SHORT_PIECE_NAMES[pieceType];
  }

  static getPieceFullAlgebraicLiteral(piece: Piece): string {
    const pieceLiteral = Game.getPieceAlgebraicLiteral(piece.type);

    return piece.abilities
      ? `${pieceLiteral}(${Game.getPieceAlgebraicLiteral(piece.abilities)})`
      : pieceLiteral;
  }

  static getOppositeColor(color: ColorEnum): ColorEnum {
    return color === ColorEnum.WHITE
      ? ColorEnum.BLACK
      : ColorEnum.WHITE;
  }

  static getPieceTypeAfterAbsorption(originalPiece: Piece, absorbedPiece: Piece): Pick<Piece, 'type' | 'abilities'> {
    if (Game.isKing(originalPiece)) {
      if (Game.isKing(absorbedPiece)) {
        if (originalPiece.abilities && absorbedPiece.abilities) {
          return Game.getPieceTypeAfterAbsorption(originalPiece, {
            ...absorbedPiece,
            type: absorbedPiece.abilities
          });
        }

        return {
          type: PieceTypeEnum.KING,
          abilities: originalPiece.abilities || absorbedPiece.abilities
        };
      }

      if (originalPiece.abilities) {
        return {
          type: PieceTypeEnum.KING,
          abilities: Game.getPieceTypeAfterAbsorption({
            ...originalPiece,
            type: originalPiece.abilities
          }, absorbedPiece).type
        };
      }

      return {
        type: PieceTypeEnum.KING,
        abilities: absorbedPiece.type
      };
    }

    if (Game.isKing(absorbedPiece)) {
      return Game.getPieceTypeAfterAbsorption(absorbedPiece, originalPiece);
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
      Game.isKnight(minorPiece)
      && (
        Game.isQueen(majorPiece)
        || Game.isRook(majorPiece)
        || Game.isBishop(majorPiece)
      )
    ) {
      newPieceType = Game.isQueen(majorPiece)
        ? PieceTypeEnum.AMAZON
        : Game.isRook(majorPiece)
          ? PieceTypeEnum.EMPRESS
          : PieceTypeEnum.CARDINAL;
    } else if (
      Game.isBishop(minorPiece)
      && (
        Game.isEmpress(majorPiece)
        || Game.isRook(majorPiece)
      )
    ) {
      newPieceType = Game.isEmpress(majorPiece)
        ? PieceTypeEnum.AMAZON
        : PieceTypeEnum.QUEEN;
    } else if ((
      Game.isRook(minorPiece)
      && Game.isCardinal(majorPiece)
    ) || (
      Game.isCardinal(minorPiece)
      && (
        Game.isQueen(majorPiece)
        || Game.isEmpress(majorPiece)
      )
    ) || (
      Game.isEmpress(minorPiece)
      && Game.isQueen(majorPiece)
    )) {
      newPieceType = PieceTypeEnum.AMAZON;
    }

    return {
      type: newPieceType,
      abilities: null
    };
  }

  static isBoardPiece(piece: Piece): piece is BoardPiece {
    return Game.isRealPiece(piece) && piece.location.type === PieceLocationEnum.BOARD;
  }

  static isPocketPiece(piece: Piece): piece is PocketPiece {
    return Game.isRealPiece(piece) && piece.location.type === PieceLocationEnum.POCKET;
  }

  static isNonExistentPiece(piece: Piece): piece is NonExistentPiece {
    return !piece.location;
  }

  static isRealPiece(piece: Piece): piece is RealPiece {
    return !!piece.location;
  }

  static areSquaresEqual(square1: Square, square2: Square): boolean {
    return (
      square1.board === square2.board
      && square1.y === square2.y
      && square1.x === square2.x
    );
  }

  static isPiece(piece: Piece, type: PieceTypeEnum): boolean {
    return (
      piece.type === type
      || piece.abilities === type
    );
  }

  static isKing = (piece: Piece): boolean => Game.isPiece(piece, PieceTypeEnum.KING);
  static isAmazon = (piece: Piece): boolean => Game.isPiece(piece, PieceTypeEnum.AMAZON);
  static isQueen = (piece: Piece): boolean => Game.isPiece(piece, PieceTypeEnum.QUEEN);
  static isEmpress = (piece: Piece): boolean => Game.isPiece(piece, PieceTypeEnum.EMPRESS);
  static isCardinal = (piece: Piece): boolean => Game.isPiece(piece, PieceTypeEnum.CARDINAL);
  static isRook = (piece: Piece): boolean => Game.isPiece(piece, PieceTypeEnum.ROOK);
  static isBishop = (piece: Piece): boolean => Game.isPiece(piece, PieceTypeEnum.BISHOP);
  static isKnight = (piece: Piece): boolean => Game.isPiece(piece, PieceTypeEnum.KNIGHT);
  static isPawn = (piece: Piece): boolean => Game.isPiece(piece, PieceTypeEnum.PAWN);

  id: string;
  startingData: StartingData;
  startingFen: string | null;
  players: GamePlayers = {
    [ColorEnum.WHITE]: null!,
    [ColorEnum.BLACK]: null!
  };
  status: GameStatusEnum = GameStatusEnum.BEFORE_START;
  isCheck: boolean = false;
  result: GameResult | null;
  turn: ColorEnum = ColorEnum.WHITE;
  timeControl: TimeControl;
  pgnTags: PGNTags;
  moves: RevertableMove[] = [];
  colorMoves: { [color in ColorEnum]: DarkChessRevertableMove[] } = {
    [ColorEnum.WHITE]: [],
    [ColorEnum.BLACK]: []
  };
  movesCount: number = 0;
  chat: ChatMessage[] = [];
  possibleEnPassant: PossibleEnPassant | null = null;
  positionsMap: { [position: string]: number; } = {};
  positionString: string = '';
  castlingRookCoordinates: { [color in ColorEnum]: CastlingRookCoordinates; };
  startingMoveIndex: number = 0;
  pliesWithoutCaptureOrPawnMove: number = 0;
  kings: GameKings = {
    [ColorEnum.WHITE]: [],
    [ColorEnum.BLACK]: []
  };
  pieces: ReadonlyArray<Piece> = [];
  visiblePieces: { [color in ColorEnum]: (Piece & { realId: number | string; })[]; } = {
    [ColorEnum.WHITE]: [],
    [ColorEnum.BLACK]: []
  };
  pocketPiecesUsed: ReadonlyArray<PieceTypeEnum> = STANDARD_POCKET;
  validPromotions: ReadonlyArray<PieceTypeEnum> = STANDARD_VALID_PROMOTIONS;
  checksCount: ChecksCount = {
    [ColorEnum.WHITE]: 0,
    [ColorEnum.BLACK]: 0
  };
  isPocketUsed: boolean;
  isCrazyhouse: boolean;
  is960: boolean;
  isKingOfTheHill: boolean;
  isAtomic: boolean;
  isCirce: boolean;
  isPatrol: boolean;
  isMadrasi: boolean;
  isMonsterChess: boolean;
  isAliceChess: boolean;
  isTwoFamilies: boolean;
  isHorde: boolean;
  isDarkChess: boolean;
  isAntichess: boolean;
  isAbsorption: boolean;
  isFrankfurt: boolean;
  isCapablanca: boolean;
  isAmazons: boolean;
  isThreeCheck: boolean;
  isCylinderChess: boolean;
  isCircularChess: boolean;
  isHexagonalChess: boolean;
  isLeftInCheckAllowed: boolean;
  pliesPerMove: number;
  boardCount: number;
  boardWidth: number;
  boardHeight: number;
  boardOrthodoxWidth: number;
  boardOrthodoxHeight: number;
  middleFileX: number;
  middleRankY: number;
  emptySquares: ReadonlyArray<Square>;
  variants: ReadonlyArray<GameVariantEnum>;
  drawOffer: ColorEnum | null = null;
  takebackRequest: TakebackRequest | null = null;
  lastMoveTimestamp: number = 0;

  constructor(settings: GameCreateSettings & { id: string; pgnTags?: PGNTags; startingData?: StartingData; startingFen?: string; }) {
    this.id = settings.id || '';
    this.startingData = settings.startingData || Game.getStartingData(settings.variants);
    this.startingFen = settings.startingFen || null;
    ({
      boardCount: this.boardCount,
      boardWidth: this.boardWidth,
      boardHeight: this.boardHeight
    } = Game.getBoardDimensions(settings.variants));
    this.emptySquares = this.startingData.emptySquares;

    this.pgnTags = settings.pgnTags || {};
    this.timeControl = settings.timeControl;
    this.variants = settings.variants;
    this.result = this.startingData.result;

    this.isCrazyhouse = _.includes(this.variants, GameVariantEnum.CRAZYHOUSE);
    this.is960 = _.includes(this.variants, GameVariantEnum.CHESS_960);
    this.isKingOfTheHill = _.includes(this.variants, GameVariantEnum.KING_OF_THE_HILL);
    this.isAtomic = _.includes(this.variants, GameVariantEnum.ATOMIC);
    this.isCirce = _.includes(this.variants, GameVariantEnum.CIRCE);
    this.isPatrol = _.includes(this.variants, GameVariantEnum.PATROL);
    this.isMadrasi = _.includes(this.variants, GameVariantEnum.MADRASI);
    this.isMonsterChess = _.includes(this.variants, GameVariantEnum.MONSTER_CHESS);
    this.isAliceChess = _.includes(this.variants, GameVariantEnum.ALICE_CHESS);
    this.isTwoFamilies = _.includes(this.variants, GameVariantEnum.TWO_FAMILIES);
    this.isHorde = _.includes(this.variants, GameVariantEnum.HORDE);
    this.isDarkChess = _.includes(this.variants, GameVariantEnum.DARK_CHESS);
    this.isAntichess = _.includes(this.variants, GameVariantEnum.ANTICHESS);
    this.isAbsorption = _.includes(this.variants, GameVariantEnum.ABSORPTION);
    this.isFrankfurt = _.includes(this.variants, GameVariantEnum.FRANKFURT);
    this.isCapablanca = _.includes(this.variants, GameVariantEnum.CAPABLANCA);
    this.isAmazons = _.includes(this.variants, GameVariantEnum.AMAZONS);
    this.isThreeCheck = _.includes(this.variants, GameVariantEnum.THREE_CHECK);
    this.isCylinderChess = _.includes(this.variants, GameVariantEnum.CYLINDER_CHESS);
    this.isCircularChess = _.includes(this.variants, GameVariantEnum.CIRCULAR_CHESS);
    this.isHexagonalChess = _.includes(this.variants, GameVariantEnum.HEXAGONAL_CHESS);

    this.isPocketUsed = Game.getIsPocketUsed(settings.variants);
    this.isLeftInCheckAllowed = (
      this.isAtomic
      || this.isMonsterChess
      || this.isDarkChess
      || this.isAntichess
    );
    this.pliesPerMove = this.isMonsterChess ? 3 : 2;
    this.castlingRookCoordinates = {
      [ColorEnum.WHITE]: this.getCastlingRookCoordinates(ColorEnum.WHITE),
      [ColorEnum.BLACK]: this.getCastlingRookCoordinates(ColorEnum.BLACK)
    };

    this.boardOrthodoxWidth = this.isCircularChess
      ? this.boardWidth * 2
      : this.boardWidth;
    this.boardOrthodoxHeight = this.isCircularChess
      ? this.boardHeight / 2
      : this.boardHeight;
    this.middleFileX = Math.ceil(this.boardWidth / 2) - 1;
    this.middleRankY = Math.ceil(this.boardHeight / 2) - 1;

    if (this.isCapablanca || this.isAmazons) {
      this.validPromotions = CAPABLANCA_VALID_PROMOTIONS;
      this.pocketPiecesUsed = CAPABLANCA_POCKET;
    }

    if (this.isAntichess) {
      this.validPromotions = [
        PieceTypeEnum.KING,
        ...this.validPromotions
      ];
    }

    this.setupStartingData();
  }

  setupStartingData() {
    ({
      pieces: this.pieces,
      kings: this.kings
    } = Game.generateGameDataFromStartingData(this.startingData));

    this.turn = this.startingData.turn;
    this.movesCount = this.startingMoveIndex = this.startingData.startingMoveIndex;
    this.pliesWithoutCaptureOrPawnMove = this.startingData.pliesWithoutCaptureOrPawnMove;
    this.possibleEnPassant = this.startingData.possibleEnPassant;
    this.positionString = this.getPositionFen();
    this.positionsMap = {};
    this.positionsMap[this.positionString] = 1;
    this.checksCount = { ...this.startingData.checksCount };

    if (this.isDarkChess) {
      _.forEach(ColorEnum, (color) => {
        this.visiblePieces[color] = this.getVisiblePieces(color).map((piece) => ({
          ...piece,
          realId: piece.id
        }));
      });
    }

    this.isCheck = this.isInCheck(this.turn);
  }

  registerMove(move: Move): RegisterMoveReturnValue {
    const {
      algebraic,
      figurine,
      movedPiece,
      isCapture,
      revertMove
    } = this.performMove(move, {
      constructMoveLiterals: true,
      constructPositionString: true
    });

    this.moves.push({
      ...move,
      algebraic,
      figurine,
      revertMove
    });

    const winResult = this.isWin();

    if (winResult) {
      this.end(winResult.winner, winResult.reason);
    } else {
      const drawReason = this.isDraw();

      if (drawReason) {
        this.end(null, drawReason);
      }
    }

    return {
      movedPiece,
      isWin: !!winResult,
      isCapture
    };
  }

  registerDarkChessMove(move: Move) {
    const prevPieceLocations = this.pieces.map(({ location }) => location);
    const idMap = this.pieces.reduce((map, piece) => {
      map[piece.id] = true;

      return map;
    }, {} as { [pieceId: string]: true; });
    const prevVisibleSquares = {
      [ColorEnum.WHITE]: this.getVisibleSquares(ColorEnum.WHITE),
      [ColorEnum.BLACK]: this.getVisibleSquares(ColorEnum.BLACK)
    };

    const {
      movedPiece: piece,
      isWin,
      isCapture
    } = this.registerMove(move);

    const registeredMove = _.last(this.moves)!;
    const isPromotion = !!move.promotion;

    _.forEach(ColorEnum, (color) => {
      const isOwnMove = color === piece.color;
      const oldVisiblePieces = this.visiblePieces[color];
      const newVisiblePieces = this.getVisiblePieces(color);
      const visibleSquares = this.getVisibleSquares(color);

      const newPieces = newVisiblePieces.map((piece) => {
        const isOwnPiece = piece.color === color;
        const oldPiece = _.find(oldVisiblePieces, { realId: piece.id });
        const prevPieceLocation = prevPieceLocations[_.findIndex(this.pieces, { id: piece.id })];
        const oldLocationVisible = (
          !!prevPieceLocation
          && prevPieceLocation.type === PieceLocationEnum.BOARD
          && prevVisibleSquares[color].some((square) => Game.areSquaresEqual(square, prevPieceLocation))
          && visibleSquares.some((square) => Game.areSquaresEqual(square, prevPieceLocation))
        );
        const newLocationVisible = (
          !!piece.location
          && piece.location.type === PieceLocationEnum.BOARD
          && visibleSquares.some((square) => Game.areSquaresEqual(square, piece.location as PieceBoardLocation))
        );
        const newId = oldPiece && (isOwnPiece || (oldLocationVisible && newLocationVisible))
          ? oldPiece.id
          : Game.generateUid(idMap);

        return {
          ...piece,
          moved: isOwnPiece && piece.moved,
          id: newId,
          realId: piece.id
        };
      });
      const fromLocationVisible = (
        move.from.type === PieceLocationEnum.BOARD
        && prevVisibleSquares[color].some((square) => Game.areSquaresEqual(square, move.from as PieceBoardLocation))
        && visibleSquares.some((square) => Game.areSquaresEqual(square, move.from as PieceBoardLocation))
      );
      const toLocationVisible = visibleSquares.some((square) => Game.areSquaresEqual(square, move.to));
      let algebraic = '';
      let figurine = '';

      if (isOwnMove) {
        algebraic = registeredMove.algebraic;
        figurine = registeredMove.figurine;
      } else if (fromLocationVisible || toLocationVisible || isCapture) {
        if (fromLocationVisible || toLocationVisible) {
          algebraic += Game.getPieceFullAlgebraicLiteral(piece);
          figurine += Game.getPieceFullFigurineLiteral(piece);
        }

        if (fromLocationVisible) {
          const {
            x: fromX,
            y: fromY
          } = move.from as PieceBoardLocation;
          const fileLiteral = Game.getFileLiteral(fromX);
          const rankLiteral = Game.getRankLiteral(fromY);
          const fromLocationLiteral = fileLiteral + rankLiteral;

          algebraic += fromLocationLiteral;
          figurine += fromLocationLiteral;
        } else {
          algebraic += '?';
          figurine += '?';
        }

        if (isCapture) {
          algebraic += 'x';
          figurine += 'x';
        }

        if (toLocationVisible || isCapture) {
          const {
            x: toX,
            y: toY
          } = move.to;
          const fileLiteral = Game.getFileLiteral(toX);
          const rankLiteral = Game.getRankLiteral(toY);
          const toLocationLiteral = fileLiteral + rankLiteral;

          algebraic += toLocationLiteral;
          figurine += toLocationLiteral;
        } else {
          algebraic += '?';
          figurine += '?';
        }

        const promotionVisible = (
          isPromotion
          && fromLocationVisible
          && (!this.isHexagonalChess || toLocationVisible)
        );

        if (promotionVisible) {
          algebraic += `=${toLocationVisible ? Game.getPieceAlgebraicLiteral(move.promotion!) : '?'}`;
          figurine += `=${toLocationVisible ? Game.getPieceFigurineLiteral(move.promotion!, piece.color) : '?'}`;
        }

        if (isWin) {
          algebraic += '#';
          figurine += '#';
        }
      } else {
        algebraic = '?';
        figurine = '?';
      }

      this.visiblePieces[color] = newPieces;

      this.colorMoves[color].push({
        ...move,
        from: fromLocationVisible ? move.from : null,
        to: toLocationVisible || isCapture ? move.to : null,
        algebraic,
        figurine,
        pieces: newPieces.map((piece) => _.omit(piece, 'realId')),
        revertMove: () => {
          this.visiblePieces[color] = oldVisiblePieces;
        }
      });
    });
  }

  registerAnyMove(move: Move) {
    if (this.isDarkChess) {
      this.registerDarkChessMove(move);
    } else {
      this.registerMove(move);
    }
  }

  end(winner: ColorEnum | null, reason: ResultReasonEnum) {
    this.result = {
      winner,
      reason
    };
    this.status = GameStatusEnum.FINISHED;
  }

  performMove(move: Move, options: PerformMoveOptions = {}): PerformMoveReturnValue {
    const {
      constructMoveLiterals = false,
      constructPositionString = false,
      checkIfAllowed = false
    } = options;
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
      : this.getPocketPiece(fromLocation.pieceType, this.turn)!;
    const possibleMovesToLocation = this.getPossibleMoves(piece).filter(({ square }) => Game.areSquaresEqual(square, toLocation));
    const captureMoves = possibleMovesToLocation.filter(({ capture }) => capture);
    const castlingMoves = possibleMovesToLocation.filter(({ castling }) => castling);
    const opponentPiece = captureMoves.length ? captureMoves[0].capture!.piece : null;
    const isCapture = !!captureMoves.length;
    const disappearedOrMovedPieces: BoardPiece[] = [];
    const isPawnPromotion = possibleMovesToLocation.some(({ isPawnPromotion }) => isPawnPromotion);
    const wasKing = Game.isKing(piece);
    const isMainPieceMovedOrDisappeared = this.isAtomic && isCapture;
    const isCastling = !!castlingMoves.length;
    const isKingSideCastling = isCastling && toX - (fromLocation as PieceBoardLocation).x > 0;
    const castlingRook = isCastling
      ? castlingMoves[0].castling!.rook
      : null;

    const prevTurn = this.turn;
    const nextTurn = this.getNextTurn();
    const prevIsCheck = this.isCheck;
    const prevPliesWithoutCaptureOrPawnMove = this.pliesWithoutCaptureOrPawnMove;
    const prevPositionString = this.positionString;
    const prevPossibleEnPassant = this.possibleEnPassant;
    const prevChecksCount = this.checksCount[prevTurn];
    const prevPieceColor = piece.color;
    const prevPieceMoved = piece.moved;
    const prevPieceType = piece.type;
    const prevPieceLocation = piece.location;
    const prevPieceOriginalType = piece.originalType;
    const prevPieceAbilities = piece.abilities;
    const playerPieces = this.getPieces(this.turn);
    const newLocation: PieceBoardLocation = {
      ...(
        isCastling
          ? isKingSideCastling
            ? { board: toBoard, x: this.boardWidth - 2, y: toY }
            : { board: toBoard, x: 2, y: toY }
          : toLocation
      ),
      type: PieceLocationEnum.BOARD
    };

    if (this.isAtomic && isCapture) {
      const board = (fromLocation as PieceBoardLocation).board;

      ATOMIC_SQUARE_INCREMENTS.forEach(([incrementY, incrementX]) => {
        const pieceInSquare = this.getBoardPiece({
          board,
          y: this.adjustRankY(toY + incrementY),
          x: this.adjustFileX(toX + incrementX)
        });

        if (pieceInSquare && (!Game.isPawn(pieceInSquare) || pieceInSquare.abilities)) {
          disappearedOrMovedPieces.push(pieceInSquare);
        }
      });
    }

    // in case of en passant
    if (opponentPiece && !_.includes(disappearedOrMovedPieces, opponentPiece)) {
      disappearedOrMovedPieces.push(opponentPiece);
    }

    if (isMainPieceMovedOrDisappeared && !_.includes(disappearedOrMovedPieces, piece)) {
      disappearedOrMovedPieces.push(piece as BoardPiece);
    }

    if (castlingRook) {
      disappearedOrMovedPieces.push(castlingRook);
    }

    const disappearedOrMovedPiecesData = disappearedOrMovedPieces.map((piece) => (
      _.pick(piece, ['moved', 'color', 'type', 'originalType', 'location', 'abilities'])
    ));

    let algebraic = '';
    let figurine = '';

    if (constructMoveLiterals) {
      if (fromLocation.type === PieceLocationEnum.POCKET) {
        algebraic += Game.getPieceFullAlgebraicLiteral(piece);
        figurine += Game.getPieceFullFigurineLiteral(piece);

        const otherBoardsToDropPiece = this.getAllowedMoves(piece).some(({ square: { board, x, y } }) => (
          board !== toBoard
          && x === toX
          && y === toY
        ));

        if (otherBoardsToDropPiece) {
          const boardLiteral = Game.getBoardLiteral(toBoard);

          algebraic += boardLiteral;
          figurine += boardLiteral;
        }

        const destination = Game.getFileLiteral(toX) + Game.getRankLiteral(toY);

        algebraic += `@${destination}`;
        figurine += `@${destination}`;
      } else if (isCastling) {
        const castling = isKingSideCastling ? 'O-O' : 'O-O-O';

        algebraic += castling;
        figurine += castling;
      } else {
        const {
          board: fromBoard,
          x: fromX,
          y: fromY
        } = fromLocation;

        if (Game.isPawn(piece)) {
          const otherPawnsOnOtherBoardsAbleToMakeMove = playerPieces
            .filter(Game.isBoardPiece)
            .filter((otherPawn) => (
              Game.isPawn(otherPawn)
              && otherPawn.id !== piece.id
              && otherPawn.location.board !== fromBoard
              && this.getAllowedMoves(otherPawn).some(({ square: { x, y } }) => x === toX && y === toY)
            ));

          if (otherPawnsOnOtherBoardsAbleToMakeMove.length) {
            const boardLiteral = Game.getBoardLiteral(fromBoard);

            algebraic += boardLiteral;
            figurine += boardLiteral;
          }

          if (isCapture) {
            const fileLiteral = Game.getFileLiteral(fromX);

            algebraic += fileLiteral;
            figurine += fileLiteral;
          }
        } else {
          algebraic += Game.getPieceFullAlgebraicLiteral(piece);
          figurine += Game.getPieceFullFigurineLiteral(piece);

          const otherPiecesAbleToMakeMove = playerPieces
            .filter(Game.isBoardPiece)
            .filter((otherPiece) => (
              otherPiece.type === piece.type
              && otherPiece.abilities === piece.abilities
              && otherPiece.id !== piece.id
              && this.getAllowedMoves(otherPiece).some(({ square: { x, y } }) => x === toX && y === toY)
            ));

          if (otherPiecesAbleToMakeMove.length) {
            const boardLiteral = Game.getBoardLiteral(fromBoard);
            const fileLiteral = Game.getFileLiteral(fromX);
            const rankLiteral = Game.getRankLiteral(fromY);

            if (otherPiecesAbleToMakeMove.every(({ location }) => location.board !== fromBoard)) {
              algebraic += boardLiteral;
              figurine += boardLiteral;
            } else if (otherPiecesAbleToMakeMove.every(({ location }) => location.x !== fromX)) {
              algebraic += fileLiteral;
              figurine += fileLiteral;
            } else if (otherPiecesAbleToMakeMove.every(({ location }) => location.y !== fromY)) {
              algebraic += rankLiteral;
              figurine += rankLiteral;
            } else if (
              otherPiecesAbleToMakeMove.every(({ location }) => (
                location.board !== fromBoard
                || location.x !== fromX
              ))
            ) {
              algebraic += boardLiteral + fileLiteral;
              figurine += boardLiteral + fileLiteral;
            } else if (
              otherPiecesAbleToMakeMove.every(({ location }) => (
                location.board !== fromBoard
                || location.y !== fromY
              ))
            ) {
              algebraic += boardLiteral + rankLiteral;
              figurine += boardLiteral + rankLiteral;
            } else if (
              otherPiecesAbleToMakeMove.every(({ location }) => (
                location.x !== fromX
                || location.y !== fromY
              ))
            ) {
              algebraic += fileLiteral + rankLiteral;
              figurine += fileLiteral + rankLiteral;
            } else {
              algebraic += boardLiteral + fileLiteral + rankLiteral;
              figurine += boardLiteral + fileLiteral + rankLiteral;
            }
          }
        }

        if (isCapture) {
          algebraic += 'x';
          figurine += 'x';
        }

        const destination = Game.getFileLiteral(toX) + Game.getRankLiteral(toY);

        algebraic += destination;
        figurine += destination;

        if (isPawnPromotion) {
          algebraic += `=${Game.getPieceAlgebraicLiteral(promotion!)}`;
          figurine += `=${Game.getPieceFigurineLiteral(promotion!, piece.color)}`;
        }
      }
    }

    disappearedOrMovedPieces.forEach((disappearedOrMovedPiece) => {
      disappearedOrMovedPiece.location = null!;
    });

    if (Game.isPawn(piece) || isCapture) {
      this.pliesWithoutCaptureOrPawnMove = 0;
    } else {
      this.pliesWithoutCaptureOrPawnMove++;
    }

    if (
      !this.isDarkChess
      && fromLocation.type === PieceLocationEnum.BOARD
      && Game.isPawn(piece)
      && Math.abs(toY - fromLocation.y) > 1
      && fromLocation.board === toBoard
      && (!this.isHorde || fromLocation.y !== 0)
      && (
        !this.isMonsterChess
        || prevTurn !== nextTurn
      )
    ) {
      this.possibleEnPassant = {
        enPassantSquare: {
          board: toBoard,
          x: toX,
          y: Math.round((toY + fromLocation.y) / 2)
        },
        pieceLocation: this.isAliceChess
          ? { ...newLocation, board: this.getNextBoard(toBoard) }
          : newLocation
      };
    } else {
      this.possibleEnPassant = null;
    }

    if (fromLocation.type === PieceLocationEnum.BOARD) {
      (piece as Piece).location = null;
    } else {
      piece.location = newLocation;
    }

    if (!isMainPieceMovedOrDisappeared) {
      const isRoyalKing = wasKing && !this.isAntichess;

      piece.moved = fromLocation.type === PieceLocationEnum.BOARD;
      piece.type = isPawnPromotion && (!this.isFrankfurt || !isRoyalKing)
        ? promotion!
        : piece.type;
      piece.originalType = this.isCrazyhouse
        ? piece.originalType
        : piece.type;
      piece.location = newLocation;
      piece.abilities = this.isFrankfurt && isRoyalKing && isPawnPromotion
        ? promotion!
        : piece.abilities;

      if (this.isAbsorption && isCapture) {
        const {
          type,
          abilities
        } = Game.getPieceTypeAfterAbsorption(piece, opponentPiece!);

        piece.type = type;
        piece.originalType = type;
        piece.abilities = abilities;
      } else if (this.isFrankfurt && isCapture && (!isRoyalKing || !isPawnPromotion)) {
        const isOpponentPieceRoyalKing = Game.isKing(opponentPiece!) && !this.isAntichess;
        const newPieceType = isPawnPromotion
          ? piece.type
          : isRoyalKing || isOpponentPieceRoyalKing
            ? PieceTypeEnum.KING
            : opponentPiece!.type;
        const newAbilities = isRoyalKing
          ? isOpponentPieceRoyalKing
            ? opponentPiece!.abilities
            : opponentPiece!.type
          : null;

        piece.type = newPieceType;
        piece.originalType = newPieceType;
        piece.abilities = newAbilities;
      }
    }

    const removePieceOrMoveToOpponentPocket = (piece: Piece) => {
      piece.location = null;

      if (this.isCrazyhouse && _.includes(this.pocketPiecesUsed, piece.originalType)) {
        const pieceType = piece.originalType;
        const opponentColor = Game.getOppositeColor(piece.color);

        piece.moved = false;
        piece.type = pieceType;
        piece.color = opponentColor;
        (piece as any as PocketPiece).location = {
          type: PieceLocationEnum.POCKET,
          pieceType,
          color: opponentColor
        };
      }
    };

    disappearedOrMovedPieces.forEach((disappearedOrMovedPiece, ix) => {
      const {
        color
      } = disappearedOrMovedPiece;
      const location = disappearedOrMovedPiecesData[ix].location;
      let newSquare = null;

      if (disappearedOrMovedPiece === castlingRook) {
        newSquare = {
          x: isKingSideCastling ? this.boardWidth - 3 : 3,
          y: toY
        };
      } else if (this.isCirce) {
        const oldSquare = disappearedOrMovedPiece === piece
          ? toLocation
          : location;
        const pieceRankY = color === ColorEnum.WHITE
          ? 0
          : this.boardHeight - 1;

        if (Game.isQueen(disappearedOrMovedPiece)) {
          newSquare = {
            x: this.isCapablanca
              ? 4
              : !this.isTwoFamilies || oldSquare.x < this.boardWidth / 2
                ? 3
                : 5,
            y: pieceRankY
          };
        } else if (Game.isEmpress(disappearedOrMovedPiece)) {
          newSquare = {
            x: 3,
            y: pieceRankY
          };
        } else if (Game.isCardinal(disappearedOrMovedPiece)) {
          newSquare = {
            x: 6,
            y: pieceRankY
          };
        } else if (Game.isPawn(disappearedOrMovedPiece)) {
          newSquare = {
            x: oldSquare.x,
            y: color === ColorEnum.WHITE
              ? 1
              : this.boardHeight - 2
          };
        } else if (
          Game.isRook(disappearedOrMovedPiece)
          || Game.isBishop(disappearedOrMovedPiece)
          || Game.isKnight(disappearedOrMovedPiece)
        ) {
          const squareColor = (oldSquare.x + oldSquare.y) % 2;
          const choicesX = Game.isRook(disappearedOrMovedPiece)
            ? [0, this.boardWidth - 1]
            : Game.isKnight(disappearedOrMovedPiece)
              ? [1, this.boardWidth - 2]
              : [2, this.boardWidth - 3];
          const fileX = _.find(choicesX, (fileX) => (fileX + pieceRankY) % 2 === squareColor)!;

          newSquare = {
            x: fileX,
            y: pieceRankY
          };
        }

        if (newSquare) {
          const pieceInSquare = this.getBoardPiece({
            ...newSquare,
            board: location.board
          });

          // don't allow rebirth if it takes place on the square with another piece
          if (pieceInSquare) {
            newSquare = null;
          }
        }
      }

      if (newSquare) {
        disappearedOrMovedPiece.moved = disappearedOrMovedPiece === castlingRook;
        disappearedOrMovedPiece.location = {
          ...newSquare,
          board: location.board,
          type: PieceLocationEnum.BOARD
        };
      } else {
        removePieceOrMoveToOpponentPocket(disappearedOrMovedPiece);
      }
    });

    let isAllowed = true;
    const isKing = Game.isKing(piece);
    const isTurnedKing = isKing && !wasKing;
    const isTurnedFromKing = !isKing && wasKing;
    const setMoveIsAllowed = () => {
      if (checkIfAllowed) {
        isAllowed = isAllowed && (
          this.isAtomic && !this.isAntichess
            ? this.areKingsOnTheBoard(prevTurn)
            : !this.isInCheck(prevTurn)
        );
      }
    };

    if (isTurnedKing) {
      this.kings[this.turn].push(piece);
    } else if (isTurnedFromKing) {
      this.kings[this.turn].pop();
    }

    if (this.isAliceChess) {
      if (Game.isKing(piece)) {
        setMoveIsAllowed();
      }

      const nextBoard = this.getNextBoard(toBoard);

      if (!isMainPieceMovedOrDisappeared && fromLocation.type === PieceLocationEnum.BOARD) {
        piece.location = {
          ...newLocation,
          board: nextBoard
        };
      }

      disappearedOrMovedPieces.forEach((disappearedOrMovedPiece) => {
        const moved = !!disappearedOrMovedPiece.location && disappearedOrMovedPiece.location.type === PieceLocationEnum.BOARD;

        if (moved) {
          const {
            x: squareX,
            y: squareY
          } = disappearedOrMovedPiece.location as PieceBoardLocation;
          const square = {
            x: squareX,
            y: squareY
          };

          // don't allow move to the next board if the square is occupied by another piece on any other board
          if (
            _.times(this.boardCount - 1).some((board) => (
              !!this.getBoardPiece({
                ...square,
                board: this.getNextBoard(toBoard + board)
              })
            ))
          ) {
            removePieceOrMoveToOpponentPocket(disappearedOrMovedPiece);
          } else {
            disappearedOrMovedPiece.location = {
              ...square,
              board: nextBoard,
              type: PieceLocationEnum.BOARD
            };
          }
        }
      });
    }

    this.turn = nextTurn;
    this.isCheck = this.isInCheck(nextTurn);
    this.movesCount++;

    if (this.isCheck) {
      this.checksCount[prevTurn]++;
    }

    setMoveIsAllowed();

    if (constructMoveLiterals) {
      if (this.isWin()) {
        algebraic += '#';
        figurine += '#';
      } else if (this.isCheck) {
        algebraic += '+';
        figurine += '+';
      }
    }

    let positionString = '';
    let oldPositionRepetitions = 0;

    if (constructPositionString) {
      positionString = this.positionString = this.getPositionFen();
      this.positionsMap[positionString] = (oldPositionRepetitions = this.positionsMap[positionString] || 0) + 1;
    }

    return {
      allowed: isAllowed,
      algebraic,
      figurine,
      movedPiece: piece,
      isCapture,
      revertMove: () => {
        this.turn = prevTurn;
        this.isCheck = prevIsCheck;
        this.pliesWithoutCaptureOrPawnMove = prevPliesWithoutCaptureOrPawnMove;
        this.positionString = prevPositionString;
        this.possibleEnPassant = prevPossibleEnPassant;
        this.checksCount[prevTurn] = prevChecksCount;
        this.movesCount--;

        if (oldPositionRepetitions) {
          this.positionsMap[positionString] = oldPositionRepetitions;
        } else {
          delete this.positionsMap[positionString];
        }

        if (isTurnedKing) {
          this.kings[prevTurn].pop();
        } else if (isTurnedFromKing) {
          this.kings[prevTurn].push(piece);
        }

        if (!isMainPieceMovedOrDisappeared) {
          piece.color = prevPieceColor;
          piece.location = prevPieceLocation;
          piece.moved = prevPieceMoved;
          piece.type = prevPieceType;
          piece.originalType = prevPieceOriginalType;
          piece.abilities = prevPieceAbilities;
        }

        disappearedOrMovedPiecesData.forEach((pieceData, ix) => {
          _.assign(disappearedOrMovedPieces[ix], pieceData);
        });
      }
    };
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

  getFenPieces(): string {
    return _.times(this.boardCount, (board) => (
      _.times(this.boardHeight, (y) => {
        let rankString = '';
        let emptySpaces = 0;
        const putEmptySpacesIfNeeded = () => {
          if (emptySpaces) {
            rankString += emptySpaces;
            emptySpaces = 0;
          }
        };

        _.times(this.boardWidth, (x) => {
          const square = { board, x, y };

          if (this.isEmptySquare(square)) {
            return;
          }

          const pieceInSquare = this.getBoardPiece(square);

          if (pieceInSquare) {
            putEmptySpacesIfNeeded();

            const pieceLiteral = Game.getPieceFullAlgebraicLiteral(pieceInSquare);

            rankString += pieceInSquare.color === ColorEnum.WHITE
              ? pieceLiteral
              : pieceLiteral.toLowerCase();
          } else {
            emptySpaces++;
          }
        });

        putEmptySpacesIfNeeded();

        return rankString;
      })
        .reverse()
        .join('/')
      + (
        board === 0 && this.isPocketUsed ? (
          this.pieces
            .filter(({ location }) => !!location && location.type === PieceLocationEnum.POCKET)
            .map((piece) => {
              const pieceLiteral = Game.getPieceFullAlgebraicLiteral(piece);

              return piece.color === ColorEnum.WHITE
                ? pieceLiteral
                : pieceLiteral.toLowerCase();
            })
            .join('')
        ) : ''
      )
    )).join(' ');
  }

  getFenPossibleCastling(): string {
    const whiteCastlingRooks = this.getCastlingRooks(ColorEnum.WHITE);
    const blackCastlingRooks = this.getCastlingRooks(ColorEnum.BLACK);
    const whiteQueenSideKing = this.kings[ColorEnum.WHITE][0];
    const whiteKingSideKing = _.last(this.kings[ColorEnum.WHITE]);
    const blackQueenSideKing = this.kings[ColorEnum.BLACK][0];
    const blackKingSideKing = _.last(this.kings[ColorEnum.BLACK]);
    const whiteQueenSideCastlingPossible = (
      this.startingData.possibleCastling[ColorEnum.WHITE][CastlingTypeEnum.QUEEN_SIDE]
      && !!whiteQueenSideKing
      && !whiteQueenSideKing.moved
      && !!whiteCastlingRooks[CastlingTypeEnum.QUEEN_SIDE]
      && !whiteCastlingRooks[CastlingTypeEnum.QUEEN_SIDE]!.moved
    );
    const whiteKingSideCastlingPossible = (
      this.startingData.possibleCastling[ColorEnum.WHITE][CastlingTypeEnum.KING_SIDE]
      && !!whiteKingSideKing
      && !whiteKingSideKing.moved
      && !!whiteCastlingRooks[CastlingTypeEnum.KING_SIDE]
      && !whiteCastlingRooks[CastlingTypeEnum.KING_SIDE]!.moved
    );
    const blackQueenSideCastlingPossible = (
      this.startingData.possibleCastling[ColorEnum.BLACK][CastlingTypeEnum.QUEEN_SIDE]
      && !!blackQueenSideKing
      && !blackQueenSideKing.moved
      && !!blackCastlingRooks[CastlingTypeEnum.QUEEN_SIDE]
      && !blackCastlingRooks[CastlingTypeEnum.QUEEN_SIDE]!.moved
    );
    const blackKingSideCastlingPossible = (
      this.startingData.possibleCastling[ColorEnum.BLACK][CastlingTypeEnum.KING_SIDE]
      && !!blackKingSideKing
      && !blackKingSideKing.moved
      && !!blackCastlingRooks[CastlingTypeEnum.KING_SIDE]
      && !blackCastlingRooks[CastlingTypeEnum.KING_SIDE]!.moved
    );
    let castlingString = '';

    if (whiteKingSideCastlingPossible) {
      castlingString += 'K';
    }

    if (whiteQueenSideCastlingPossible) {
      castlingString += 'Q';
    }

    if (blackKingSideCastlingPossible) {
      castlingString += 'k';
    }

    if (blackQueenSideCastlingPossible) {
      castlingString += 'q';
    }

    if (!castlingString) {
      castlingString = '-';
    }

    return castlingString;
  }

  getFenTurn(): string {
    const pliesInMove = this.movesCount % this.pliesPerMove;

    return this.isMonsterChess
      ? pliesInMove === 0 ? 'w1' : pliesInMove === 1 ? 'w2' : 'b'
      : this.turn === ColorEnum.WHITE ? 'w' : 'b';
  }

  getFenEnPassant(): string {
    return this.possibleEnPassant
      ? Game.getFileLiteral(this.possibleEnPassant.enPassantSquare.x) + Game.getRankLiteral(this.possibleEnPassant.enPassantSquare.y)
      : '-';
  }

  getFenChecksCount(): string {
    if (!this.isThreeCheck) {
      return '';
    }

    return ` +${this.checksCount[ColorEnum.WHITE]}+${this.checksCount[ColorEnum.BLACK]}`;
  }

  getPositionFen(): string {
    const piecesFen = this.getFenPieces();
    const castlingFen = this.getFenPossibleCastling();
    const turnFen = this.getFenTurn();
    const enPassantFen = this.getFenEnPassant();
    const checksCountFen = this.getFenChecksCount();

    return `${piecesFen} ${turnFen} ${castlingFen} ${enPassantFen}${checksCountFen}`;
  }

  getFen(): string {
    const piecesFen = this.getFenPieces();
    const castlingFen = this.getFenPossibleCastling();
    const turnFen = this.getFenTurn();
    const enPassantFen = this.getFenEnPassant();
    const pliesCountFen = this.pliesWithoutCaptureOrPawnMove;
    const moveIndexFen = Math.floor(this.movesCount / this.pliesPerMove) + 1;
    const checksCountFen = this.getFenChecksCount();

    return `${piecesFen} ${turnFen} ${castlingFen} ${enPassantFen} ${pliesCountFen} ${moveIndexFen}${checksCountFen}`;
  }

  getNextTurn(): ColorEnum {
    return this.movesCount % this.pliesPerMove === this.pliesPerMove - 2
      ? ColorEnum.BLACK
      : ColorEnum.WHITE;
  }

  getPrevTurn(): ColorEnum {
    return this.movesCount % this.pliesPerMove === 0
      ? ColorEnum.BLACK
      : ColorEnum.WHITE;
  }

  getCenterSquareParams(square: Square): CenterSquareParams | null {
    const leftCenterX = Math.round(this.boardWidth / 2) - 1;
    const rightCenterX = leftCenterX + 1;
    const topCenterY = Math.round(this.boardHeight / 2) - 1;
    const bottomCenterY = topCenterY + 1;
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

  getOpponentColor(): ColorEnum {
    return Game.getOppositeColor(this.turn);
  }

  getPieces(playerColor: ColorEnum): RealPiece[] {
    return this.pieces
      .filter(Game.isRealPiece)
      .filter(({ color }) => color === playerColor);
  }

  getBoardPiece(square: Square): BoardPiece | null {
    return _.find(this.pieces, (piece) => (
      Game.isBoardPiece(piece)
      && Game.areSquaresEqual(piece.location, square)
    )) as BoardPiece | undefined || null;
  }

  getPocketPiece(type: PieceTypeEnum, color: ColorEnum): PocketPiece | null {
    return _.find(this.pieces, (piece) => (
      Game.isPocketPiece(piece)
      && piece.color === color
      && piece.location.pieceType === type
    )) as PocketPiece | undefined || null;
  }

  getCastlingRookCoordinates(color: ColorEnum): CastlingRookCoordinates {
    let rookCoordinates: CastlingRookCoordinates = {
      [CastlingTypeEnum.QUEEN_SIDE]: null,
      [CastlingTypeEnum.KING_SIDE]: null
    };
    const castlingRank = color === ColorEnum.WHITE
      ? 0
      : this.boardHeight - 1;

    if (this.is960) {
      const rooksOnTheCastlingRank = this.startingData.pieces.filter((piece) => (
        piece.color === color
        && Game.isRook(piece)
        && piece.location.type === PieceLocationEnum.BOARD
        && piece.location.y === castlingRank
      )) as BoardPiece[];

      if (rooksOnTheCastlingRank.length > 1) {
        rookCoordinates = {
          [CastlingTypeEnum.QUEEN_SIDE]: rooksOnTheCastlingRank[0].location,
          [CastlingTypeEnum.KING_SIDE]: _.last(rooksOnTheCastlingRank)!.location
        };
      } else if (rooksOnTheCastlingRank.length === 1) {
        const kingOnTheCastlingRank = _.find(this.startingData.pieces, (piece) => (
          piece.color === color
          && Game.isKing(piece)
          && piece.location.type === PieceLocationEnum.BOARD
          && piece.location.y === castlingRank
        )) as BoardPiece | undefined;

        if (kingOnTheCastlingRank) {
          const castlingRook = rooksOnTheCastlingRank[0];

          if (castlingRook.location.x > kingOnTheCastlingRank.location.x) {
            rookCoordinates = {
              [CastlingTypeEnum.QUEEN_SIDE]: null,
              [CastlingTypeEnum.KING_SIDE]: castlingRook.location
            };
          } else {
            rookCoordinates = {
              [CastlingTypeEnum.QUEEN_SIDE]: castlingRook.location,
              [CastlingTypeEnum.KING_SIDE]: null
            };
          }
        }
      }
    } else {
      rookCoordinates = {
        [CastlingTypeEnum.QUEEN_SIDE]: {
          board: 0,
          x: 0,
          y: castlingRank
        },
        [CastlingTypeEnum.KING_SIDE]: {
          board: 0,
          x: this.boardWidth - 1,
          y: castlingRank
        }
      };
    }

    return rookCoordinates;
  }

  getCastlingRooks(color: ColorEnum): { [castling in CastlingTypeEnum]: BoardPiece | null; } {
    const getRook = (square: Square | null): BoardPiece | null => {
      const pieceInSquare = square && this.getBoardPiece(square);

      return pieceInSquare && !pieceInSquare.moved
        ? pieceInSquare
        : null;
    };

    return {
      [CastlingTypeEnum.QUEEN_SIDE]: getRook(this.castlingRookCoordinates[color][CastlingTypeEnum.QUEEN_SIDE]),
      [CastlingTypeEnum.KING_SIDE]: getRook(this.castlingRookCoordinates[color][CastlingTypeEnum.KING_SIDE])
    };
  }

  getPossibleMoves(piece: RealPiece, options: PossibleMovesOptions = {}): PossibleMove[] {
    const {
      onlyAttacked = false,
      onlyControlled = false,
      onlyVisible = false,
      onlyPossible = false
    } = options;
    const forMove = !onlyControlled && !onlyAttacked && !onlyVisible && !onlyPossible;

    if (piece.location.type === PieceLocationEnum.POCKET) {
      return _.times(this.boardCount).reduce((possibleMoves, board) => (
        _.times(this.boardHeight).reduce((possibleMoves, rankY) => {
          let newMoves: PossibleMove[] = [];

          if (
            (piece.location as PiecePocketLocation).pieceType !== PieceTypeEnum.PAWN
            || (
              rankY !== 0
              && rankY !== this.boardHeight - 1
              && (
                !this.isCircularChess || (
                  rankY !== this.boardOrthodoxHeight - 1
                  && rankY !== this.boardOrthodoxHeight
                )
              )
            )
          ) {
            newMoves = _
              .times(this.boardWidth, (fileX) => ({
                board,
                x: fileX,
                y: rankY
              }))
              .filter((square) => (
                (
                  !this.isDarkChess
                  || this.getVisibleSquares(piece.color).some((visibleSquare) => Game.areSquaresEqual(square, visibleSquare))
                )
                && _.times(this.boardCount).every((board) => (
                  !this.getBoardPiece({
                    ...square,
                    board
                  })
                ))
              ))
              .map((square) => ({
                ...DEFAULT_MOVE,
                square
              }));
          }

          return [
            ...possibleMoves,
            ...newMoves
          ];
        }, possibleMoves)
      ), [] as PossibleMove[]);
    }

    if (this.isPatrol && onlyAttacked && !this.isPatrolledByFriendlyPiece(piece as BoardPiece)) {
      return [];
    }

    const pieceColor = piece.color;
    const {
      board,
      x: pieceX,
      y: pieceY
    } = piece.location;
    const opponentColor = Game.getOppositeColor(pieceColor);
    const captureAllowed = (
      !this.isPatrol
      || onlyControlled
      || this.isPatrolledByFriendlyPiece(piece as BoardPiece)
    );
    let possibleMoves: PossibleMove[] = [];
    const traverseDirection = (
      movementType: (
        PieceTypeEnum.KNIGHT
        | PieceTypeEnum.BISHOP
        | PieceTypeEnum.ROOK
      ),
      incrementY: number,
      incrementX: number,
      stopAfter: number
    ) => {
      let rankY = pieceY;
      let fileX = pieceX;
      let iterations = 0;

      while (true) {
        const newFileX = this.adjustFileX(fileX + incrementX);
        let eventualIncrementY = incrementY;

        if (this.isHexagonalChess) {
          if (movementType === PieceTypeEnum.ROOK) {
            if ((
              incrementX === -1
              && incrementY === -1
              && fileX > this.middleFileX
            ) || (
              incrementX === +1
              && incrementY === +1
              && fileX >= this.middleFileX
            )) {
              eventualIncrementY = 0;
            } else if ((
              incrementX === -1
              && incrementY === 0
              && fileX > this.middleFileX
            ) || (
              incrementX === +1
              && incrementY === 0
              && fileX >= this.middleFileX
            )) {
              eventualIncrementY = -incrementX;
            }
          } else if (movementType === PieceTypeEnum.BISHOP) {
            if (
              (incrementX === +2 || incrementX === -2)
              && (fileX - this.middleFileX) * incrementX < 0
              && (newFileX - this.middleFileX) * incrementX > 0
            ) {
              eventualIncrementY = 0;
            } else if ((
              incrementX === -2
              && incrementY === -1
              && fileX > this.middleFileX
            ) || (
              incrementX === +2
              && incrementY === +1
              && fileX >= this.middleFileX
            )) {
              eventualIncrementY = -incrementY;
            } else if ((
              incrementX === -1
              && incrementY === -2
              && fileX > this.middleFileX
            ) || (
              incrementX === +1
              && incrementY === +2
              && fileX >= this.middleFileX
            )) {
              eventualIncrementY = incrementX;
            } else if ((
              incrementX === -1
              && incrementY === +1
              && fileX > this.middleFileX
            ) || (
              incrementX === +1
              && incrementY === -1
              && fileX >= this.middleFileX
            )) {
              eventualIncrementY = 2 * incrementY;
            }
          } else {
            // eslint-disable-next-line no-lonely-if
            if (
              (incrementX === +3 || incrementX === -3)
              && (fileX - this.middleFileX) * incrementX < 0
              && (newFileX - this.middleFileX) * incrementX > 0
            ) {
              eventualIncrementY = incrementY - (
                incrementX === +3
                  ? newFileX - this.middleFileX
                  : this.middleFileX - fileX
              );
            } else if ((
              incrementX === -3
              && fileX > this.middleFileX
            ) || (
              incrementX === +3
              && fileX >= this.middleFileX
            )) {
              eventualIncrementY = incrementX === +3
                ? incrementY - 3
                : incrementY + 3;
            } else if (
              (incrementX === +2 || incrementX === -2)
              && (incrementY === +3 || incrementY === -3)
              && (fileX - this.middleFileX) * incrementX < 0
              && (newFileX - this.middleFileX) * incrementX > 0
            ) {
              eventualIncrementY = incrementX;
            } else if ((
              incrementX === -2
              && incrementY === -3
              && fileX > this.middleFileX
            ) || (
              incrementX === +2
              && incrementY === +3
              && fileX >= this.middleFileX
            )) {
              eventualIncrementY = incrementY / 3;
            } else if (
              (incrementX === +2 || incrementX === -2)
              && (incrementY === +1 || incrementY === -1)
              && (fileX - this.middleFileX) * incrementX < 0
              && (newFileX - this.middleFileX) * incrementX > 0
            ) {
              eventualIncrementY = incrementY * 2;
            } else if ((
              incrementX === -2
              && incrementY === +1
              && fileX > this.middleFileX
            ) || (
              incrementX === +2
              && incrementY === -1
              && fileX >= this.middleFileX
            )) {
              eventualIncrementY = incrementY * 3;
            } else if ((
              incrementX === -1
              && incrementY === -3
              && fileX > this.middleFileX
            ) || (
              incrementX === +1
              && incrementY === +3
              && fileX >= this.middleFileX
            )) {
              eventualIncrementY = incrementX * 2;
            } else if ((
              incrementX === -1
              && incrementY === +2
              && fileX > this.middleFileX
            ) || (
              incrementX === +1
              && incrementY === -2
              && fileX >= this.middleFileX
            )) {
              eventualIncrementY = -incrementX * 3;
            }
          }
        }

        rankY = this.adjustRankY(rankY + eventualIncrementY);
        fileX = newFileX;

        const square = {
          board,
          x: fileX,
          y: rankY
        };

        if (this.isNullSquare(square)) {
          break;
        }

        const pieceInSquare = this.getBoardPiece(square);

        if (pieceInSquare && pieceInSquare.color === pieceColor) {
          if (!forMove && !onlyPossible) {
            possibleMoves.push({
              ...DEFAULT_MOVE,
              square
            });
          }

          break;
        }

        if (isKing && forMove && !this.isLeftInCheckAllowed && this.isAttackedByOpponentPiece(square, opponentColor)) {
          break;
        }

        possibleMoves.push({
          ...DEFAULT_MOVE,
          square,
          capture: pieceInSquare ? {
            piece: pieceInSquare,
            enPassant: false
          } : null
        });

        if (pieceInSquare) {
          break;
        }

        if (++iterations === stopAfter) {
          break;
        }
      }
    };

    if (onlyVisible) {
      possibleMoves.push({
        ...DEFAULT_MOVE,
        square: { board, x: pieceX, y: pieceY }
      });
    }

    const isKing = Game.isKing(piece);
    const isKingMove = isKing && (!this.isFrankfurt || !piece.abilities);
    const isAmazon = Game.isAmazon(piece);
    const isQueen = Game.isQueen(piece);
    const isEmpress = Game.isEmpress(piece);
    const isCardinal = Game.isCardinal(piece);
    const isPawn = Game.isPawn(piece);
    const isBishop = Game.isBishop(piece);
    const isRook = Game.isRook(piece);
    const isKnight = Game.isKnight(piece);

    if (isKingMove || isAmazon || isQueen || isEmpress || isRook) {
      const stopAfter = isKingMove && !isAmazon && !isQueen && !isEmpress && !isRook
        ? 1
        : Infinity;

      (
        this.isHexagonalChess
          ? HEX_ROOK_MOVE_INCREMENTS
          : ROOK_MOVE_INCREMENTS
      ).forEach(([incrementY, incrementX]) => {
        traverseDirection(PieceTypeEnum.ROOK, incrementY, incrementX, stopAfter);
      });
    }

    if (isKingMove || isAmazon || isQueen || isCardinal || isBishop) {
      const stopAfter = isKingMove && !isAmazon && !isQueen && !isCardinal && !isBishop
        ? 1
        : Infinity;

      (
        this.isHexagonalChess
          ? HEX_BISHOP_MOVE_INCREMENTS
          : BISHOP_MOVE_INCREMENTS
      ).forEach(([incrementY, incrementX]) => {
        traverseDirection(PieceTypeEnum.BISHOP, incrementY, incrementX, stopAfter);
      });
    }

    if (isAmazon || isEmpress || isCardinal || isKnight) {
      (
        this.isHexagonalChess
          ? HEX_KNIGHT_MOVE_INCREMENTS
          : KNIGHT_MOVE_INCREMENTS
      ).forEach(([incrementY, incrementX]) => {
        traverseDirection(PieceTypeEnum.KNIGHT, incrementY, incrementX, 1);
      });
    }

    if (isPawn) {
      let direction: number;

      if (this.isCircularChess) {
        direction = (
          pieceColor === ColorEnum.WHITE
          && pieceY < this.boardHeight / 2
        ) || (
          pieceColor === ColorEnum.BLACK
          && pieceY >= this.boardHeight / 2
        ) ? 1 : -1;
      } else {
        direction = pieceColor === ColorEnum.WHITE ? 1 : -1;
      }

      const rankY = this.adjustRankY(pieceY + direction);
      const square = {
        board,
        x: pieceX,
        y: rankY
      };
      const isPawnPromotion = rankY === (
        this.isCircularChess
          ? pieceColor === ColorEnum.WHITE
            ? direction === 1
              ? this.boardOrthodoxHeight - 1
              : this.boardOrthodoxHeight
            : direction === 1
              ? this.boardHeight - 1
              : 0
          : this.isHexagonalChess
            ? Infinity
            : pieceColor === ColorEnum.WHITE
              ? this.boardHeight - 1
              : 0
      );
      const getIsPawnPromotion = (square: Square): boolean => (
        this.isHexagonalChess
          ? square.y === (
            pieceColor === ColorEnum.WHITE
              ? this.boardHeight - 1 - Math.abs(square.x - this.middleFileX)
              : 0
          )
          : isPawnPromotion
      );

      if ((forMove || onlyPossible || onlyVisible) && !this.isNullSquare(square)) {
        // 1-forward move
        const pieceInSquare = this.getBoardPiece(square);

        if (!pieceInSquare || onlyVisible) {
          possibleMoves.push({
            ...DEFAULT_MOVE,
            square,
            isPawnPromotion: getIsPawnPromotion(square)
          });

          if (
            !pieceInSquare && (
              (
                pieceColor === ColorEnum.WHITE
                  ? this.isHexagonalChess
                    ? pieceY === this.middleFileX - 1 - Math.abs(pieceX - this.middleFileX)
                    : pieceY === 1 || (this.isCircularChess && pieceY === this.boardHeight - 2)
                  : this.isHexagonalChess
                    ? pieceY === this.middleRankY + 1
                    : pieceY === this.boardOrthodoxHeight - 2 || (this.isCircularChess && pieceY === this.boardOrthodoxHeight + 1)
              ) || (
                pieceColor === ColorEnum.WHITE
                && this.isHorde
                && (pieceY === 0 || (this.isCircularChess && pieceY === this.boardHeight - 1))
              )
            )
          ) {
            // 2-forward move
            const square = {
              board,
              x: pieceX,
              y: rankY + direction
            };
            const pieceInSquare = this.getBoardPiece(square);

            if (!pieceInSquare || onlyVisible) {
              possibleMoves.push({
                ...DEFAULT_MOVE,
                square
              });
            }
          }
        }
      }

      [1, -1].forEach((incrementX) => {
        // capture
        const fileX = this.adjustFileX(pieceX + incrementX);
        const square = {
          board,
          x: fileX,
          y: this.isHexagonalChess && ((
            pieceColor === ColorEnum.WHITE
            && (pieceX - this.middleFileX) * incrementX >= 0
          ) || (
            pieceColor === ColorEnum.BLACK
            && (pieceX - this.middleFileX) * incrementX < 0
          ))
            ? rankY - direction
            : rankY
        };

        if (!this.isNullSquare(square)) {
          const pieceInSquare = this.getBoardPiece(square);
          const isEnPassant = (
            captureAllowed
            && !!this.possibleEnPassant
            && Game.areSquaresEqual(square, this.possibleEnPassant.enPassantSquare)
          );
          const isCapture = (
            (!!pieceInSquare && pieceInSquare.color !== pieceColor)
            || isEnPassant
          );

          if (
            (!forMove && !onlyPossible)
            || isCapture
          ) {
            possibleMoves.push({
              ...DEFAULT_MOVE,
              square,
              capture: isCapture ? isEnPassant ? {
                piece: this.getBoardPiece(this.possibleEnPassant!.pieceLocation)!,
                enPassant: true
              } : {
                piece: pieceInSquare!,
                enPassant: false
              } : null,
              isPawnPromotion: (!isCapture || !this.isFrankfurt) && getIsPawnPromotion(square)
            });
          }
        }
      });
    }

    if (
      (forMove || onlyPossible)
      && isKing
      && !piece.moved
      && piece.location.y === (pieceColor === ColorEnum.WHITE ? 0 : this.boardHeight - 1)
      && (
        this.isLeftInCheckAllowed
        || !this.isAttackedByOpponentPiece(piece.location, opponentColor)
      )
    ) {
      const queenSideKing = this.kings[pieceColor][0];
      const kingSideKing = _.last(this.kings[pieceColor])!;
      const castlingRooks = this.getCastlingRooks(pieceColor);

      [castlingRooks[CastlingTypeEnum.QUEEN_SIDE], castlingRooks[CastlingTypeEnum.KING_SIDE]]
        .filter((rook, ix) => (
          (
            // queen-side king and queen-side rook
            (piece.id === queenSideKing.id && ix === 0)
            // king-side king and king-side rook
            || (piece.id === kingSideKing.id && ix === 1)
          )
          && this.startingData.possibleCastling[pieceColor][ix === 0 ? CastlingTypeEnum.QUEEN_SIDE : CastlingTypeEnum.KING_SIDE]
          && rook
          && rook.location.board === board
          && (!this.isMadrasi || !this.isParalysed(rook))
        ))
        .filter((rook) => {
          const { location: rookLocation } = rook!;
          const isKingSideRook = rookLocation.x - pieceX > 0;
          const newKingX = isKingSideRook ? this.boardWidth - 2 : 2;
          const newRookX = isKingSideRook ? this.boardWidth - 3 : 3;
          let canKingMove = true;

          _.times(Math.abs(pieceX - newKingX), (x) => {
            const fileX = newKingX + (pieceX > newKingX ? +x : -x);
            const pieceInSquare = this.getBoardPiece({ board, y: pieceY, x: fileX });

            // square is attacked or square is occupied by a piece that is not the rook
            if ((
              fileX !== newKingX
              && !this.isLeftInCheckAllowed
              && this.isAttackedByOpponentPiece({ board, x: fileX, y: pieceY }, opponentColor)
            ) || (
              pieceInSquare
              && pieceInSquare !== rook
            )) {
              canKingMove = false;
            }
          });

          if (!canKingMove) {
            return false;
          }

          let canRookMove = true;

          _.times(Math.abs(rookLocation.x - newRookX), (x) => {
            const fileX = newRookX + (rookLocation.x > newRookX ? +x : -x);
            const pieceInSquare = this.getBoardPiece({ board, y: pieceY, x: fileX });

            // square is occupied by a piece that is not the king
            if (
              pieceInSquare
              && pieceInSquare !== piece
            ) {
              canRookMove = false;
            }
          });

          if (this.boardCount > 1) {
            // a piece cannot move to a square that is occupied on any other board
            canRookMove = canRookMove && _.times(this.boardCount - 1).every((board) => (
              !this.getBoardPiece({
                board: this.getNextBoard(rookLocation.board + board),
                y: rookLocation.y,
                x: newRookX
              })
            ));
          }

          return canRookMove;
        })
        .forEach((rook) => {
          const { location: rookLocation } = rook!;
          const isKingSideRook = rookLocation.x - pieceX > 0;

          possibleMoves.push({
            ...DEFAULT_MOVE,
            square: {
              board,
              x: this.is960
                ? rookLocation.x
                : isKingSideRook
                  ? this.boardWidth - 2
                  : 2,
              y: pieceY
            },
            castling: { rook: rook! }
          });
        });
    }

    if (
      (forMove || onlyControlled || onlyAttacked)
      && this.isMadrasi
      && this.isParalysed(piece, possibleMoves)
    ) {
      return [];
    }

    if (this.isAliceChess && (forMove || onlyPossible)) {
      // a piece cannot move to a square that is occupied on the next board
      possibleMoves = possibleMoves.filter(({ square }) => (
        _.times(this.boardCount - 1).every((board) => (
          !this.getBoardPiece({
            ...square,
            board: this.getNextBoard(square.board + board)
          })
        ))
      ));
    }

    if (!captureAllowed) {
      return possibleMoves.filter(({ square }) => {
        const pieceInSquare = this.getBoardPiece(square);

        return (
          !pieceInSquare
          || pieceInSquare.color === pieceColor
        );
      });
    }

    return possibleMoves;
  }

  getAllowedMoves(piece: RealPiece): PossibleMove[] {
    const possibleMoves = this.getPossibleMoves(piece);

    if (this.isAntichess) {
      return this.hasCapturePieces(piece.color)
        ? possibleMoves.filter(({ capture }) => capture)
        : possibleMoves;
    }

    if (this.isLeftInCheckAllowed && !this.isAtomic) {
      return possibleMoves;
    }

    return possibleMoves.filter(({ square }) => {
      const { allowed, revertMove } = this.performMove({
        from: piece.location,
        to: square,
        duration: 0,
        promotion: PieceTypeEnum.QUEEN
      }, { checkIfAllowed: true });

      revertMove();

      return allowed;
    });
  }

  getVisibleSquares(forColor: ColorEnum): Square[] {
    return this.getPieces(forColor)
      .filter(Game.isBoardPiece)
      .reduce((squares, piece) => {
        let newSquares = this.getPossibleMoves(piece, { onlyVisible: true }).map(({ square }) => square);

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

  getVisiblePieces(forColor: ColorEnum): Piece[] {
    const visibleSquares = this.getVisibleSquares(forColor);

    return this.pieces.filter(({ color, location }) => (
      color === forColor || (
        !!location
        && location.type === PieceLocationEnum.BOARD
        && visibleSquares.some((square) => Game.areSquaresEqual(square, location))
      )
    ));
  }

  isParalysed(piece: RealPiece, possibleMoves?: PossibleMove[]): boolean {
    return (
      piece.location.type === PieceLocationEnum.BOARD
      && (possibleMoves || this.getPossibleMoves(piece, { onlyPossible: true })).some(({ square }) => {
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

  isEmptySquare(square: Square): boolean {
    return this.emptySquares.some((emptySquare) => (
      Game.areSquaresEqual(square, emptySquare)
    ));
  }

  hasCapturePieces(color: ColorEnum): boolean {
    return this.getPieces(color).some((piece) => (
      this.getPossibleMoves(piece).some(({ capture }) => !!capture)
    ));
  }

  isInCheck(color: ColorEnum): boolean {
    const opponentColor = Game.getOppositeColor(color);

    return (
      !this.isLeftInCheckAllowed
      && this.kings[color].some((king) => (
        Game.isBoardPiece(king)
        && this.isAttackedByOpponentPiece(king.location, opponentColor)
      ))
    );
  }

  isAttackedByOpponentPiece(square: Square, opponentColor: ColorEnum): boolean {
    return this.getPieces(opponentColor).some((piece) => (
      Game.isBoardPiece(piece)
      && this.getPossibleMoves(piece, { onlyAttacked: true }).some(({ square: possibleSquare }) => (
        Game.areSquaresEqual(possibleSquare, square)
      ))
    ));
  }

  isPatrolledByFriendlyPiece(piece: BoardPiece): boolean {
    const pieceLocation = piece.location;

    return this.getPieces(piece.color).some((piece) => (
      Game.isBoardPiece(piece)
      && this.getPossibleMoves(piece, { onlyControlled: true }).some(({ square }) => (
        Game.areSquaresEqual(square, pieceLocation)
      ))
    ));
  }

  isWin(): GameResult | null {
    const prevTurn = this.getPrevTurn();
    const currentTurn = this.turn;
    const nextTurn = this.getNextTurn();

    if (this.isCheckmate()) {
      return {
        winner: prevTurn,
        reason: ResultReasonEnum.CHECKMATE
      };
    }

    if (this.isKingOfTheHill && this.isKingInTheCenter(prevTurn)) {
      return {
        winner: this.isAntichess
          ? currentTurn
          : prevTurn,
        reason: ResultReasonEnum.KING_IN_THE_CENTER
      };
    }

    if (this.isAtomic && !this.isAntichess && !this.areKingsOnTheBoard(this.turn)) {
      return {
        winner: prevTurn,
        reason: ResultReasonEnum.KING_EXPLODED
      };
    }

    if ((this.isMonsterChess || this.isDarkChess) && !this.isAntichess && !this.areKingsOnTheBoard(this.turn)) {
      return {
        winner: prevTurn,
        reason: ResultReasonEnum.KING_CAPTURED
      };
    }

    if ((this.isHorde || this.isAmazons) && this.turn === ColorEnum.WHITE && this.isNoPieces(ColorEnum.WHITE)) {
      return {
        winner: prevTurn,
        reason: this.isHorde
          ? ResultReasonEnum.HORDE_DESTROYED
          : ResultReasonEnum.AMAZONS_DESTROYED
      };
    }

    if (this.isThreeCheck && this.checksCount[prevTurn] === 3) {
      return {
        winner: prevTurn,
        reason: ResultReasonEnum.THREE_CHECKS
      };
    }

    if (this.isAntichess && this.isNoPieces(prevTurn) && !this.isNoPieces(currentTurn)) {
      return {
        winner: prevTurn,
        reason: ResultReasonEnum.NO_MORE_PIECES
      };
    }

    if (this.isAntichess && this.isStalemate() && !this.isNoPieces(nextTurn)) {
      return {
        winner: currentTurn,
        reason: this.isNoPieces(currentTurn)
          ? ResultReasonEnum.NO_MORE_PIECES
          : ResultReasonEnum.STALEMATE
      };
    }

    return null;
  }

  isNoPieces(color: ColorEnum): boolean {
    return !this.getPieces(color).length;
  }

  isKingInTheCenter(color: ColorEnum): boolean {
    return this.kings[color].some((king) => (
      Game.isBoardPiece(king)
      && !!this.getCenterSquareParams(king.location)
    ));
  }

  areKingsOnTheBoard(color: ColorEnum): boolean {
    return this.kings[color].every((king) => (
      !!king.location
      && king.location.type === PieceLocationEnum.BOARD
    ));
  }

  isCheckmate(): boolean {
    return this.isCheck && this.isNoMoves();
  }

  isDraw(): ResultReasonEnum | null {
    if (
      this.isAntichess
      && this.isNoPieces(this.turn)
      && this.isNoPieces(this.getNextTurn())
    ) {
      return ResultReasonEnum.NO_MORE_PIECES;
    }

    if (this.isStalemate()) {
      return ResultReasonEnum.STALEMATE;
    }

    if (this.isInsufficientMaterial()) {
      return ResultReasonEnum.INSUFFICIENT_MATERIAL;
    }

    if (this.pliesWithoutCaptureOrPawnMove >= 100) {
      return ResultReasonEnum.FIFTY_MOVE_RULE;
    }

    if (this.positionsMap[this.positionString] === 3) {
      return ResultReasonEnum.THREEFOLD_REPETITION;
    }

    return null;
  }

  isInsufficientMaterial(): boolean {
    if (
      !this.isAntichess && (
        this.isKingOfTheHill
        || this.isMonsterChess
        || this.isHorde
        || this.isDarkChess
        || this.isCrazyhouse
      )
    ) {
      return false;
    }

    // TODO: add support for absorption/frankfurt

    const whitePieces = this.getPieces(ColorEnum.WHITE);
    const blackPieces = this.getPieces(ColorEnum.BLACK);
    const pieces = _
      .sortBy([
        whitePieces,
        blackPieces
      ], 'length')
      .map((pieces) => (
        pieces.filter(Game.isBoardPiece)
      ));

    if (this.isAntichess) {
      const possibleBishopColors = pieces.map(([piece]) => (
        piece
          ? piece.location.x % 2 + piece.location.y % 2
          : 0.5
      ));

      return (
        possibleBishopColors[0] !== possibleBishopColors[1]
        && pieces.every((pieces, index) => (
          pieces.every((piece) => (
            Game.isBishop(piece)
            && piece.location.x % 2 + piece.location.y % 2 === possibleBishopColors[index]
          ))
        ))
      );
    }

    if (
      // king vs king
      pieces[0].length === 1
      && pieces[1].length === 1
    ) {
      return true;
    }

    if (this.isPatrol) {
      return false;
    }

    if (
      // kings vs kings
      pieces[0].every(Game.isKing)
      && pieces[1].every(Game.isKing)
    ) {
      return true;
    }

    if (this.isAtomic || this.isMadrasi || this.isThreeCheck) {
      return false;
    }

    if (
      // king vs king & knight
      pieces[0].length === 1
      && pieces[1].length === 2
      && Game.isKnight(pieces[1][1])
    ) {
      return true;
    }

    const possibleBishopColor = pieces[1][1].location.x % 2 + pieces[1][1].location.y % 2;

    return pieces.every((pieces) => (
      pieces.slice(1).every((piece) => (
        Game.isBishop(piece)
        && piece.location.x % 2 + piece.location.y % 2 === possibleBishopColor
      ))
    ));
  }

  isNoMoves(): boolean {
    return this.getPieces(this.turn).every((piece) => (
      this.getAllowedMoves(piece).length === 0
    ));
  }

  isStalemate(): boolean {
    return !this.isCheck && this.isNoMoves();
  }

  isOngoing(): boolean {
    return this.status === GameStatusEnum.ONGOING;
  }

  changePlayerTime() {
    if (
      this.isOngoing()
      && this.moves.length > this.pliesPerMove
      && this.timeControl
    ) {
      const prevTurn = this.getPrevTurn();
      const isPlayerChanged = this.turn !== prevTurn;
      const player = this.players[this.getPrevTurn()];
      const { duration } = _.last(this.moves)!;

      if (this.timeControl.type === TimeControlEnum.TIMER) {
        player.time! -= duration - (isPlayerChanged ? this.timeControl.increment : 0);
      } else if (isPlayerChanged) {
        player.time = this.timeControl.base;
      } else {
        player.time! -= duration;
      }
    }
  }
}
