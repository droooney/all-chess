import * as _ from 'lodash';
import {
  BaseMove,
  BoardDimensions,
  BoardPiece,
  CastlingTypeEnum,
  CenterSquareParams,
  ChatMessage,
  ColorEnum,
  DarkChessMove,
  Game as IGame,
  GameCreateSettings,
  GameKings,
  GamePlayers,
  GameResult,
  GameStatusEnum,
  GameVariantEnum,
  Move,
  PGNTags,
  Piece,
  PieceBoardLocation,
  PieceLocationEnum,
  PieceTypeEnum,
  PocketPiece,
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

const BISHOP_NEIGHBOR_INCREMENTS: ReadonlyArray<[number, number]> = [
  [-1, -1],
  [-1, +1],
  [+1, -1],
  [+1, +1]
];

const ROOK_NEIGHBOR_INCREMENTS: ReadonlyArray<[number, number]> = [
  [-1, 0],
  [0, -1],
  [0, +1],
  [+1, 0]
];

const STANDARD_PIECES: PieceTypeEnum[] = [
  PieceTypeEnum.KING,
  PieceTypeEnum.QUEEN,
  PieceTypeEnum.ROOK,
  PieceTypeEnum.BISHOP,
  PieceTypeEnum.KNIGHT,
  PieceTypeEnum.PAWN
];

const STANDARD_PIECE_PLACEMENT: PieceTypeEnum[] = [
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

const PARTIAL_STANDARD_STARTING_DATA = {
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
  }
};

const DIGITS_REGEX = /^\d+$/;

const FEN_CASTLING_REGEX = /^[kq]+$/i;

const PGN_TAG_REGEX = /^\[([a-z0-9]+) +"((?:[^"\\]|\\"|\\\\)+)"]$/i;
const PGN_MOVE_REGEX = /^\S+(?=\s|$)/;
const PGN_MOVE_SQUARES_REGEX = /^(?:([A-Z]?)(@?)([₀-₉]*)([a-w]*)(\d*)[x→]?([₀-₉]*)([a-w])(\d+))|O-O(-O)?/;
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
    const isLastChance = _.includes(variants, GameVariantEnum.LAST_CHANCE);
    const isMonsterChess = _.includes(variants, GameVariantEnum.MONSTER_CHESS);
    const isAliceChess = _.includes(variants, GameVariantEnum.ALICE_CHESS);
    const isTwoFamilies = _.includes(variants, GameVariantEnum.TWO_FAMILIES);
    const isChessence = _.includes(variants, GameVariantEnum.CHESSENCE);
    const isHorde = _.includes(variants, GameVariantEnum.HORDE);
    const isDarkChess = _.includes(variants, GameVariantEnum.DARK_CHESS);
    const isAntichess = _.includes(variants, GameVariantEnum.ANTICHESS);
    const isAbsorption = _.includes(variants, GameVariantEnum.ABSORPTION);
    const isFrankfurt = _.includes(variants, GameVariantEnum.FRANKFURT);
    const isCapablanca = _.includes(variants, GameVariantEnum.CAPABLANCA);
    const isAmazons = _.includes(variants, GameVariantEnum.AMAZONS);
    const isThreeCheck = _.includes(variants, GameVariantEnum.THREE_CHECK);

    return ((
      !isKingOfTheHill
      || isAntichess
      || (
        !isLastChance
        && !isDarkChess
      )
    ) && (
      !isMonsterChess
      || (
        !isCrazyhouse
        && !isKingOfTheHill
        && !isAtomic
        && !isCirce
        && !isLastChance
        && !isPatrol
        && !isMadrasi
        && !isAliceChess
        && !isChessence
        && !isHorde
        && !isDarkChess
        && !isAntichess
        && !isAbsorption
        && !isFrankfurt
        && !isCapablanca
        && !isAmazons
        && !isThreeCheck
      )
    ) && (
      !isChessence
      || (
        !is960
        && !isKingOfTheHill
        && !isCirce
        && !isLastChance
        && !isPatrol
        && !isMadrasi
        && !isTwoFamilies
        && !isHorde
        && !isAntichess
        && !isAbsorption
        && !isFrankfurt
        && !isCapablanca
        && !isAmazons
      )
    ) && (
      !isHorde
      || (
        !isKingOfTheHill
        && !isCirce
        && !isLastChance
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
      )
    ) && (
      !isAtomic
      || (
        !isAliceChess
        && !isDarkChess
        && !isAmazons
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
      )
    ) && (
      !isThreeCheck
      || (
        !isDarkChess
      )
    ));
  }

  static chessenceStartingMenSquares: { [color in ColorEnum]: { x: number; y: number; }[] } = (() => {
    const whiteMenStartingCoordinates = [
      [0, 4],
      [1, 3],
      [1, 4],
      [1, 5],
      [2, 3],
      [2, 4]
    ];

    return {
      [ColorEnum.WHITE]: whiteMenStartingCoordinates.map(([y, x]) => ({ x, y })),
      [ColorEnum.BLACK]: whiteMenStartingCoordinates.map(([y, x]) => ({ x: 5 - x, y: 8 - y }))
    };
  })();

  static chessenceStartingData: StartingData = (() => {
    let id = 0;
    const boardWidth = 6;
    const boardHeight = 9;
    const pieces: RealPiece[] = [];
    const whiteVoidSquares = [
      [1, 0],
      [2, 1],
      [3, 3],
      [4, 4]
    ];
    const voidSquares = [
      ...whiteVoidSquares,
      ...whiteVoidSquares.map(([y, x]) => [boardHeight - 1 - y, boardWidth - 1 - x])
    ].map(([y, x]) => ({ board: 0, y, x }));

    [ColorEnum.WHITE, ColorEnum.BLACK].forEach((color) => {
      const startingMenCoordinates = Game.chessenceStartingMenSquares[color];
      const addPiece = (type: PieceTypeEnum, location: RealPieceLocation) => {
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

      addPiece(PieceTypeEnum.KING, {
        type: PieceLocationEnum.BOARD,
        board: 0,
        x: color === ColorEnum.WHITE ? 5 : 0,
        y: color === ColorEnum.WHITE ? 0 : 8
      });

      startingMenCoordinates.forEach(({ x, y }) => {
        addPiece(PieceTypeEnum.MAN, {
          type: PieceLocationEnum.BOARD,
          board: 0,
          x,
          y
        });
      });

      _.times(3, () => {
        addPiece(PieceTypeEnum.MAN, {
          type: PieceLocationEnum.POCKET,
          pieceType: PieceTypeEnum.MAN
        });
      });
    });

    return {
      ...PARTIAL_STANDARD_STARTING_DATA,
      pieces,
      voidSquares,
      emptySquares: []
    };
  })();

  static getBoardDimensions(variants: ReadonlyArray<GameVariantEnum>): BoardDimensions {
    const isChessence = _.includes(variants, GameVariantEnum.CHESSENCE);
    const isAliceChess = _.includes(variants, GameVariantEnum.ALICE_CHESS);
    const isTwoFamilies = _.includes(variants, GameVariantEnum.TWO_FAMILIES);
    const isCapablanca = _.includes(variants, GameVariantEnum.CAPABLANCA);
    const isAmazons = _.includes(variants, GameVariantEnum.AMAZONS);

    return {
      boardCount: isAliceChess ? 2 : 1,
      boardWidth: isChessence
        ? 6
        : isTwoFamilies || isCapablanca || isAmazons
          ? 10
          : 8,
      boardHeight: isChessence ? 9 : 8
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
    const halfBoard = Math.round(boardWidth / 2);
    let id = 0;
    let pieceTypes: PieceTypeEnum[];

    if (_.includes(variants, GameVariantEnum.CHESS_960)) {
      pieceTypes = _.times(boardWidth, () => null!);

      const darkColoredBishopPosition = 2 * Math.floor(halfBoard * Math.random());
      const lightColoredBishopPosition = 2 * Math.floor(halfBoard * Math.random()) + 1;

      pieceTypes[darkColoredBishopPosition] = PieceTypeEnum.BISHOP;
      pieceTypes[lightColoredBishopPosition] = PieceTypeEnum.BISHOP;

      const placePiece = (type: PieceTypeEnum, position: number) => {
        let currentPosition = 0;

        pieceTypes.some((piece, ix) => {
          if (!piece && currentPosition++ === position) {
            pieceTypes[ix] = type;

            return true;
          }

          return false;
        });
      };

      placePiece(PieceTypeEnum.QUEEN, Math.floor((boardWidth - 2) * Math.random()));
      placePiece(PieceTypeEnum.KNIGHT, Math.floor((boardWidth - 3) * Math.random()));
      placePiece(PieceTypeEnum.KNIGHT, Math.floor((boardWidth - 4) * Math.random()));

      if (isTwoFamilies) {
        placePiece(PieceTypeEnum.QUEEN, Math.floor((boardWidth - 5) * Math.random()));
      } else if (isCapablanca || isAmazons) {
        placePiece(PieceTypeEnum.EMPRESS, Math.floor((boardWidth - 5) * Math.random()));
        placePiece(PieceTypeEnum.CARDINAL, Math.floor((boardWidth - 6) * Math.random()));
      }

      const restPieces = [PieceTypeEnum.ROOK, PieceTypeEnum.KING, PieceTypeEnum.ROOK];

      if (isTwoFamilies) {
        restPieces.splice(1, 0, PieceTypeEnum.KING);
      }

      let placedPieces = 0;

      pieceTypes.some((piece, ix) => {
        if (!piece) {
          pieceTypes[ix] = restPieces[placedPieces++];

          if (placedPieces === restPieces.length) {
            return true;
          }
        }

        return false;
      });
    } else if (isTwoFamilies) {
      pieceTypes = TWO_FAMILIES_PIECE_PLACEMENT;
    } else if (isCapablanca || isAmazons) {
      pieceTypes = CAPABLANCA_PIECE_PLACEMENT;
    } else {
      pieceTypes = STANDARD_PIECE_PLACEMENT;
    }

    /*
    pieceTypes = [
      PieceTypeEnum.QUEEN,
      PieceTypeEnum.ROOK,
      PieceTypeEnum.KING,
      PieceTypeEnum.ROOK,
      PieceTypeEnum.BISHOP,
      PieceTypeEnum.BISHOP,
      PieceTypeEnum.KNIGHT,
      PieceTypeEnum.KNIGHT
    ];
    */

    const pieces: RealPiece[] = [];

    [ColorEnum.WHITE, ColorEnum.BLACK].forEach((color) => {
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
          _.times(boardWidth, (x) => {
            addPiece(PieceTypeEnum.PAWN, x, y);
          });
        });

        addPiece(PieceTypeEnum.PAWN, 1, lastPawnRank);
        addPiece(PieceTypeEnum.PAWN, 2, lastPawnRank);

        if (isCapablanca) {
          addPiece(PieceTypeEnum.PAWN, halfBoard - 1, lastPawnRank);
          addPiece(PieceTypeEnum.PAWN, halfBoard, lastPawnRank);
        }

        addPiece(PieceTypeEnum.PAWN, boardWidth - 2, lastPawnRank);
        addPiece(PieceTypeEnum.PAWN, boardWidth - 3, lastPawnRank);
      } else if (isAmazons && color === ColorEnum.WHITE) {
        addPiece(PieceTypeEnum.AMAZON, halfBoard - 2, 0);
        addPiece(PieceTypeEnum.AMAZON, halfBoard - 1, 0);
        addPiece(PieceTypeEnum.AMAZON, halfBoard, 0);
        addPiece(PieceTypeEnum.AMAZON, halfBoard + 1, 0);
      } else {
        const pieceRankY = color === ColorEnum.WHITE ? 0 : boardHeight - 1;
        const pawnRankY = color === ColorEnum.WHITE ? 1 : boardHeight - 2;

        pieceTypes.forEach((type, x) => {
          addPiece(type, x, pieceRankY);
        });

        _.times(boardWidth, (x) => {
          addPiece(PieceTypeEnum.PAWN, x, pawnRankY);
        });
      }
    });

    return {
      ...PARTIAL_STANDARD_STARTING_DATA,
      pieces,
      voidSquares: [],
      emptySquares: []
    };
  }

  static getStartingData(variants: ReadonlyArray<GameVariantEnum>): StartingData {
    const isMonsterChess = _.includes(variants, GameVariantEnum.MONSTER_CHESS);
    const isAliceChess = _.includes(variants, GameVariantEnum.ALICE_CHESS);
    const isChessence = _.includes(variants, GameVariantEnum.CHESSENCE);
    const isAntichess = _.includes(variants, GameVariantEnum.ANTICHESS);
    const boardDimensions = Game.getBoardDimensions(variants);
    let startingData: StartingData;

    if (isChessence) {
      startingData = this.chessenceStartingData;
    } else {
      startingData = this.generateClassicStartingData(boardDimensions, variants);
    }

    startingData = { ...startingData };

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
      startingData.voidSquares = [
        ...startingData.voidSquares,
        ...startingData.voidSquares.map((square) => ({ ...square, board: 1 }))
      ];
      startingData.emptySquares = [
        ...startingData.emptySquares,
        ...startingData.emptySquares.map((square) => ({ ...square, board: 1 }))
      ];

      if (isChessence) {
        pieces = [...pieces];

        const pieceType = PieceTypeEnum.MAN;
        let id = +_.last(startingData.pieces)!.id;

        [ColorEnum.WHITE, ColorEnum.BLACK].forEach((color) => {
          _.times(3, () => {
            pieces.push({
              id: `${++id}`,
              type: pieceType,
              originalType: pieceType,
              color,
              moved: false,
              abilities: null,
              location: {
                type: PieceLocationEnum.POCKET,
                pieceType
              }
            });
          });
        });

        startingData.pieces.forEach((piece, ix) => {
          if (piece.color === ColorEnum.BLACK && piece.location.type === PieceLocationEnum.BOARD) {
            pieces[ix] = {
              ...piece,
              location: {
                ...piece.location,
                board: 1
              }
            };
          }
        });
      }
    }

    if (isAntichess) {
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
      result: null,
      turn: ColorEnum.WHITE,
      startingMoveIndex: 0,
      pliesWithoutCaptureOrPawnMove: 0,
      pieces: [],
      voidSquares: [],
      emptySquares: []
    };
    const isPocketUsed = Game.getIsPocketUsed(variants);
    const isTwoFamilies = _.includes(variants, GameVariantEnum.TWO_FAMILIES);
    const isMonsterChess = _.includes(variants, GameVariantEnum.MONSTER_CHESS);
    const isAliceChess = _.includes(variants, GameVariantEnum.ALICE_CHESS);
    const isHorde = _.includes(variants, GameVariantEnum.HORDE);
    const isAntichess = _.includes(variants, GameVariantEnum.ANTICHESS);
    const isChessence = _.includes(variants, GameVariantEnum.CHESSENCE);
    const fenData = fen.trim().split(/\s+/);
    const boards = fenData.slice(0, boardCount);

    // 5 is turn, possible castling, possible en passant, pliesWithoutCaptureOrPawnMove, startingMoveIndex
    if (fenData.length !== boardCount + 5) {
      throw new Error('Invalid FEN: wrong text blocks count');
    }

    const [
      turnString,
      possibleCastlingString,
      possibleEnPassantString,
      pliesWithoutCaptureOrPawnMoveString,
      startingMoveIndexString
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

    if (possibleCastlingString !== '-' && !isAntichess) {
      startingData.possibleCastling[ColorEnum.WHITE][CastlingTypeEnum.KING_SIDE] = _.includes(possibleCastlingString, 'K');
      startingData.possibleCastling[ColorEnum.WHITE][CastlingTypeEnum.QUEEN_SIDE] = _.includes(possibleCastlingString, 'Q');
      startingData.possibleCastling[ColorEnum.BLACK][CastlingTypeEnum.KING_SIDE] = _.includes(possibleCastlingString, 'k');
      startingData.possibleCastling[ColorEnum.BLACK][CastlingTypeEnum.QUEEN_SIDE] = _.includes(possibleCastlingString, 'q');
    }

    if (possibleEnPassantString !== '-') {
      if (
        isChessence
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
        throw new Error('Invalid FEN: wrong ranks blocks count');
      }

      for (let rank = ranksCount - boardHeight; rank < ranks.length; rank++) {
        const fileData = ranks[rank];
        let file = 0;
        let string = fileData;

        // TODO: fix piece parsing for absorption

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

            // not promoted pawns
            if (piece.type === PieceTypeEnum.PAWN && rank === (piece.color === ColorEnum.WHITE ? boardHeight - 1 : 0)) {
              throw new Error('Invalid FEN: not promoted pawn');
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

        if (file !== boardWidth) {
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
              pieceType: piece.type
            }
          );
        }
      }
    }

    if (
      isAliceChess
      && startingData.pieces.some(({ location }) => (
        location.type === PieceLocationEnum.BOARD
        && startingData.pieces.some(({ location: pieceLocation }) => (
          pieceLocation.type === PieceLocationEnum.BOARD
          && location.x === pieceLocation.x
          && location.y === pieceLocation.y
          && location.board !== pieceLocation.board
        ))
      ))
    ) {
      throw new Error('Invalid FEN: multiple pieces on the same square');
    }

    const whiteKingsCount = startingData.pieces.filter((piece) => (
      piece.color === ColorEnum.WHITE
      && Game.isKing(piece)
    )).length;
    const blackKingsCount = startingData.pieces.filter((piece) => (
      piece.color === ColorEnum.BLACK
      && Game.isKing(piece)
    )).length;

    if (
      whiteKingsCount !== (isHorde ? 0 : isTwoFamilies ? 2 : 1)
      || blackKingsCount !== (isTwoFamilies ? 2 : 1)
    ) {
      throw new Error('Invalid FEN: wrong kings count');
    }

    if (startingData.possibleEnPassant) {
      const { x, y } = startingData.possibleEnPassant.pieceLocation;
      const enPassantPiece = _.find(startingData.pieces, (piece) => (
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
        const variantStrings = trueTagValue.split(/\s+\+\s+/);

        for (let i = 0; i < variantStrings.length; i++) {
          const variant = _.findKey(GAME_VARIANT_PGN_NAMES, (name) => name === variantStrings[i]) as GameVariantEnum | undefined;

          if (!variant) {
            throw new Error('Invalid PGN');
          }

          variants.push(variant);
        }
      } else if (tagName === 'TimeControl') {
        if (trueTagValue !== '-') {
          const values = trueTagValue.split(/\s+\+\s+/);
          const baseString = values[0];
          const base = +(+baseString * 60 * 1000).toFixed(2);

          if (
            (
              values.length !== 1
              && values.length !== 2
            )
            || baseString === '0'
            || !DIGITS_REGEX.test(baseString)
          ) {
            throw new Error('Invalid PGN');
          }

          if (values.length === 1) {
            timeControl = {
              type: TimeControlEnum.CORRESPONDENCE,
              base
            };
          } else {
            const incrementString = values[1];

            if (!DIGITS_REGEX.test(incrementString)) {
              throw new Error('Invalid PGN');
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
      } else {
        pgnTags[tagName] = trueTagValue;
      }
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

        const isComment = movesString.indexOf('{') === 0;

        // comment
        if (isComment) {
          const commentEnd = movesString.indexOf('}');

          if (commentEnd === -1) {
            throw new Error('Invalid PGN');
          }

          movesString = movesString.slice(commentEnd + 1);

          continue;
        }

        // game result
        if (movesString === resultString) {
          break;
        }

        // move index including dots
        if (shouldBeMoveIndex) {
          const moveIndex = Math.floor(game.movesCount / game.pliesPerMove) + 1;
          const moveIndexString = startingData.startingMoveIndex && !wasMoveIndex
            ? `${moveIndex}...`
            : `${moveIndex}.`;

          if (movesString.indexOf(moveIndexString) !== 0) {
            throw new Error('Invalid PGN');
          }

          movesString = movesString.slice(moveIndexString.length);
          shouldBeMoveIndex = false;
          wasMoveIndex = true;

          continue;
        }

        // move
        const moveMatch = movesString.match(PGN_MOVE_REGEX);

        if (!moveMatch) {
          throw new Error('Invalid PGN');
        }

        const moveString = moveMatch[0];
        const moveSquaresMatch = moveString.match(PGN_MOVE_SQUARES_REGEX);

        if (!moveSquaresMatch) {
          throw new Error('Invalid PGN');
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
        const pieceFromLiteral = Game.getPieceFromLiteral(isCastling ? 'K' : pieceLiteral || 'P');

        if (!pieceFromLiteral) {
          throw new Error('Invalid PGN');
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
            throw new Error('Invalid PGN');
          }

          const castlingRooks = game.getCastlingRooks(game.turn);
          const castlingRook = castlingRooks[isQueenSideCastling ? CastlingTypeEnum.QUEEN_SIDE : CastlingTypeEnum.KING_SIDE];

          if (!castlingRook) {
            throw new Error('Invalid PGN');
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
              && game.getAllowedMoves(piece).some((square) => this.areSquaresEqual(square, toSquare))
            );
          });

        if (isDrop ? !pieces.length : pieces.length !== 1) {
          throw new Error('Invalid PGN');
        }

        const piece = pieces[0];
        const toSquare = getToSquare(piece);
        const move: Move = {
          from: piece.location,
          to: toSquare,
          timestamp: 0
        };
        const isPawnPromotion = game.isPawnPromotion(move);

        if (isPawnPromotion) {
          const promotionMatch = moveString.slice(moveSquares.length).match(PGN_PROMOTION_REGEX);

          if (!promotionMatch) {
            throw new Error('Invalid PGN');
          }

          const promotedPiece = Game.getPieceFromLiteral(promotionMatch[1]);

          if (!promotedPiece || !_.includes(game.validPromotions, promotedPiece.type)) {
            throw new Error('Invalid PGN');
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
    return (
      _.includes(variants, GameVariantEnum.CRAZYHOUSE)
      || _.includes(variants, GameVariantEnum.CHESSENCE)
    );
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

  static getRankLiteral(rank: number): number {
    return rank + 1;
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

    if (pieceType === PieceTypeEnum.MAN) {
      return pieceLiterals[PieceTypeEnum.PAWN];
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
          }, absorbedPiece).abilities
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
  static isMan = (piece: Piece): boolean => Game.isPiece(piece, PieceTypeEnum.MAN);

  id: string;
  startingData: StartingData;
  players: GamePlayers = {
    [ColorEnum.WHITE]: null!,
    [ColorEnum.BLACK]: null!
  };
  status: GameStatusEnum = GameStatusEnum.BEFORE_START;
  isCheck: boolean = false;
  result: GameResult | null = null;
  turn: ColorEnum = ColorEnum.WHITE;
  timeControl: TimeControl;
  pgnTags: PGNTags;
  moves: RevertableMove[] = [];
  colorMoves: { [color in ColorEnum]: DarkChessMove[] } = {
    [ColorEnum.WHITE]: [],
    [ColorEnum.BLACK]: []
  };
  movesCount: number = 0;
  chat: ChatMessage[] = [];
  possibleEnPassant: Square | null = null;
  possibleEnPassantPieceLocation: Square | null = null;
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
  teleportUsed: { [color in ColorEnum]: boolean } = {
    [ColorEnum.WHITE]: false,
    [ColorEnum.BLACK]: false
  };
  checksCount: { [color in ColorEnum]: number } = {
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
  isLastChance: boolean;
  isMonsterChess: boolean;
  isAliceChess: boolean;
  isTwoFamilies: boolean;
  isChessence: boolean;
  isHorde: boolean;
  isDarkChess: boolean;
  isAntichess: boolean;
  isAbsorption: boolean;
  isFrankfurt: boolean;
  isCapablanca: boolean;
  isAmazons: boolean;
  isThreeCheck: boolean;
  isLeftInCheckAllowed: boolean;
  pliesPerMove: number;
  boardCount: number;
  boardWidth: number;
  boardHeight: number;
  nullSquares: ReadonlyArray<Square>;
  voidSquares: ReadonlyArray<Square>;
  variants: ReadonlyArray<GameVariantEnum>;
  drawOffer: ColorEnum | null = null;
  takebackRequest: TakebackRequest | null = null;

  constructor(settings: GameCreateSettings & { id: string; pgnTags?: PGNTags; startingData?: StartingData; }) {
    this.id = settings.id;
    this.startingData = settings.startingData || Game.getStartingData(settings.variants);
    ({
      boardCount: this.boardCount,
      boardWidth: this.boardWidth,
      boardHeight: this.boardHeight
    } = Game.getBoardDimensions(settings.variants));
    this.nullSquares = [
      ...this.startingData.voidSquares,
      ...this.startingData.emptySquares
    ];
    this.voidSquares = this.startingData.voidSquares;

    this.pgnTags = settings.pgnTags || {};
    this.timeControl = settings.timeControl;
    this.variants = settings.variants;

    this.isCrazyhouse = _.includes(this.variants, GameVariantEnum.CRAZYHOUSE);
    this.is960 = _.includes(this.variants, GameVariantEnum.CHESS_960);
    this.isKingOfTheHill = _.includes(this.variants, GameVariantEnum.KING_OF_THE_HILL);
    this.isAtomic = _.includes(this.variants, GameVariantEnum.ATOMIC);
    this.isCirce = _.includes(this.variants, GameVariantEnum.CIRCE);
    this.isPatrol = _.includes(this.variants, GameVariantEnum.PATROL);
    this.isMadrasi = _.includes(this.variants, GameVariantEnum.MADRASI);
    this.isLastChance = _.includes(this.variants, GameVariantEnum.LAST_CHANCE);
    this.isMonsterChess = _.includes(this.variants, GameVariantEnum.MONSTER_CHESS);
    this.isAliceChess = _.includes(this.variants, GameVariantEnum.ALICE_CHESS);
    this.isTwoFamilies = _.includes(this.variants, GameVariantEnum.TWO_FAMILIES);
    this.isChessence = _.includes(this.variants, GameVariantEnum.CHESSENCE);
    this.isHorde = _.includes(this.variants, GameVariantEnum.HORDE);
    this.isDarkChess = _.includes(this.variants, GameVariantEnum.DARK_CHESS);
    this.isAntichess = _.includes(this.variants, GameVariantEnum.ANTICHESS);
    this.isAbsorption = _.includes(this.variants, GameVariantEnum.ABSORPTION);
    this.isFrankfurt = _.includes(this.variants, GameVariantEnum.FRANKFURT);
    this.isCapablanca = _.includes(this.variants, GameVariantEnum.CAPABLANCA);
    this.isAmazons = _.includes(this.variants, GameVariantEnum.AMAZONS);
    this.isThreeCheck = _.includes(this.variants, GameVariantEnum.THREE_CHECK);

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

    if (this.isChessence) {
      this.pocketPiecesUsed = [PieceTypeEnum.MAN];
    }

    if (this.isCapablanca) {
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
    this.possibleEnPassant = this.startingData.possibleEnPassant && this.startingData.possibleEnPassant.enPassantSquare;
    this.possibleEnPassantPieceLocation = this.startingData.possibleEnPassant && this.startingData.possibleEnPassant.pieceLocation;
    this.positionString = this.getPositionFen();
    this.positionsMap = {};
    this.positionsMap[this.positionString] = 1;
    this.visiblePieces = {
      [ColorEnum.WHITE]: [],
      [ColorEnum.BLACK]: []
    };
    this.teleportUsed = {
      [ColorEnum.WHITE]: false,
      [ColorEnum.BLACK]: false
    };
    this.checksCount = {
      [ColorEnum.WHITE]: 0,
      [ColorEnum.BLACK]: 0
    };

    if (this.isDarkChess) {
      this.pieces.forEach((piece) => {
        this.visiblePieces[piece.color].push({
          ...piece,
          realId: piece.id
        });
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

        const promotionVisible = isPromotion && fromLocationVisible;

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
    this.movesCount++;

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
    const toPiece = this.getBoardPiece(toLocation);
    const isEnPassant = (
      fromLocation.type === PieceLocationEnum.BOARD
      && Game.isPawn(piece)
      && Math.abs(fromLocation.x - toX) !== 0
      && !toPiece
      && !!this.possibleEnPassant
    );
    const opponentColor = this.getOpponentColor();
    const opponentPiece = isEnPassant
      ? this.getBoardPiece(this.possibleEnPassantPieceLocation!)
      : toPiece && toPiece.color === opponentColor
        ? toPiece
        : null;
    const isCapture = !!opponentPiece;
    const disappearedOrMovedPieces: BoardPiece[] = [];
    const isPawnPromotion = this.isPawnPromotion(move);
    const wasKing = Game.isKing(piece);
    const isMainPieceMovedOrDisappeared = this.isAtomic && isCapture;
    const isTeleportMove = this.isTeleportMove(move);
    const isCastling = this.isCastling(move);
    const isKingSideCastling = isCastling && toX - (fromLocation as PieceBoardLocation).x > 0;
    const castlingRook = isCastling
      ? this.is960
        ? toPiece
        : this.getBoardPiece({ ...toLocation, x: isKingSideCastling ? this.boardWidth - 1 : 0 })
      : null;

    const prevTurn = this.turn;
    const nextTurn = this.getNextTurn();
    const prevIsCheck = this.isCheck;
    const prevPliesWithoutCaptureOrPawnMove = this.pliesWithoutCaptureOrPawnMove;
    const prevPositionString = this.positionString;
    const prevPossibleEnPassant = this.possibleEnPassant;
    const prevPossibleEnPassantPieceLocation = this.possibleEnPassantPieceLocation;
    const prevTeleportUsed = this.teleportUsed[this.turn];
    const prevChecksCount = this.checksCount[nextTurn];
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
          y: toY + incrementY,
          x: toX + incrementX
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

        const otherBoardsToDropPiece = this.getAllowedMoves(piece).some(({ board, x, y }) => (
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
              && this.getAllowedMoves(otherPawn).some(({ x, y }) => x === toX && y === toY)
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
              && this.getAllowedMoves(otherPiece).some(({ x, y }) => x === toX && y === toY)
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

        if (isTeleportMove) {
          algebraic += '→';
          figurine += '→';
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

    if (isTeleportMove) {
      this.teleportUsed[this.turn] = true;
    }

    if (
      !this.isDarkChess
      && fromLocation.type === PieceLocationEnum.BOARD
      && Game.isPawn(piece)
      && Math.abs(toY - fromLocation.y) > 1
      && fromLocation.board === toBoard
      && fromLocation.y === (this.turn === ColorEnum.WHITE ? 1 : this.boardHeight - 2)
      && (
        !this.isMonsterChess
        || this.movesCount % 3 !== 1
      )
    ) {
      this.possibleEnPassant = {
        board: toBoard,
        x: toX,
        y: Math.round((toY + fromLocation.y) / 2)
      };
      this.possibleEnPassantPieceLocation = this.isAliceChess
        ? { ...newLocation, board: this.getNextBoard(toBoard) }
        : newLocation;
    } else {
      this.possibleEnPassant = null;
      this.possibleEnPassantPieceLocation = null;
    }

    if (fromLocation.type === PieceLocationEnum.BOARD) {
      (piece as Piece).location = null;
    } else {
      piece.location = newLocation;
    }

    if (!isMainPieceMovedOrDisappeared) {
      piece.moved = fromLocation.type === PieceLocationEnum.BOARD;
      piece.type = isPawnPromotion
        ? promotion!
        : piece.type;
      piece.originalType = this.isCrazyhouse
        ? piece.originalType
        : piece.type;
      piece.location = newLocation;

      if (this.isAbsorption && isCapture) {
        const {
          type,
          abilities
        } = Game.getPieceTypeAfterAbsorption(piece, opponentPiece!);

        piece.type = type;
        piece.originalType = type;
        piece.abilities = abilities;
      } else if (this.isFrankfurt && isCapture) {
        const isRoyalKing = Game.isKing(piece) && !this.isAntichess;
        const isOpponentPieceKing = Game.isKing(opponentPiece!);
        const newPieceType = isPawnPromotion
          ? piece.type
          : isRoyalKing || isOpponentPieceKing
            ? PieceTypeEnum.KING
            : opponentPiece!.type;
        const newAbilities = isRoyalKing
          ? isOpponentPieceKing
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
          pieceType
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
    const isTurnedKing = Game.isKing(piece) && !wasKing;
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

    if (this.isCheck) {
      this.checksCount[nextTurn]++;
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
        this.possibleEnPassantPieceLocation = prevPossibleEnPassantPieceLocation;
        this.teleportUsed[this.turn] = prevTeleportUsed;
        this.checksCount[nextTurn] = prevChecksCount;
        this.movesCount--;

        if (oldPositionRepetitions) {
          this.positionsMap[positionString] = oldPositionRepetitions;
        } else {
          delete this.positionsMap[positionString];
        }

        if (isTurnedKing) {
          this.kings[prevTurn].pop();
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

          if (this.isVoidSquare(square)) {
            putEmptySpacesIfNeeded();

            rankString += '-';
          } else {
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
      ? Game.getFileLiteral(this.possibleEnPassant.x) + Game.getRankLiteral(this.possibleEnPassant.y)
      : '-';
  }

  getPositionFen(): string {
    const piecesFen = this.getFenPieces();
    const castlingFen = this.getFenPossibleCastling();
    const turnFen = this.getFenTurn();
    const enPassantFen = this.getFenEnPassant();

    // TODO: add teleport used and checks count

    return `${piecesFen} ${turnFen} ${castlingFen} ${enPassantFen}`;
  }

  getFen(): string {
    const piecesFen = this.getFenPieces();
    const castlingFen = this.getFenPossibleCastling();
    const turnFen = this.getFenTurn();
    const enPassantFen = this.getFenEnPassant();
    const pliesCountFen = this.pliesWithoutCaptureOrPawnMove;
    const moveIndexFen = Math.floor(this.movesCount / this.pliesPerMove) + 1;

    // TODO: add teleport used and checks count

    return `${piecesFen} ${turnFen} ${castlingFen} ${enPassantFen} ${pliesCountFen} ${moveIndexFen}`;
  }

  getNextTurn(): ColorEnum {
    return this.movesCount % this.pliesPerMove === this.pliesPerMove - 1
      ? ColorEnum.BLACK
      : ColorEnum.WHITE;
  }

  getPrevTurn(): ColorEnum {
    return this.movesCount % this.pliesPerMove === 0
      ? ColorEnum.BLACK
      : ColorEnum.WHITE;
  }

  getCenterSquareParams(square: Square): CenterSquareParams {
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

  getPossibleMoves(piece: RealPiece, options: PossibleMovesOptions = {}): Square[] {
    const {
      onlyAttacked = false,
      onlyControlled = false,
      onlyVisible = false,
      onlyPossible = false
    } = options;
    const forMove = !onlyControlled && !onlyAttacked && !onlyVisible && !onlyPossible;
    const getSquaresForDrop = (pieceType: PieceTypeEnum): Square[] => {
      return _.times(this.boardCount).reduce((possibleSquares, board) => (
        _.times(this.boardHeight).reduce((possibleSquares, rankY) => {
          let newSquares: Square[] = [];

          if (
            (rankY !== 0 && rankY !== this.boardHeight - 1)
            || pieceType !== PieceTypeEnum.PAWN
          ) {
            newSquares = _
              .times(this.boardWidth, (fileX) => ({
                board,
                x: fileX,
                y: rankY
              }))
              .filter((square) => (
                (
                  !this.isChessence
                  || Game.chessenceStartingMenSquares[piece.color].some(({ x, y }) => y === square.y && x === square.x)
                )
                && (
                  !this.isDarkChess
                  || this.getVisibleSquares(piece.color).some((visibleSquare) => Game.areSquaresEqual(square, visibleSquare))
                )
                && _.times(this.boardCount).every((board) => (
                  !this.getBoardPiece({
                    ...square,
                    board
                  })
                ))
              ));
          }

          return [
            ...possibleSquares,
            ...newSquares
          ];
        }, possibleSquares)
      ), [] as Square[]);
    };

    if (piece.location.type === PieceLocationEnum.POCKET) {
      return getSquaresForDrop(piece.location.pieceType);
    }

    if (this.isPatrol && onlyAttacked && !this.isPatrolledByFriendlyPiece(piece as BoardPiece)) {
      return [];
    }

    const {
      color: pieceColor,
      type: pieceType
    } = piece;
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
    let possibleSquares: Square[] = [];
    const traverseDirection = (incrementY: 0 | 1 | -1, incrementX: 0 | 1 | -1, stopAfter: number) => {
      let rankY = pieceY;
      let fileX = pieceX;
      let iterations = 0;

      while (true) {
        rankY += incrementY;
        fileX += incrementX;

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
            possibleSquares.push(square);
          }

          break;
        }

        if (isKing && forMove && !this.isLeftInCheckAllowed && this.isAttackedByOpponentPiece(square, opponentColor)) {
          break;
        }

        possibleSquares.push(square);

        if (pieceInSquare) {
          break;
        }

        if (++iterations === stopAfter) {
          break;
        }
      }
    };

    if (onlyVisible) {
      possibleSquares.push({ board, x: pieceX, y: pieceY });
    }

    if (Game.isKing(piece) && this.isChessence) {
      if (onlyVisible) {
        possibleSquares.push(
          ...Game.chessenceStartingMenSquares[pieceColor].map(({ x, y }) => ({ board, x, y }))
        );
      }

      return possibleSquares;
    }

    const isKing = Game.isKing(piece);
    const isKingMove = isKing && (!this.isFrankfurt || !piece.abilities);
    const isAmazon = Game.isAmazon(piece);
    const isQueen = Game.isQueen(piece);
    const isEmpress = Game.isEmpress(piece);
    const isCardinal = Game.isCardinal(piece);
    const isPawn = Game.isPawn(piece);
    const isMan = Game.isMan(piece);
    let isBishop = Game.isBishop(piece);
    let isRook = Game.isRook(piece);
    let isKnight = Game.isKnight(piece);

    if (isMan) {
      const isFriendlyMan = ([incrementY, incrementX]: [number, number]): boolean => {
        const pieceInSquare = this.getBoardPiece({
          board,
          y: pieceY + incrementY,
          x: pieceX + incrementX
        });

        return (
          !!pieceInSquare
          && pieceInSquare.color === pieceColor
          && pieceInSquare.type === pieceType
        );
      };

      isRook = ROOK_NEIGHBOR_INCREMENTS.some(isFriendlyMan);
      isBishop = BISHOP_NEIGHBOR_INCREMENTS.some(isFriendlyMan);
      isKnight = KNIGHT_MOVE_INCREMENTS.some(isFriendlyMan);
    }

    if (isKingMove || isAmazon || isQueen || isEmpress || isRook) {
      const stopAfter = isKingMove && !isAmazon && !isQueen && !isEmpress && !isRook
        ? 1
        : Infinity;

      traverseDirection(+1, 0, stopAfter);
      traverseDirection(-1, 0, stopAfter);
      traverseDirection(0, +1, stopAfter);
      traverseDirection(0, -1, stopAfter);
    }

    if (isKingMove || isAmazon || isQueen || isCardinal || isBishop) {
      const stopAfter = isKingMove && !isAmazon && !isQueen && !isCardinal && !isBishop
        ? 1
        : Infinity;

      traverseDirection(+1, +1, stopAfter);
      traverseDirection(+1, -1, stopAfter);
      traverseDirection(-1, +1, stopAfter);
      traverseDirection(-1, -1, stopAfter);
    }

    if (isAmazon || isEmpress || isCardinal || isKnight) {
      KNIGHT_MOVE_INCREMENTS.forEach(([incrementY, incrementX]) => {
        const rankY = pieceY + incrementY;
        const fileX = pieceX + incrementX;
        const square = {
          board,
          x: fileX,
          y: rankY
        };

        if (this.isNullSquare(square)) {
          return;
        }

        const pieceInSquare = this.getBoardPiece(square);

        if ((!forMove && !onlyPossible) || !pieceInSquare || pieceInSquare.color !== pieceColor) {
          possibleSquares.push(square);
        }
      });
    }

    if (isPawn) {
      const direction = pieceColor === ColorEnum.WHITE ? 1 : -1;
      const rankY = pieceY + direction;
      const square = {
        board,
        x: pieceX,
        y: rankY
      };

      if ((forMove || onlyPossible || onlyVisible) && !this.isNullSquare(square)) {
        // 1-forward move
        const pieceInSquare = this.getBoardPiece(square);

        if (!pieceInSquare || onlyVisible) {
          possibleSquares.push(square);

          if (
            !pieceInSquare && (
              (pieceColor === ColorEnum.WHITE ? pieceY === 1 : pieceY === this.boardHeight - 2)
              || (pieceColor === ColorEnum.WHITE && this.isHorde && pieceY === 0)
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
              possibleSquares.push(square);
            }
          }
        }
      }

      [1, -1].forEach((incrementX) => {
        // capture
        const fileX = pieceX + incrementX;
        const square = {
          board,
          x: fileX,
          y: rankY
        };

        if (!this.isNullSquare(square)) {
          const pieceInSquare = this.getBoardPiece(square);

          if (
            (!forMove && !onlyPossible)
            || (pieceInSquare && pieceInSquare.color !== pieceColor)
            || (captureAllowed && this.possibleEnPassant && Game.areSquaresEqual(square, this.possibleEnPassant))
          ) {
            possibleSquares.push(square);
          }
        }
      });
    }

    if (
      (forMove || onlyPossible)
      && isKing
      && this.isLastChance
      && (
        this.isLeftInCheckAllowed
        || !this.isAttackedByOpponentPiece(piece.location, opponentColor)
      )
      && !this.teleportUsed[pieceColor]
    ) {
      possibleSquares.push(
        ...getSquaresForDrop(pieceType).filter((square) => square.board === board)
      );
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

          possibleSquares.push({
            board,
            x: this.is960
              ? rookLocation.x
              : isKingSideRook
                ? this.boardWidth - 2
                : 2,
            y: pieceY
          });
        });
    }

    if (
      (forMove || onlyControlled)
      && this.isMadrasi
      && this.isParalysed(piece, possibleSquares)
    ) {
      return [];
    }

    if (this.isAliceChess && (forMove || onlyPossible)) {
      // a piece cannot move to a square that is occupied on the next board
      possibleSquares = possibleSquares.filter((square) => (
        _.times(this.boardCount - 1).every((board) => (
          !this.getBoardPiece({
            ...square,
            board: this.getNextBoard(square.board + board)
          })
        ))
      ));
    }

    if (!captureAllowed) {
      return possibleSquares.filter((square) => {
        const pieceInSquare = this.getBoardPiece(square);

        return (
          !pieceInSquare
          || pieceInSquare.color === pieceColor
        );
      });
    }

    return possibleSquares;
  }

  getAllowedMoves(piece: RealPiece): Square[] {
    const possibleMoves = this.getPossibleMoves(piece);

    if (this.isAntichess) {
      return this.hasCapturePieces(piece.color)
        ? possibleMoves.filter(this.isCaptureMove(piece))
        : possibleMoves;
    }

    if (this.isLeftInCheckAllowed && !this.isAtomic) {
      return possibleMoves;
    }

    return possibleMoves.filter((square) => {
      const { allowed, revertMove } = this.performMove({
        from: piece.location,
        to: square,
        timestamp: 0,
        promotion: PieceTypeEnum.QUEEN
      }, { checkIfAllowed: true });

      revertMove();

      return allowed;
    });
  }

  getVisibleSquares(forColor: ColorEnum): Square[] {
    let visibleSquares: Square[] = [];

    if (this.isChessence) {
      visibleSquares = _.times(this.boardCount).reduce((squares, board) => [
        ...squares,
        ...Game.chessenceStartingMenSquares[forColor].map(({ x, y }) => ({ board, x, y }))
      ], [] as Square[]);
    }

    return this.getPieces(forColor)
      .filter(Game.isBoardPiece)
      .reduce((squares, piece) => {
        let newSquares = this.getPossibleMoves(piece, { onlyVisible: true });

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
      }, visibleSquares);
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

  isParalysed(piece: RealPiece, possibleSquares?: Square[]): boolean {
    return (
      piece.location.type === PieceLocationEnum.BOARD
      && (possibleSquares || this.getPossibleMoves(piece, { onlyPossible: true })).some((square) => {
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
      || square.board >= this.boardCount
      || square.y < 0
      || square.y >= this.boardHeight
      || square.x < 0
      || square.x >= this.boardWidth
      || this.nullSquares.some((nullSquare) => (
        Game.areSquaresEqual(square, nullSquare)
      ))
    );
  }

  isVoidSquare(square: Square): boolean {
    return this.voidSquares.some((voidSquare) => (
      Game.areSquaresEqual(square, voidSquare)
    ));
  }

  isPawnPromotion(move: BaseMove): boolean {
    const {
      from: fromLocation,
      to: {
        y: toY
      }
    } = move;
    const piece = fromLocation.type === PieceLocationEnum.BOARD
      ? this.getBoardPiece(fromLocation)
      : null;

    return (
      !!piece
      && Game.isPawn(piece)
      && ((
        piece.color === ColorEnum.WHITE && toY === this.boardHeight - 1
      ) || (
        piece.color === ColorEnum.BLACK && toY === 0
      ))
    );
  }

  isTeleportMove(move: BaseMove): boolean {
    if (!this.isLastChance) {
      return false;
    }

    const {
      from: fromLocation,
      to: toLocation
    } = move;
    const piece = fromLocation.type === PieceLocationEnum.BOARD
      ? this.getBoardPiece(fromLocation)
      : null;

    if (!piece || !Game.isKing(piece) || this.teleportUsed[piece.color]) {
      return false;
    }

    this.teleportUsed[piece.color] = true;

    const isTeleportMove = this.getAllowedMoves(piece).every((square) => !Game.areSquaresEqual(square, toLocation));

    this.teleportUsed[piece.color] = false;

    return isTeleportMove;
  }

  isCastling(move: BaseMove): boolean {
    if (this.isTeleportMove(move)) {
      return false;
    }

    const {
      from: fromLocation,
      to: toLocation
    } = move;
    const piece = fromLocation.type === PieceLocationEnum.BOARD
      ? this.getBoardPiece(fromLocation)
      : null;

    if (!piece || !Game.isKing(piece) || fromLocation.type !== PieceLocationEnum.BOARD || piece.moved) {
      return false;
    }

    const toPiece = this.getBoardPiece(toLocation);

    if (this.is960) {
      return (
        !!toPiece
        && toPiece.color === piece.color
        && Game.isRook(toPiece)
      );
    }

    return Math.abs(toLocation.x - fromLocation.x) > 1;
  }

  isCaptureMove(piece: RealPiece): (square: Square) => boolean {
    return (square) => {
      const pieceInSquare = this.getBoardPiece(square);

      return (
        !!pieceInSquare
        && pieceInSquare.color !== piece.color
      ) || (
        !!this.possibleEnPassant
        && Game.isPawn(piece)
        && Game.areSquaresEqual(square, this.possibleEnPassant)
      );
    };
  }

  hasCapturePieces(color: ColorEnum): boolean {
    const allPossibleMoves = this.getPieces(color).reduce((squares, piece) => [
      ...squares,
      { piece, squares: this.getPossibleMoves(piece) }
    ], [] as { piece: RealPiece; squares: Square[]; }[]);

    return allPossibleMoves.some(({ piece, squares }) => squares.some(this.isCaptureMove(piece)));
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
      && this.getPossibleMoves(piece, { onlyAttacked: true }).some((possibleSquare) => (
        Game.areSquaresEqual(possibleSquare, square)
      ))
    ));
  }

  isPatrolledByFriendlyPiece(piece: BoardPiece): boolean {
    const pieceLocation = piece.location;

    return this.getPieces(piece.color).some((piece) => (
      Game.isBoardPiece(piece)
      && this.getPossibleMoves(piece, { onlyControlled: true }).some((square) => (
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

    if (this.isChessence && this.isStalemate()) {
      return {
        winner: prevTurn,
        reason: ResultReasonEnum.STALEMATE
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

    if (this.isThreeCheck && this.checksCount[this.turn] === 3) {
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

    if (
      this.isAntichess
      && !this.isNoPieces(prevTurn)
      && this.getPieces(currentTurn).every((piece) => (
        this.getAllowedMoves(piece).every((square) => {
          const { isCapture, revertMove } = this.performMove({
            from: piece.location,
            to: square,
            timestamp: 0,
            promotion: PieceTypeEnum.QUEEN
          });
          const isStalemate = !isCapture && this.isStalemate();

          revertMove();

          return isStalemate;
        })
      ))
    ) {
      return {
        winner: prevTurn,
        reason: ResultReasonEnum.STALEMATE
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
}
