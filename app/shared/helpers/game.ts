import * as _ from 'lodash';
import {
  BaseMove,
  BoardPiece,
  CenterSquareParams,
  ChatMessage,
  ColorEnum,
  Game as IGame,
  GameCreateSettings,
  GameKings,
  GamePlayers,
  GameResult,
  GameStatusEnum,
  GameVariantEnum,
  Move,
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
  TimeControl
} from '../../types';
import {
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
  revertMove(): void;
}

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

export class Game implements IGame {
  static validateVariants(variants: GameVariantEnum[]): boolean {
    return ((
      !_.includes(variants, GameVariantEnum.CIRCE)
      || !_.includes(variants, GameVariantEnum.CHESS_960)
    ) && (
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
        && !_.includes(variants, GameVariantEnum.ALICE_CHESS)
        && !_.includes(variants, GameVariantEnum.CHESSENCE)
        && !_.includes(variants, GameVariantEnum.HORDE)
      )
    ) && (
      !_.includes(variants, GameVariantEnum.TWO_FAMILIES)
      || !_.includes(variants, GameVariantEnum.CHESS_960)
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
        && !_.includes(variants, GameVariantEnum.TWO_FAMILIES)
        && !_.includes(variants, GameVariantEnum.ALICE_CHESS)
      )
    ));
  }

  static classicStartingData = (() => {
    let id = 0;
    const boardWidth = 8;
    const boardHeight = 8;
    const pieces: RealPiece[] = [];

    [ColorEnum.WHITE, ColorEnum.BLACK].forEach((color) => {
      const pieceRankY = color === ColorEnum.WHITE ? 0 : boardHeight - 1;
      const pawnRankY = color === ColorEnum.WHITE ? 1 : boardHeight - 2;
      const getPiece = (type: PieceTypeEnum, x: number, y: number): BoardPiece => ({
        id: ++id,
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

      CLASSIC_PIECE_PLACEMENT.forEach((type, x) => {
        pieces.push(getPiece(type, x, pieceRankY));
      });

      _.times(boardWidth, (x) => {
        pieces.push(getPiece(PieceTypeEnum.PAWN, x, pawnRankY));
      });
    });

    return {
      boardCount: 1,
      boardWidth,
      boardHeight,
      pieces,
      voidSquares: [],
      emptySquares: []
    };
  })();

  static chessenceStartingMenSquares = (() => {
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

  static chessenceStartingData = (() => {
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
        id: ++id,
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
      boardCount: 1,
      boardWidth,
      boardHeight,
      pieces,
      voidSquares,
      emptySquares: []
    };
  })();

  static hordeStartingData = (() => {
    let id = 0;
    const boardWidth = 8;
    const boardHeight = 8;
    const pieces: RealPiece[] = [];

    [ColorEnum.WHITE, ColorEnum.BLACK].forEach((color) => {
      const getPiece = (type: PieceTypeEnum, x: number, y: number): BoardPiece => ({
        id: ++id,
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
      boardCount: 1,
      boardWidth,
      boardHeight,
      pieces,
      voidSquares: [],
      emptySquares: []
    };
  })();

  static startingData10by8 = (() => {
    let id = 0;
    const boardWidth = 10;
    const boardHeight = 8;
    const pieces: RealPiece[] = [];
    const pieceTypes = [
      ...CLASSIC_PIECE_PLACEMENT.slice(0, 4),
      PieceTypeEnum.KING,
      PieceTypeEnum.QUEEN,
      ...CLASSIC_PIECE_PLACEMENT.slice(4)
    ];

    [ColorEnum.WHITE, ColorEnum.BLACK].forEach((color) => {
      const pieceRankY = color === ColorEnum.WHITE ? 0 : boardHeight - 1;
      const pawnRankY = color === ColorEnum.WHITE ? 1 : boardHeight - 2;
      const getPiece = (type: PieceTypeEnum, x: number, y: number): BoardPiece => ({
        id: ++id,
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
      boardCount: 1,
      boardWidth,
      boardHeight,
      pieces,
      voidSquares: [],
      emptySquares: []
    };
  })();

  static generateStarting960Data(): StartingData {
    let id = 0;
    const boardWidth = 8;
    const boardHeight = 8;
    const pieces: RealPiece[] = [];
    const pieceTypes: PieceTypeEnum[] = _.times(8, () => null!);
    const darkColoredBishopPosition = 2 * Math.floor(4 * Math.random());
    const lightColoredBishopPosition = 2 * Math.floor(4 * Math.random()) + 1;

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
    const queenPositionNumber = Math.floor(6 * Math.random());
    const knight1PositionNumber = Math.floor(5 * Math.random());
    const knight2PositionNumber = Math.floor(4 * Math.random());

    placePiece(PieceTypeEnum.QUEEN, queenPositionNumber);
    placePiece(PieceTypeEnum.KNIGHT, knight1PositionNumber);
    placePiece(PieceTypeEnum.KNIGHT, knight2PositionNumber);

    const restPieces = [PieceTypeEnum.ROOK, PieceTypeEnum.KING, PieceTypeEnum.ROOK];
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
    /*
    // for tests
    const pieceTypes = [
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

    [ColorEnum.WHITE, ColorEnum.BLACK].forEach((color) => {
      const pieceRankY = color === ColorEnum.WHITE ? 0 : boardHeight - 1;
      const pawnRankY = color === ColorEnum.WHITE ? 1 : boardHeight - 2;
      const getPiece = (type: PieceTypeEnum, x: number, y: number): BoardPiece => ({
        id: ++id,
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
      boardCount: 1,
      boardWidth,
      boardHeight,
      pieces,
      voidSquares: [],
      emptySquares: []
    };
  }

  static getStartingData(settings: GameCreateSettings): StartingData {
    let startingData: StartingData;

    if (_.includes(settings.variants, GameVariantEnum.CHESS_960)) {
      startingData = this.generateStarting960Data();
    } else if (_.includes(settings.variants, GameVariantEnum.TWO_FAMILIES)) {
      startingData = this.startingData10by8;
    } else if (_.includes(settings.variants, GameVariantEnum.CHESSENCE)) {
      startingData = this.chessenceStartingData;
    } else if (_.includes(settings.variants, GameVariantEnum.HORDE)) {
      startingData = this.hordeStartingData;
    } else {
      startingData = this.classicStartingData;
    }

    startingData = { ...startingData };

    if (_.includes(settings.variants, GameVariantEnum.MONSTER_CHESS)) {
      const halfWidth = Math.round(startingData.boardWidth / 2);
      const left = Math.ceil(halfWidth / 2);
      const right = startingData.boardWidth - Math.floor(halfWidth / 2);

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

    if (_.includes(settings.variants, GameVariantEnum.ALICE_CHESS)) {
      startingData.boardCount = 2;
      startingData.voidSquares = [
        ...startingData.voidSquares,
        ...startingData.voidSquares.map((square) => ({ ...square, board: 1 }))
      ];
      startingData.emptySquares = [
        ...startingData.emptySquares,
        ...startingData.emptySquares.map((square) => ({ ...square, board: 1 }))
      ];
    }

    return startingData;
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

  static getBoardLiteral(board: number): string {
    return board === 0 ? '₁' : '₂';
  }

  static getFileLiteral(file: number): string {
    return String.fromCharCode(file + 97);
  }

  static getRankLiteral(rank: number): number {
    return rank + 1;
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
  turn: ColorEnum = ColorEnum.WHITE;
  timeControl: TimeControl;
  moves: RevertableMove[] = [];
  movesCount = 0;
  chat: ChatMessage[] = [];
  possibleEnPassant: Square | null = null;
  possibleEnPassantPieceLocation: Square | null = null;
  positionsMap: { [position: string]: number; } = {};
  positionString: string;
  pliesWithoutCaptureOrPawnMove: number = 0;
  kings: GameKings;
  pieces: Piece[];
  pocketPiecesUsed: PieceTypeEnum[] = [
    PieceTypeEnum.QUEEN,
    PieceTypeEnum.ROOK,
    PieceTypeEnum.BISHOP,
    PieceTypeEnum.KNIGHT,
    PieceTypeEnum.PAWN
  ];
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
  isLeftInCheckAllowed: boolean;
  isThreefoldRepetitionDrawPossible: boolean = false;
  is50MoveDrawPossible: boolean = false;
  numberOfMovesBeforeStart: number;
  boardCount: number;
  boardWidth: number;
  boardHeight: number;
  nullSquares: Square[];
  voidSquares: Square[];
  variants: GameVariantEnum[];
  drawOffer: ColorEnum | null = null;

  constructor(settings: GameCreateSettings & { id: string; startingData?: StartingData; }) {
    this.id = settings.id;
    this.startingData = settings.startingData || Game.getStartingData(settings);
    this.boardCount = this.startingData.boardCount;
    this.boardWidth = this.startingData.boardWidth;
    this.boardHeight = this.startingData.boardHeight;
    this.nullSquares = [
      ...this.startingData.voidSquares,
      ...this.startingData.emptySquares
    ];
    this.voidSquares = this.startingData.voidSquares;
    ({
      pieces: this.pieces,
      kings: this.kings
    } = Game.generateGameDataFromStartingData(this.startingData));

    this.timeControl = settings.timeControl;
    this.variants = settings.variants;

    this.positionString = this.generatePositionString();
    this.positionsMap[this.positionString] = 1;

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
    this.isPocketUsed = this.isCrazyhouse || this.isChessence;
    this.isLeftInCheckAllowed = this.isAtomic || this.isMonsterChess;
    this.numberOfMovesBeforeStart = this.isMonsterChess ? 3 : 2;

    if (this.isChessence) {
      this.pocketPiecesUsed = [PieceTypeEnum.MAN];
    }
  }

  registerMove(move: Move) {
    const {
      algebraic,
      figurine,
      revertMove
    } = this.performMove(move, true, false);

    this.moves.push({
      ...move,
      algebraic,
      figurine,
      revertMove
    });

    this.positionString = this.generatePositionString();
    this.positionsMap[this.positionString] = (this.positionsMap[this.positionString] || 0) + 1;
    this.isThreefoldRepetitionDrawPossible = this.positionsMap[this.positionString] >= 3;
    this.is50MoveDrawPossible = this.pliesWithoutCaptureOrPawnMove >= 100;

    const winReason = this.isWin();

    if (winReason) {
      this.end(this.getPrevTurn(), winReason);
    } else {
      const drawReason = this.isDraw();

      if (drawReason) {
        this.end(null, drawReason);
      }
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

    const disappearedOrMovedPiecesData = disappearedOrMovedPieces.map(({ moved, color, type, location }) => ({
      moved,
      color,
      type,
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
      fromLocation.type === PieceLocationEnum.BOARD
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
      piece.originalType = isPawnPromotion && this.isCrazyhouse
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
      const boardAfterNext = this.getNextBoard(nextBoard);

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
          const prevBoardSquare = disappearedOrMovedPiece.location as PieceBoardLocation;
          const nextBoardSquare = {
            ...prevBoardSquare,
            board: nextBoard
          };
          const nextAfterNextBoardSquare = {
            ...prevBoardSquare,
            board: boardAfterNext
          };
          const pieceOnTheNextBoard = this.getBoardPiece(nextBoardSquare);
          const pieceOnTheNextAfterNextBoard = this.getBoardPiece(nextAfterNextBoardSquare);

          // don't allow move to the next board if the square there or on the next board is occupied by another piece
          if (pieceOnTheNextBoard || (pieceOnTheNextAfterNextBoard && pieceOnTheNextAfterNextBoard.id !== disappearedOrMovedPiece.id)) {
            removePieceOrMoveToOpponentPocket(disappearedOrMovedPiece);
          } else {
            disappearedOrMovedPiece.location = nextBoardSquare;
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

        disappearedOrMovedPiecesData.forEach(({ moved, color, type, location }, ix) => {
          const disappearedOrMovedPiece = disappearedOrMovedPieces[ix];

          disappearedOrMovedPiece.moved = moved;
          disappearedOrMovedPiece.color = color;
          disappearedOrMovedPiece.type = type;
          disappearedOrMovedPiece.location = location;
        });
      }
    };
  }

  generatePositionString(): string {
    const whiteCastlingRooks = this.getCastlingRooks(ColorEnum.WHITE);
    const blackCastlingRooks = this.getCastlingRooks(ColorEnum.BLACK);
    const whiteQueenSideKing = this.kings[ColorEnum.WHITE][0];
    const whiteKingSideKing = _.last(this.kings[ColorEnum.WHITE]);
    const blackQueenSideKing = this.kings[ColorEnum.BLACK][0];
    const blackKingSideKing = _.last(this.kings[ColorEnum.BLACK]);

    return JSON.stringify([
      this.turn,
      // en passant square
      this.possibleEnPassant,
      // white queen-side castling is possible
      (
        !!whiteQueenSideKing
        && !whiteQueenSideKing.moved
        && !!whiteCastlingRooks[0]
        && !whiteCastlingRooks[0]!.moved
      ),
      // white king-side castling is possible
      (
        !!whiteKingSideKing
        && !whiteKingSideKing.moved
        && !!whiteCastlingRooks[1]
        && !whiteCastlingRooks[1]!.moved
      ),
      // black queen-side castling is possible
      (
        !!blackQueenSideKing
        && !blackQueenSideKing.moved
        && !!blackCastlingRooks[0]
        && !blackCastlingRooks[0]!.moved
      ),
      (
      // black king-side castling is possible
        !!blackKingSideKing
        && !blackKingSideKing.moved
        && !!blackCastlingRooks[1]
        && !blackCastlingRooks[1]!.moved
      ),
      _.times(this.boardCount, (board) => (
        _.times(this.boardHeight, (y) => (
          _.times(this.boardWidth, (x) => {
            const pieceInSquare = this.getBoardPiece({ board, x, y });

            return pieceInSquare && [pieceInSquare.type, pieceInSquare.color];
          })
        ))
      ))
    ]);
  }

  getNextTurn(): ColorEnum {
    if (!this.isMonsterChess) {
      return this.getOpponentColor();
    }

    return this.movesCount % 3 === 2
      ? ColorEnum.BLACK
      : ColorEnum.WHITE;
  }

  getPrevTurn(): ColorEnum {
    if (!this.isMonsterChess) {
      return this.getOpponentColor();
    }

    return this.movesCount % 3 === 0
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
      && piece.location.board === square.board
      && piece.location.y === square.y
      && piece.location.x === square.x
    )) as BoardPiece | undefined || null;
  }

  getPocketPiece(type: PieceTypeEnum, color: ColorEnum): PocketPiece | null {
    return _.find(this.pieces, (piece) => (
      Game.isPocketPiece(piece)
      && piece.color === color
      && piece.location.pieceType === type
    )) as PocketPiece | undefined || null;
  }

  getCastlingRooks(color: ColorEnum): (BoardPiece | null)[] {
    const rookCoordinates = this.startingData.pieces
      .map((startingPiece) => (
        startingPiece.color === color
        && startingPiece.type === PieceTypeEnum.ROOK
        && startingPiece.location.type === PieceLocationEnum.BOARD
          ? startingPiece.location
          : null
      ))
      .filter((square) => square !== null) as PieceBoardLocation[];

    return rookCoordinates.map((square) => {
      const pieceInSquare = this.getBoardPiece(square);

      return pieceInSquare && !pieceInSquare.moved
        ? pieceInSquare
        : null;
    });
  }

  getPossibleMoves(piece: RealPiece, onlyAttacked: boolean, onlyControlled: boolean): Square[] {
    const forMove = !onlyControlled && !onlyAttacked;
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
                && !this.getBoardPiece(square)
                && !this.getBoardPiece({ ...square, board: this.getNextBoard(square.board) })
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
          if (!forMove) {
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

    if (pieceType === PieceTypeEnum.KING && this.isChessence) {
      return [];
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

        if (!forMove || !pieceInSquare || pieceInSquare.color !== pieceColor) {
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

      if (forMove && !this.isNullSquare(square)) {
        // 1-forward move
        const pieceInSquare = this.getBoardPiece(square);

        if (!pieceInSquare) {
          possibleSquares.push(square);

          if (
            (pieceColor === ColorEnum.WHITE ? pieceY === 1 : pieceY === this.boardHeight - 2)
            || (pieceColor === ColorEnum.WHITE && this.isHorde && pieceY === 0)
          ) {
            // 2-forward move
            const square = {
              board,
              x: pieceX,
              y: rankY + direction
            };
            const pieceInSquare = this.getBoardPiece(square);

            if (!pieceInSquare) {
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
            !forMove
            || (pieceInSquare && pieceInSquare.color !== pieceColor)
            || (captureAllowed && this.possibleEnPassant && Game.areSquaresEqual(square, this.possibleEnPassant))
          ) {
            possibleSquares.push(square);
          }
        }
      });
    }

    if (
      forMove
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
      forMove
      && pieceType === PieceTypeEnum.KING
      && !piece.moved
      && (
        this.isLeftInCheckAllowed
        || !this.isAttackedByOpponentPiece(piece.location, opponentColor)
      )
    ) {
      const queenSideKing = this.kings[pieceColor][0];
      const kingSideKing = _.last(this.kings[pieceColor])!;

      this.getCastlingRooks(pieceColor)
        .filter((_rook, ix) => (
          // queen-side king and queen-side rook
          (piece === queenSideKing && ix === 0)
          // king-side king and king-side rook
          || (piece === kingSideKing && ix === 1)
        ))
        .filter(Boolean)
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
            // a piece cannot move to a square that is occupied on the next board
            canRookMove = canRookMove && !this.getBoardPiece({
              board: this.getNextBoard(location.board),
              y: location.y,
              x: location.x
            });

            if (this.boardCount > 2) {
              canRookMove = canRookMove && !this.getBoardPiece({
                board: this.getNextBoard(this.getNextBoard(location.board)),
                y: location.y,
                x: location.x
              });
            }
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
      this.isMadrasi
      && possibleSquares.some((square) => {
        const pieceInSquare = this.getBoardPiece(square);

        return (
          !!pieceInSquare
          && pieceInSquare.color !== pieceColor
          && pieceInSquare.type === pieceType
        );
      })
    ) {
      return [];
    }

    if (this.boardCount > 1 && forMove) {
      // a piece cannot move to a square that is occupied on the next board
      possibleSquares = possibleSquares.filter((square) => {
        const pieceOnThisBoard = this.getBoardPiece(square);
        const pieceOnTheNextBoard = this.getBoardPiece({
          ...square,
          board: this.getNextBoard(square.board)
        });

        return !pieceOnTheNextBoard || (
          this.isAtomic
          && pieceOnThisBoard
          && pieceOnThisBoard.color !== pieceColor
        );
      });

      if (this.boardCount > 2) {
        // a piece cannot move to a square that is occupied on the next board after the next board
        possibleSquares = possibleSquares.filter((square) => (
          !this.getBoardPiece({
            ...square,
            board: this.getNextBoard(this.getNextBoard(square.board))
          })
        ));
      }
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
    const possibleMoves = this.getPossibleMoves(piece, false, false);

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
      && this.getPossibleMoves(piece, true, false).some((possibleSquare) => (
        Game.areSquaresEqual(possibleSquare, square)
      ))
    ));
  }

  isPatrolledByFriendlyPiece(piece: BoardPiece): boolean {
    const pieceLocation = piece.location;

    return this.getPieces(piece.color).some((piece) => (
      Game.isBoardPiece(piece)
      && this.getPossibleMoves(piece, true, true).some((square) => (
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

    if (this.isMonsterChess && !this.areKingsOnTheBoard(this.turn)) {
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
    if (this.isKingOfTheHill || this.isMonsterChess || this.isHorde) {
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
