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
  StartingData,
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

interface ParseFenOptions {
  boardCount?: number;
  boardWidth?: number;
  boardHeight?: number;
  variants: GameVariantEnum[];
}

type CastlingRookCoordinates = {
  [castling in CastlingTypeEnum]: Square | null;
};

const ATOMIC_SQUARE_INCREMENTS: [number, number][] = [
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

const KNIGHT_MOVE_INCREMENTS: [number, number][] = [
  [-2, -1],
  [-2, +1],
  [-1, -2],
  [-1, +2],
  [+1, -2],
  [+1, +2],
  [+2, -1],
  [+2, +1]
];

const BISHOP_NEIGHBOR_INCREMENTS: [number, number][] = [
  [-1, -1],
  [-1, +1],
  [+1, -1],
  [+1, +1]
];

const ROOK_NEIGHBOR_INCREMENTS: [number, number][] = [
  [-1, 0],
  [0, -1],
  [0, +1],
  [+1, 0]
];

const CLASSIC_PIECE_PLACEMENT = [
  PieceTypeEnum.ROOK,
  PieceTypeEnum.KNIGHT,
  PieceTypeEnum.BISHOP,
  PieceTypeEnum.QUEEN,
  PieceTypeEnum.KING,
  PieceTypeEnum.BISHOP,
  PieceTypeEnum.KNIGHT,
  PieceTypeEnum.ROOK
];

const CLASSIC_VALID_PROMOTIONS = [
  PieceTypeEnum.QUEEN,
  PieceTypeEnum.ROOK,
  PieceTypeEnum.BISHOP,
  PieceTypeEnum.KNIGHT
];

const partialStandardStartingData = {
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

const CASTLING_FEN_REGEX = /^[kq]+$/i;
const DIGITS_REGEX = /^\d+$/;
const PGN_TAG_REGEX = /^\[([a-z0-9]+) +"((?:[^"\\]|\\"|\\\\)+)"]$/i;
const MOVE_REGEX = /^\S+(?=\s|$)/;
const MOVE_SQUARES_MATCH = /^(?:([A-Z]?)(@?)([₀-₉]*)([a-w]*)(\d*)[x→]?([₀-₉]*)([a-w])(\d+))|O-O(-O)?/;
const PROMOTION_REGEX = /^=([A-Z])/;
const SQUARE_REGEX = /^[a-w]\d+$/;

export class Game implements IGame {
  static validateVariants(variants: GameVariantEnum[]): boolean {
    return ((
      !_.includes(variants, GameVariantEnum.KING_OF_THE_HILL)
      || !_.includes(variants, GameVariantEnum.LAST_CHANCE)
    ) && (
      !_.includes(variants, GameVariantEnum.MONSTER_CHESS)
      || (
        !_.includes(variants, GameVariantEnum.CRAZYHOUSE)
        && !_.includes(variants, GameVariantEnum.KING_OF_THE_HILL)
        && !_.includes(variants, GameVariantEnum.ATOMIC)
        && !_.includes(variants, GameVariantEnum.CIRCE)
        && !_.includes(variants, GameVariantEnum.LAST_CHANCE)
        && !_.includes(variants, GameVariantEnum.PATROL)
        && !_.includes(variants, GameVariantEnum.MADRASI)
        && !_.includes(variants, GameVariantEnum.ALICE_CHESS)
        && !_.includes(variants, GameVariantEnum.CHESSENCE)
        && !_.includes(variants, GameVariantEnum.HORDE)
        && !_.includes(variants, GameVariantEnum.DARK_CHESS)
      )
    ) && (
      !_.includes(variants, GameVariantEnum.CHESSENCE)
      || (
        !_.includes(variants, GameVariantEnum.CHESS_960)
        && !_.includes(variants, GameVariantEnum.KING_OF_THE_HILL)
        && !_.includes(variants, GameVariantEnum.CIRCE)
        && !_.includes(variants, GameVariantEnum.LAST_CHANCE)
        && !_.includes(variants, GameVariantEnum.PATROL)
        && !_.includes(variants, GameVariantEnum.MADRASI)
        && !_.includes(variants, GameVariantEnum.TWO_FAMILIES)
        && !_.includes(variants, GameVariantEnum.HORDE)
      )
    ) && (
      !_.includes(variants, GameVariantEnum.HORDE)
      || (
        !_.includes(variants, GameVariantEnum.KING_OF_THE_HILL)
        && !_.includes(variants, GameVariantEnum.CIRCE)
        && !_.includes(variants, GameVariantEnum.LAST_CHANCE)
        && !_.includes(variants, GameVariantEnum.PATROL)
        && !_.includes(variants, GameVariantEnum.MADRASI)
        && !_.includes(variants, GameVariantEnum.ALICE_CHESS)
        && !_.includes(variants, GameVariantEnum.ATOMIC)
        && !_.includes(variants, GameVariantEnum.CRAZYHOUSE)
        && !_.includes(variants, GameVariantEnum.DARK_CHESS)
      )
    ) && (
      !_.includes(variants, GameVariantEnum.DARK_CHESS)
      || (
        !_.includes(variants, GameVariantEnum.KING_OF_THE_HILL)
        && !_.includes(variants, GameVariantEnum.ATOMIC)
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
      const getPiece = (type: PieceTypeEnum, location: RealPieceLocation): RealPiece => ({
        id: `${++id}`,
        type,
        originalType: type,
        color,
        moved: false,
        location
      } as RealPiece);

      pieces.push(getPiece(PieceTypeEnum.KING, {
        type: PieceLocationEnum.BOARD,
        board: 0,
        x: color === ColorEnum.WHITE ? 5 : 0,
        y: color === ColorEnum.WHITE ? 0 : 8
      }));

      startingMenCoordinates.forEach(({ x, y }) => {
        pieces.push(getPiece(PieceTypeEnum.MAN, {
          type: PieceLocationEnum.BOARD,
          board: 0,
          x,
          y
        }));
      });

      _.times(3, () => {
        pieces.push(getPiece(PieceTypeEnum.MAN, {
          type: PieceLocationEnum.POCKET,
          pieceType: PieceTypeEnum.MAN
        }));
      });
    });

    return {
      ...partialStandardStartingData,
      pieces,
      voidSquares,
      emptySquares: []
    };
  })();

  static hordeStartingData: StartingData = (() => {
    let id = 0;
    const boardWidth = 8;
    const boardHeight = 8;
    const pieces: RealPiece[] = [];

    [ColorEnum.WHITE, ColorEnum.BLACK].forEach((color) => {
      const getPiece = (type: PieceTypeEnum, x: number, y: number): BoardPiece => ({
        id: `${++id}`,
        type,
        originalType: type,
        color,
        moved: false,
        location: {
          type: PieceLocationEnum.BOARD,
          board: 0,
          x,
          y
        }
      });

      if (color === ColorEnum.BLACK) {
        CLASSIC_PIECE_PLACEMENT.forEach((type, x) => {
          pieces.push(getPiece(type, x, boardHeight - 1));
        });

        _.times(boardWidth, (x) => {
          pieces.push(getPiece(PieceTypeEnum.PAWN, x, boardHeight - 2));
        });
      } else {
        const lastPawnRank = 4;

        _.times(lastPawnRank, (y) => {
          _.times(boardWidth, (x) => {
            pieces.push(getPiece(PieceTypeEnum.PAWN, x, y));
          });
        });

        pieces.push(getPiece(PieceTypeEnum.PAWN, 1, lastPawnRank));
        pieces.push(getPiece(PieceTypeEnum.PAWN, 2, lastPawnRank));
        pieces.push(getPiece(PieceTypeEnum.PAWN, boardWidth - 2, lastPawnRank));
        pieces.push(getPiece(PieceTypeEnum.PAWN, boardWidth - 3, lastPawnRank));
      }
    });

    return {
      ...partialStandardStartingData,
      pieces,
      voidSquares: [],
      emptySquares: []
    };
  })();

  static getBoardDimensions(variants: GameVariantEnum[]): BoardDimensions {
    const isChessence = _.includes(variants, GameVariantEnum.CHESSENCE);

    return {
      boardCount: _.includes(variants, GameVariantEnum.ALICE_CHESS) ? 2 : 1,
      boardWidth: isChessence
        ? 6
        : _.includes(variants, GameVariantEnum.TWO_FAMILIES)
          ? 10
          : 8,
      boardHeight: isChessence ? 9 : 8
    };
  }

  static generateClassicStartingData(boardWidth: number, boardHeight: number, isRandom: boolean): StartingData {
    let id = 0;
    let pieceTypes: PieceTypeEnum[];

    if (isRandom) {
      pieceTypes = _.times(boardWidth, () => null!);

      const halfBoard = Math.round(boardWidth / 2);
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

      if (boardWidth === 10) {
        placePiece(PieceTypeEnum.QUEEN, Math.floor((boardWidth - 5) * Math.random()));
      }

      const restPieces = [PieceTypeEnum.ROOK, PieceTypeEnum.KING, PieceTypeEnum.ROOK];

      if (boardWidth === 10) {
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
    } else if (boardWidth === 10) {
      pieceTypes = [
        ...CLASSIC_PIECE_PLACEMENT.slice(0, 4),
        PieceTypeEnum.KING,
        PieceTypeEnum.QUEEN,
        ...CLASSIC_PIECE_PLACEMENT.slice(4)
      ];
    } else {
      pieceTypes = CLASSIC_PIECE_PLACEMENT;
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
      const pieceRankY = color === ColorEnum.WHITE ? 0 : boardHeight - 1;
      const pawnRankY = color === ColorEnum.WHITE ? 1 : boardHeight - 2;
      const getPiece = (type: PieceTypeEnum, x: number, y: number): BoardPiece => ({
        id: `${++id}`,
        type,
        originalType: type,
        color,
        moved: false,
        location: {
          type: PieceLocationEnum.BOARD,
          board: 0,
          x,
          y
        }
      });

      pieceTypes.forEach((type, x) => {
        pieces.push(getPiece(type, x, pieceRankY));
      });

      _.times(boardWidth, (x) => {
        pieces.push(getPiece(PieceTypeEnum.PAWN, x, pawnRankY));
      });
    });

    return {
      ...partialStandardStartingData,
      pieces,
      voidSquares: [],
      emptySquares: []
    };
  }

  static getStartingData(variants: GameVariantEnum[]): StartingData {
    const boardDimensions = Game.getBoardDimensions(variants);
    let startingData: StartingData;

    if (_.includes(variants, GameVariantEnum.CHESSENCE)) {
      startingData = this.chessenceStartingData;
    } else if (_.includes(variants, GameVariantEnum.HORDE)) {
      startingData = this.hordeStartingData;
    } else {
      startingData = this.generateClassicStartingData(
        boardDimensions.boardWidth,
        boardDimensions.boardHeight,
        _.includes(variants, GameVariantEnum.CHESS_960)
      );
    }

    startingData = { ...startingData };

    if (_.includes(variants, GameVariantEnum.MONSTER_CHESS)) {
      const halfWidth = Math.round(boardDimensions.boardWidth / 2);
      const left = Math.ceil(halfWidth / 2);
      const right = boardDimensions.boardWidth - Math.floor(halfWidth / 2);

      startingData.pieces = [...startingData.pieces];

      for (let i = startingData.pieces.length - 1; i >= 0; i--) {
        const piece = startingData.pieces[i];

        if (
          piece
          && piece.color === ColorEnum.WHITE
          && piece.location.type === PieceLocationEnum.BOARD
          && piece.type !== PieceTypeEnum.KING
          && (
            piece!.type !== PieceTypeEnum.PAWN
            || piece.location.x < left
            || piece.location.x >= right
          )
        ) {
          startingData.pieces.splice(i, 1);
        }
      }
    }

    if (_.includes(variants, GameVariantEnum.ALICE_CHESS)) {
      startingData.voidSquares = [
        ...startingData.voidSquares,
        ...startingData.voidSquares.map((square) => ({ ...square, board: 1 }))
      ];
      startingData.emptySquares = [
        ...startingData.emptySquares,
        ...startingData.emptySquares.map((square) => ({ ...square, board: 1 }))
      ];

      if (_.includes(variants, GameVariantEnum.CHESSENCE)) {
        startingData.pieces = [...startingData.pieces];

        const pieceType = PieceTypeEnum.MAN;
        let id = +_.last(startingData.pieces)!.id;

        [ColorEnum.WHITE, ColorEnum.BLACK].forEach((color) => {
          _.times(3, () => {
            startingData.pieces.push({
              id: `${++id}`,
              type: pieceType,
              originalType: pieceType,
              color,
              moved: false,
              location: {
                type: PieceLocationEnum.POCKET,
                pieceType
              }
            });
          });
        });

        startingData.pieces.forEach((piece, ix) => {
          if (piece.color === ColorEnum.BLACK && piece.location.type === PieceLocationEnum.BOARD) {
            startingData.pieces[ix] = {
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

    return startingData;
  }

  static getStartingDataFromFen(fen: string, options: ParseFenOptions): StartingData {
    const {
      boardCount = 1,
      boardWidth = 8,
      boardHeight = 8
    } = options;
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
      turn: ColorEnum.WHITE,
      startingMoveIndex: 0,
      pliesWithoutCaptureOrPawnMove: 0,
      pieces: [],
      voidSquares: [],
      emptySquares: []
    };
    const isPocketUsed = Game.getIsPocketUsed(options.variants);
    const isTwoFamilies = _.includes(options.variants, GameVariantEnum.TWO_FAMILIES);
    const isMonsterChess = _.includes(options.variants, GameVariantEnum.MONSTER_CHESS);
    const isAliceChess = _.includes(options.variants, GameVariantEnum.ALICE_CHESS);
    const isHorde = _.includes(options.variants, GameVariantEnum.HORDE);
    const fenData = fen.trim().split(/\s+/);
    const boards = fenData.slice(0, boardCount);
    const invalidFenError = new Error('Invalid FEN');

    // 5 is turn, possible castling, possible en passant, pliesWithoutCaptureOrPawnMove, startingMoveIndex
    if (fenData.length !== boardCount + 5) {
      throw invalidFenError;
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
      throw invalidFenError;
    }

    startingData.turn = turnString === 'b' ? ColorEnum.BLACK : ColorEnum.WHITE;

    if (possibleCastlingString !== '-' && !CASTLING_FEN_REGEX.test(possibleCastlingString)) {
      throw invalidFenError;
    }

    if (possibleCastlingString !== '-') {
      startingData.possibleCastling[ColorEnum.WHITE][CastlingTypeEnum.KING_SIDE] = _.includes(possibleCastlingString, 'K');
      startingData.possibleCastling[ColorEnum.WHITE][CastlingTypeEnum.QUEEN_SIDE] = _.includes(possibleCastlingString, 'Q');
      startingData.possibleCastling[ColorEnum.BLACK][CastlingTypeEnum.KING_SIDE] = _.includes(possibleCastlingString, 'k');
      startingData.possibleCastling[ColorEnum.BLACK][CastlingTypeEnum.QUEEN_SIDE] = _.includes(possibleCastlingString, 'q');
    }

    if (possibleEnPassantString !== '-') {
      if (
        _.includes(options.variants, GameVariantEnum.CHESSENCE)
        || (isMonsterChess && turnString === 'w2')
      ) {
        throw invalidFenError;
      }

      const enPassantSquareMatch = possibleEnPassantString.match(SQUARE_REGEX);

      if (!enPassantSquareMatch) {
        throw invalidFenError;
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
        throw invalidFenError;
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
      throw invalidFenError;
    }

    startingData.pliesWithoutCaptureOrPawnMove = +pliesWithoutCaptureOrPawnMoveString;

    if (startingMoveIndexString === '0' && !DIGITS_REGEX.test(startingMoveIndexString)) {
      throw invalidFenError;
    }

    const startingMoveIndexNumber = +startingMoveIndexString - 1;

    startingData.startingMoveIndex = isMonsterChess
      ? 3 * startingMoveIndexNumber + (turnString === 'b' ? 2 : turnString === 'w2' ? 1 : 0)
      : 2 * startingMoveIndexNumber + (turnString === 'b' ? 1 : 0);

    let id = 0;
    const getPiece = (color: ColorEnum, type: PieceTypeEnum, location: RealPieceLocation): RealPiece => ({
      id: `${++id}`,
      type,
      originalType: type,
      color,
      moved: false,
      location
    } as RealPiece);

    for (let board = 0; board < boards.length; board++) {
      const ranks = boards[board].split('/').reverse();
      const ranksCount = isPocketUsed && board === 0 ? boardHeight + 1 : boardHeight;

      if (ranks.length !== ranksCount) {
        throw invalidFenError;
      }

      for (let rank = ranksCount - boardHeight; rank < ranks.length; rank++) {
        const fileData = ranks[rank];
        let file = 0;
        let string = fileData;

        while (string) {
          const emptySquaresMatch = string.match(/^\d+/);

          if (emptySquaresMatch) {
            file += +emptySquaresMatch[0];
            string = string.slice(emptySquaresMatch[0].length);
          } else {
            const character = string[0];

            if (character === '-') {
              startingData.voidSquares.push({ board, x: file, y: rank });
            } else {
              const piece = Game.getPieceFromLiteral(character);

              if (!piece) {
                throw invalidFenError;
              }

              // not promoted pawns
              if (piece.type === PieceTypeEnum.PAWN && rank === (piece.color === ColorEnum.WHITE ? boardHeight - 1 : 0)) {
                throw invalidFenError;
              }

              startingData.pieces.push(getPiece(
                piece.color,
                piece.type,
                {
                  type: PieceLocationEnum.BOARD,
                  board,
                  x: file,
                  y: rank
                }
              ));
            }

            file += 1;
            string = string.slice(1);
          }
        }

        if (file !== boardWidth) {
          throw invalidFenError;
        }
      }

      if (ranksCount !== boardHeight) {
        const pocket = ranks[0];

        for (let pieceIndex = 0; pieceIndex < pocket.length; pieceIndex++) {
          const piece = Game.getPieceFromLiteral(pocket[pieceIndex]);

          if (!piece) {
            throw invalidFenError;
          }

          startingData.pieces.push(getPiece(
            piece.color,
            piece.type,
            {
              type: PieceLocationEnum.POCKET,
              pieceType: piece.type
            }
          ));
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
      throw invalidFenError;
    }

    const whiteKingsCount = startingData.pieces.filter(({ color, type }) => (
      color === ColorEnum.WHITE
      && type === PieceTypeEnum.KING
    )).length;
    const blackKingsCount = startingData.pieces.filter(({ color, type }) => (
      color === ColorEnum.WHITE
      && type === PieceTypeEnum.KING
    )).length;

    if (
      whiteKingsCount !== (isHorde ? 0 : isTwoFamilies ? 2 : 1)
      || blackKingsCount !== (isTwoFamilies ? 2 : 1)
    ) {
      throw invalidFenError;
    }

    if (startingData.possibleEnPassant) {
      const { x, y } = startingData.possibleEnPassant.pieceLocation;
      const enPassantPiece = _.find(startingData.pieces, ({ type, location }) => (
        type === PieceTypeEnum.PAWN
        && location.type === PieceLocationEnum.BOARD
        && location.x === x
        && location.y === y
      )) as BoardPiece | undefined;

      if (!enPassantPiece) {
        throw invalidFenError;
      }

      startingData.possibleEnPassant.enPassantSquare.board = (enPassantPiece.location.board + boardCount - 1) % boardCount;
      startingData.possibleEnPassant.pieceLocation.board = enPassantPiece.location.board;
    }

    return startingData;
  }

  static getGameFromPgn(pgn: string): Game {
    const pgnData = pgn
      .split('\n')
      .map((string) => string.trim())
      .filter(Boolean);
    const variants: GameVariantEnum[] = [];
    const pgnTags: PGNTags = {};
    const invalidPgnError = new Error('Invalid PGN');
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
            throw invalidPgnError;
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
            throw invalidPgnError;
          }

          if (values.length === 1) {
            timeControl = {
              type: TimeControlEnum.CORRESPONDENCE,
              base
            };
          } else {
            const incrementString = values[1];

            if (!DIGITS_REGEX.test(incrementString)) {
              throw invalidPgnError;
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
      startingData = Game.getStartingDataFromFen(fen, {
        ...Game.getBoardDimensions(variants),
        variants
      });
    } else {
      startingData = Game.getStartingData(variants);
    }

    const game = new Game({
      id: '',
      startingData,
      variants,
      timeControl,
      pgnTags
    });

    if (!game.isLeftInCheckAllowed && game.isInCheck(game.getPrevTurn())) {
      throw new Error('Invalid FEN');
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
            throw invalidPgnError;
          }

          movesString = movesString.slice(commentEnd + 1);

          continue;
        }

        // game result
        if (
          (movesString === '*' && !game.result)
          || (movesString === '1-0' && game.result && game.result.winner === ColorEnum.WHITE)
          || (movesString === '0-1' && game.result && game.result.winner === ColorEnum.BLACK)
          || (movesString === '1/2-1/2')
        ) {
          break;
        }

        // move index including dots
        if (shouldBeMoveIndex) {
          const moveIndex = Math.floor(game.movesCount / game.pliesPerMove) + 1;
          const moveIndexString = startingData.startingMoveIndex && !wasMoveIndex
            ? `${moveIndex}...`
            : `${moveIndex}.`;

          if (movesString.indexOf(moveIndexString) !== 0) {
            throw invalidPgnError;
          }

          movesString = movesString.slice(moveIndexString.length);
          shouldBeMoveIndex = false;
          wasMoveIndex = true;

          continue;
        }

        // move
        const moveMatch = movesString.match(MOVE_REGEX);

        if (!moveMatch) {
          throw invalidPgnError;
        }

        const moveString = moveMatch[0];
        const moveSquaresMatch = moveString.match(MOVE_SQUARES_MATCH);

        if (!moveSquaresMatch) {
          throw invalidPgnError;
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
          throw invalidPgnError;
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
            throw invalidPgnError;
          }

          const castlingRooks = game.getCastlingRooks(game.turn);
          const castlingRook = castlingRooks[isQueenSideCastling ? CastlingTypeEnum.QUEEN_SIDE : CastlingTypeEnum.KING_SIDE];

          if (!castlingRook) {
            throw invalidPgnError;
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
          throw invalidPgnError;
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
          const promotionMatch = moveString.slice(moveSquares.length).match(PROMOTION_REGEX);

          if (!promotionMatch) {
            throw invalidPgnError;
          }

          const promotedPiece = Game.getPieceFromLiteral(promotionMatch[1]);

          if (!promotedPiece || _.includes(game.validPromotions, promotedPiece.type)) {
            throw invalidPgnError;
          }

          move.promotion = promotedPiece.type;
        }

        game.registerMove(move);

        if (_.last(game.moves)!.algebraic !== moveString) {
          throw invalidPgnError;
        }

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

      if (piece.type === PieceTypeEnum.KING) {
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

  static getIsPocketUsed(variants: GameVariantEnum[]): boolean {
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

  static getOppositeColor(color: ColorEnum): ColorEnum {
    return color === ColorEnum.WHITE
      ? ColorEnum.BLACK
      : ColorEnum.WHITE;
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

  id: string;
  startingData: StartingData;
  players: GamePlayers = {
    [ColorEnum.WHITE]: null!,
    [ColorEnum.BLACK]: null!
  };
  status: GameStatusEnum = GameStatusEnum.BEFORE_START;
  isCheck: boolean = false;
  result: GameResult | null = null;
  turn: ColorEnum;
  timeControl: TimeControl;
  pgnTags: PGNTags;
  moves: RevertableMove[] = [];
  colorMoves: { [color in ColorEnum]: DarkChessMove[] } = {
    [ColorEnum.WHITE]: [],
    [ColorEnum.BLACK]: []
  };
  movesCount: number;
  chat: ChatMessage[] = [];
  possibleEnPassant: Square | null;
  possibleEnPassantPieceLocation: Square | null;
  positionsMap: { [position: string]: number; } = {};
  positionString: string = '';
  castlingRookCoordinates: { [color in ColorEnum]: CastlingRookCoordinates; };
  startingMoveIndex: number;
  pliesWithoutCaptureOrPawnMove: number;
  kings: GameKings = {
    [ColorEnum.WHITE]: [],
    [ColorEnum.BLACK]: []
  };
  pieces: Piece[] = [];
  visiblePieces: { [color in ColorEnum]: (Piece & { realId: number | string; })[]; } = {
    [ColorEnum.WHITE]: [],
    [ColorEnum.BLACK]: []
  };
  pocketPiecesUsed: PieceTypeEnum[] = [
    PieceTypeEnum.QUEEN,
    PieceTypeEnum.ROOK,
    PieceTypeEnum.BISHOP,
    PieceTypeEnum.KNIGHT,
    PieceTypeEnum.PAWN
  ];
  validPromotions: PieceTypeEnum[] = CLASSIC_VALID_PROMOTIONS;
  teleportUsed: { [color in ColorEnum]: boolean } = {
    [ColorEnum.WHITE]: false,
    [ColorEnum.BLACK]: false
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
  isLeftInCheckAllowed: boolean;
  isThreefoldRepetitionDrawPossible: boolean = false;
  is50MoveDrawPossible: boolean = false;
  pliesPerMove: number;
  boardCount: number;
  boardWidth: number;
  boardHeight: number;
  nullSquares: Square[];
  voidSquares: Square[];
  variants: GameVariantEnum[];
  drawOffer: ColorEnum | null = null;

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
    ({
      pieces: this.pieces,
      kings: this.kings
    } = Game.generateGameDataFromStartingData(this.startingData));

    this.pgnTags = settings.pgnTags || {};
    this.timeControl = settings.timeControl;
    this.variants = settings.variants;

    this.turn = this.startingData.turn;
    this.movesCount = this.startingMoveIndex = this.startingData.startingMoveIndex;
    this.pliesWithoutCaptureOrPawnMove = this.startingData.pliesWithoutCaptureOrPawnMove;
    this.possibleEnPassant = this.startingData.possibleEnPassant && this.startingData.possibleEnPassant.enPassantSquare;
    this.possibleEnPassantPieceLocation = this.startingData.possibleEnPassant && this.startingData.possibleEnPassant.pieceLocation;

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
    this.isPocketUsed = Game.getIsPocketUsed(settings.variants);
    this.isLeftInCheckAllowed = this.isAtomic || this.isMonsterChess || this.isDarkChess;
    this.pliesPerMove = this.isMonsterChess ? 3 : 2;
    this.castlingRookCoordinates = {
      [ColorEnum.WHITE]: this.getCastlingRookCoordinates(ColorEnum.WHITE),
      [ColorEnum.BLACK]: this.getCastlingRookCoordinates(ColorEnum.BLACK)
    };

    if (this.isChessence) {
      this.pocketPiecesUsed = [PieceTypeEnum.MAN];
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
    this.positionString = this.getShortFen();
    this.positionsMap = {};
    this.positionsMap[this.positionString] = 1;
    this.visiblePieces = {
      [ColorEnum.WHITE]: [],
      [ColorEnum.BLACK]: []
    };

    if (this.isDarkChess) {
      this.pieces.forEach((piece) => {
        this.visiblePieces[piece.color].push({
          ...piece,
          realId: piece.id
        });
      });
    }
  }

  registerMove(move: Move): RegisterMoveReturnValue {
    const {
      algebraic,
      figurine,
      movedPiece,
      isCapture,
      revertMove
    } = this.performMove(move, true, false);

    this.moves.push({
      ...move,
      algebraic,
      figurine,
      revertMove
    });

    this.positionString = this.getShortFen();
    this.positionsMap[this.positionString] = (this.positionsMap[this.positionString] || 0) + 1;
    this.isThreefoldRepetitionDrawPossible = !this.isDarkChess && this.positionsMap[this.positionString] >= 3;
    this.is50MoveDrawPossible = !this.isDarkChess && this.pliesWithoutCaptureOrPawnMove >= 100;

    const winReason = this.isWin();

    if (winReason) {
      this.end(this.getPrevTurn(), winReason);
    } else {
      const drawReason = this.isDraw();

      if (drawReason) {
        this.end(null, drawReason);
      }
    }

    return {
      movedPiece,
      isWin: !!winReason,
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
          const pieceType = piece.type;

          algebraic += SHORT_PIECE_NAMES[pieceType];
          figurine += PIECE_LITERALS[piece.color][pieceType];
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
          algebraic += `=${toLocationVisible ? SHORT_PIECE_NAMES[move.promotion!] : '?'}`;
          figurine += `=${toLocationVisible ? PIECE_LITERALS[piece.color][move.promotion!] : '?'}`;
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

  performMove(move: Move, constructMoveLiterals: boolean, checkIfAllowed: boolean): PerformMoveReturnValue {
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
    const pieceType = piece.type;
    const toPiece = this.getBoardPiece(toLocation);
    const isEnPassant = (
      fromLocation.type === PieceLocationEnum.BOARD
      && pieceType === PieceTypeEnum.PAWN
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
    const disappearedOrMovedPieces: Piece[] = [];
    const isPawnPromotion = this.isPawnPromotion(move);
    const isMainPieceMovedOrDisappeared = this.isAtomic && isCapture;
    let isTeleportMove = false;
    let isAllowed = true;

    if (
      this.isLastChance
      && piece.type === PieceTypeEnum.KING
      && !this.teleportUsed[piece.color]
    ) {
      this.teleportUsed[piece.color] = true;

      isTeleportMove = this.getAllowedMoves(piece).every((square) => !Game.areSquaresEqual(square, toLocation));

      this.teleportUsed[piece.color] = false;
    }

    const isCastling = (
      fromLocation.type === PieceLocationEnum.BOARD
      && pieceType === PieceTypeEnum.KING
      && !isTeleportMove
      && (
        this.is960
          ? !!toPiece && toPiece.color === this.turn && toPiece.type === PieceTypeEnum.ROOK
          : Math.abs(toX - fromLocation.x) > 1
      )
    );
    const isKingSideCastling = isCastling && toX - (fromLocation as PieceBoardLocation).x > 0;
    const castlingRook = isCastling
      ? this.is960
        ? toPiece
        : this.getBoardPiece({ ...toLocation, x: isKingSideCastling ? this.boardWidth - 1 : 0 })
      : null;

    const prevTurn = this.turn;
    const prevIsCheck = this.isCheck;
    const prevPliesWithoutCaptureOrPawnMove = this.pliesWithoutCaptureOrPawnMove;
    const prevPossibleEnPassant = this.possibleEnPassant;
    const prevPossibleEnPassantPieceLocation = this.possibleEnPassantPieceLocation;
    const prevTeleportUsed = this.teleportUsed[this.turn];
    const prevPieceMoved = piece.moved;
    const prevPieceType = pieceType;
    const prevPieceLocation = piece.location;
    const prevPieceOriginalType = piece.originalType;
    const playerPieces = this.getPieces(this.turn);
    let newLocation: PieceBoardLocation = {
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

        if (pieceInSquare && pieceInSquare.type !== PieceTypeEnum.PAWN) {
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

    const disappearedOrMovedPiecesData = disappearedOrMovedPieces.map(({ moved, color, type, originalType, location }) => ({
      moved,
      color,
      type,
      originalType,
      location: location as PieceBoardLocation
    }));

    let algebraic = '';
    let figurine = '';

    if (constructMoveLiterals) {
      if (fromLocation.type === PieceLocationEnum.POCKET) {
        algebraic += SHORT_PIECE_NAMES[pieceType];
        figurine += PIECE_LITERALS[piece.color][pieceType];

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

        if (pieceType === PieceTypeEnum.PAWN) {
          const otherPawnsOnOtherBoardsAbleToMakeMove = playerPieces
            .filter(Game.isBoardPiece)
            .filter((otherPawn) => (
              otherPawn.type === pieceType
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
          algebraic += SHORT_PIECE_NAMES[pieceType];
          figurine += PIECE_LITERALS[piece.color][pieceType];

          const otherPiecesAbleToMakeMove = playerPieces
            .filter(Game.isBoardPiece)
            .filter((otherPiece) => (
              otherPiece.type === pieceType
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
          algebraic += `=${SHORT_PIECE_NAMES[promotion!]}`;
          figurine += `=${PIECE_LITERALS[piece.color][promotion!]}`;
        }
      }
    }

    disappearedOrMovedPieces.forEach((disappearedOrMovedPiece) => {
      disappearedOrMovedPiece.location = null;
    });

    this.movesCount++;

    if (pieceType === PieceTypeEnum.PAWN || isCapture) {
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
      && pieceType === PieceTypeEnum.PAWN
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
        : pieceType;
      piece.originalType = this.isCrazyhouse
        ? piece.originalType
        : piece.type;
      piece.location = newLocation;
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
        id,
        type,
        color
      } = disappearedOrMovedPiece;
      const location = disappearedOrMovedPiecesData[ix].location;
      let newSquare: Square | null = null;

      if (disappearedOrMovedPiece === castlingRook) {
        newSquare = {
          board: location.board,
          x: isKingSideCastling ? this.boardWidth - 3 : 3,
          y: toY
        };
      } else if (this.isCirce) {
        const oldSquare = piece.id === id
          ? toLocation
          : location;
        const pieceRankY = color === ColorEnum.WHITE
          ? 0
          : this.boardHeight - 1;

        if (type === PieceTypeEnum.QUEEN) {
          newSquare = {
            board: location.board,
            x: !this.isTwoFamilies || oldSquare.x < this.boardWidth / 2
              ? 3
              : 5,
            y: pieceRankY
          };
        } else if (type === PieceTypeEnum.PAWN) {
          newSquare = {
            board: location.board,
            x: oldSquare.x,
            y: color === ColorEnum.WHITE
              ? 1
              : this.boardHeight - 2
          };
        } else if (type !== PieceTypeEnum.KING) {
          const squareColor = (oldSquare.x + oldSquare.y) % 2;
          const choicesX = type === PieceTypeEnum.ROOK
            ? [0, this.boardWidth - 1]
            : type === PieceTypeEnum.KNIGHT
              ? [1, this.boardWidth - 2]
              : [2, this.boardWidth - 3];
          const fileX = _.find(choicesX, (fileX) => (fileX + pieceRankY) % 2 === squareColor)!;

          newSquare = {
            board: location.board,
            x: fileX,
            y: pieceRankY
          };
        }

        if (newSquare) {
          const pieceInSquare = this.getBoardPiece(newSquare);

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
          type: PieceLocationEnum.BOARD
        };
      } else {
        removePieceOrMoveToOpponentPocket(disappearedOrMovedPiece);
      }
    });

    const setMoveIsAllowed = () => {
      if (checkIfAllowed) {
        isAllowed = isAllowed && (
          this.isAtomic
            ? this.areKingsOnTheBoard(prevTurn)
            : !this.isInCheck(prevTurn)
        );
      }
    };

    if (this.isAliceChess) {
      if (piece.type === PieceTypeEnum.KING) {
        setMoveIsAllowed();
      }

      const nextBoard = this.getNextBoard(toBoard);

      if (!isMainPieceMovedOrDisappeared && fromLocation.type === PieceLocationEnum.BOARD) {
        newLocation = {
          ...newLocation,
          board: nextBoard
        };
        piece.location = newLocation;
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

    this.turn = this.getNextTurn();
    this.isCheck = this.isInCheck(this.turn);

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

    // return revert-move function
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
        this.possibleEnPassant = prevPossibleEnPassant;
        this.possibleEnPassantPieceLocation = prevPossibleEnPassantPieceLocation;
        this.teleportUsed[this.turn] = prevTeleportUsed;
        this.movesCount--;

        if (!isMainPieceMovedOrDisappeared) {
          piece.location = prevPieceLocation;
          piece.moved = prevPieceMoved;
          piece.type = prevPieceType;
          piece.originalType = prevPieceOriginalType;
        }

        disappearedOrMovedPiecesData.forEach(({ moved, color, type, originalType, location }, ix) => {
          const disappearedOrMovedPiece = disappearedOrMovedPieces[ix];

          disappearedOrMovedPiece.moved = moved;
          disappearedOrMovedPiece.color = color;
          disappearedOrMovedPiece.type = type;
          disappearedOrMovedPiece.originalType = originalType;
          disappearedOrMovedPiece.location = location;
        });
      }
    };
  }

  getShortFen(): string {
    const boardsString = _.times(this.boardCount, (board) => (
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

              rankString += pieceInSquare.color === ColorEnum.WHITE
                ? SHORT_PIECE_NAMES[pieceInSquare.type]
                : SHORT_PIECE_NAMES[pieceInSquare.type].toLowerCase();
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
            .map(({ color, type }) => color === ColorEnum.WHITE ? SHORT_PIECE_NAMES[type] : SHORT_PIECE_NAMES[type].toLowerCase())
            .join('')
        ) : ''
      )
    )).join(' ');
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

    const pliesInMove = this.movesCount % this.pliesPerMove;
    const turnString = this.isMonsterChess
      ? pliesInMove === 0 ? 'w1' : pliesInMove === 1 ? 'w2' : 'b'
      : this.turn === ColorEnum.WHITE ? 'w' : 'b';
    const enPassantString = this.possibleEnPassant
      ? Game.getFileLiteral(this.possibleEnPassant.x) + Game.getRankLiteral(this.possibleEnPassant.y)
      : '-';

    return `${boardsString} ${turnString} ${castlingString} ${enPassantString}`;
  }

  getFen(): string {
    const moveIndexString = Math.floor(this.movesCount / this.pliesPerMove) + 1;

    return `${this.getShortFen()} ${this.pliesWithoutCaptureOrPawnMove} ${moveIndexString}`;
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
        && piece.type === PieceTypeEnum.ROOK
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
          && piece.type === PieceTypeEnum.KING
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
    const traverseDirection = (incrementY: 0 | 1 | -1, incrementX: 0 | 1 | -1) => {
      let rankY = pieceY;
      let fileX = pieceX;

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

        possibleSquares.push(square);

        if (pieceInSquare) {
          break;
        }

        if (pieceType === PieceTypeEnum.KING) {
          break;
        }
      }
    };

    if (onlyVisible) {
      possibleSquares.push({ board, x: pieceX, y: pieceY });
    }

    if (pieceType === PieceTypeEnum.KING && this.isChessence) {
      if (onlyVisible) {
        possibleSquares.push(
          ...Game.chessenceStartingMenSquares[pieceColor].map(({ x, y }) => ({ board, x, y }))
        );
      }

      return possibleSquares;
    }

    let isBishop = pieceType === PieceTypeEnum.BISHOP;
    let isRook = pieceType === PieceTypeEnum.ROOK;
    let isKnight = pieceType === PieceTypeEnum.KNIGHT;

    if (pieceType === PieceTypeEnum.MAN) {
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

    if (
      pieceType === PieceTypeEnum.KING
      || pieceType === PieceTypeEnum.QUEEN
      || isRook
    ) {
      traverseDirection(+1, 0);
      traverseDirection(-1, 0);
      traverseDirection(0, +1);
      traverseDirection(0, -1);
    }

    if (
      pieceType === PieceTypeEnum.KING
      || pieceType === PieceTypeEnum.QUEEN
      || isBishop
    ) {
      traverseDirection(+1, +1);
      traverseDirection(+1, -1);
      traverseDirection(-1, +1);
      traverseDirection(-1, -1);
    }

    if (isKnight) {
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

    if (pieceType === PieceTypeEnum.PAWN) {
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
      && this.isLastChance
      && (
        this.isLeftInCheckAllowed
        || !this.isAttackedByOpponentPiece(piece.location, opponentColor)
      )
      && pieceType === PieceTypeEnum.KING
      && !this.teleportUsed[pieceColor]
    ) {
      possibleSquares.push(
        ...getSquaresForDrop(pieceType).filter((square) => square.board === board)
      );
    }

    if (
      (forMove || onlyPossible)
      && pieceType === PieceTypeEnum.KING
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
          && !this.isParalysed(rook)
        ))
        .filter((rook) => {
          const { location } = rook!;
          const isKingSideRook = location.x - pieceX > 0;
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

          _.times(Math.abs(location.x - newRookX), (x) => {
            const fileX = newRookX + (location.x > newRookX ? +x : -x);
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
                board: this.getNextBoard(location.board + board),
                y: location.y,
                x: newRookX
              })
            ));
          }

          return canRookMove;
        })
        .forEach((rook) => {
          const { location } = rook!;
          const isKingSideRook = location.x - pieceX > 0;

          possibleSquares.push({
            board,
            x: this.is960
              ? location.x
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
      && this.isParalysed(piece as BoardPiece, possibleSquares)
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

    if (this.isLeftInCheckAllowed && !this.isAtomic) {
      return possibleMoves;
    }

    return possibleMoves.filter((square) => {
      const { allowed, revertMove } = this.performMove({
        from: piece.location,
        to: square,
        timestamp: 0,
        promotion: PieceTypeEnum.QUEEN
      }, false, true);

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

  isParalysed(piece: BoardPiece, possibleSquares?: Square[]): boolean {
    return this.isMadrasi && (possibleSquares || this.getPossibleMoves(piece, { onlyPossible: true })).some((square) => {
      const pieceInSquare = this.getBoardPiece(square);

      return (
        !!pieceInSquare
        && pieceInSquare.color !== piece.color
        && pieceInSquare.type === piece.type
      );
    });
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
      && piece.type === PieceTypeEnum.PAWN
      && ((
        piece.color === ColorEnum.WHITE && toY === this.boardHeight - 1
      ) || (
        piece.color === ColorEnum.BLACK && toY === 0
      ))
    );
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

  isWin(): ResultReasonEnum | null {
    if (this.isCheckmate()) {
      return ResultReasonEnum.CHECKMATE;
    }

    if (this.isKingOfTheHill && this.isKingInTheCenter()) {
      return ResultReasonEnum.KING_IN_THE_CENTER;
    }

    if (this.isAtomic && !this.areKingsOnTheBoard(this.turn)) {
      return ResultReasonEnum.KING_EXPLODED;
    }

    if ((this.isMonsterChess || this.isDarkChess) && !this.areKingsOnTheBoard(this.turn)) {
      return ResultReasonEnum.KING_CAPTURED;
    }

    if (this.isChessence && this.isStalemate()) {
      return ResultReasonEnum.STALEMATE;
    }

    if (this.isHorde && this.isHordeDestroyed()) {
      return ResultReasonEnum.HORDE_DESTROYED;
    }

    return null;
  }

  isHordeDestroyed() {
    return (
      this.turn === ColorEnum.WHITE
      && !this.getPieces(this.turn).length
    );
  }

  isKingInTheCenter(): boolean {
    return this.kings[this.getPrevTurn()].some((king) => (
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
    if (this.isStalemate()) {
      return ResultReasonEnum.STALEMATE;
    }

    if (this.isInsufficientMaterial()) {
      return ResultReasonEnum.INSUFFICIENT_MATERIAL;
    }

    if (this.pliesWithoutCaptureOrPawnMove >= 150) {
      return ResultReasonEnum.SEVENTY_FIVE_MOVE_RULE;
    }

    if (this.positionsMap[this.positionString] === 5) {
      return ResultReasonEnum.FIVEFOLD_REPETITION;
    }

    return null;
  }

  isInsufficientMaterial(): boolean {
    if (
      this.isKingOfTheHill
      || this.isMonsterChess
      || this.isHorde
      || this.isDarkChess
      || this.isCrazyhouse
    ) {
      return false;
    }

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
      pieces[0].every(({ type }) => type === PieceTypeEnum.KING)
      && pieces[1].every(({ type }) => type === PieceTypeEnum.KING)
    ) {
      return true;
    }

    if (this.isAtomic || this.isMadrasi) {
      return false;
    }

    if (
      // king vs king & knight
      pieces[0].length === 1
      && pieces[1].length === 2
      && pieces[1][1].type === PieceTypeEnum.KNIGHT
    ) {
      return true;
    }

    const possibleBishopColor = pieces[1][1].location.x % 2 + pieces[1][1].location.y % 2;

    return pieces.every((pieces) => (
      pieces.slice(1).every(({ type, location }) => (
        type === PieceTypeEnum.BISHOP
        && location.x % 2 + location.y % 2 === possibleBishopColor
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
