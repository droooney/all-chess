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
  StartingBoard,
  StartingPiece,
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
      )
    ));
  }

  static classicStartingBoard = (() => {
    let id = 0;

    return _.times(8, (y) => (
      _.times(8, (x) => {
        const getPiece = (type: PieceTypeEnum): StartingPiece => ({
          id: ++id,
          type,
          color: y < 2
            ? ColorEnum.WHITE
            : ColorEnum.BLACK
        });

        if (y === 1 || y === 6) {
          return getPiece(PieceTypeEnum.PAWN);
        }

        if (y === 0 || y === 7) {
          if (x === 0 || x === 7) {
            return getPiece(PieceTypeEnum.ROOK);
          }

          if (x === 1 || x === 6) {
            return getPiece(PieceTypeEnum.KNIGHT);
          }

          if (x === 2 || x === 5) {
            return getPiece(PieceTypeEnum.BISHOP);
          }

          if (x === 3) {
            return getPiece(PieceTypeEnum.QUEEN);
          }

          return getPiece(PieceTypeEnum.KING);
        }

        return null;
      })
    ));
  })();

  static emptyClassicStartingBoard = (() => {
    return _.times(8, () => (
      _.times(8, () => null)
    ));
  })();

  static generateStarting960Board(): StartingBoard {
    let id = 0;
    const pieces: (PieceTypeEnum | null)[] = _.times(8, () => null);
    const darkColoredBishopPosition = 2 * Math.floor(4 * Math.random());
    const lightColoredBishopPosition = 2 * Math.floor(4 * Math.random()) + 1;

    pieces[darkColoredBishopPosition] = PieceTypeEnum.BISHOP;
    pieces[lightColoredBishopPosition] = PieceTypeEnum.BISHOP;

    const placePiece = (type: PieceTypeEnum, position: number) => {
      let currentPosition = 0;

      pieces.some((piece, ix) => {
        if (!piece && currentPosition++ === position) {
          pieces[ix] = type;

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

    pieces.some((piece, ix) => {
      if (!piece) {
        pieces[ix] = restPieces[placedPieces++];

        if (placedPieces === restPieces.length) {
          return true;
        }
      }

      return false;
    });
    /*
    // for tests
    const pieces = [
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

    return _.times(8, (y) => (
      _.times(8, (x) => {
        const getPiece = (type: PieceTypeEnum): StartingPiece => ({
          id: ++id,
          type,
          color: y < 2
            ? ColorEnum.WHITE
            : ColorEnum.BLACK
        });

        if (y === 1 || y === 6) {
          return getPiece(PieceTypeEnum.PAWN);
        }

        if (y === 0 || y === 7) {
          return getPiece(pieces[x]!);
        }

        return null;
      })
    ));
  }

  static getStartingBoards(settings: GameCreateSettings): StartingBoard[] {
    let startingBoard = _.includes(settings.variants, GameVariantEnum.CHESS_960)
      ? this.generateStarting960Board()
      : this.classicStartingBoard;

    if (_.includes(settings.variants, GameVariantEnum.MONSTER_CHESS)) {
      startingBoard = startingBoard.map((rank) => [...rank]);

      startingBoard.slice(0, 2).forEach((rank) => {
        rank.forEach((piece, x) => {
          if (
            piece!.type !== PieceTypeEnum.KING
            && (
              piece!.type !== PieceTypeEnum.PAWN
              || x < 2
              || x > 5
            )
          ) {
            rank[x] = null;
          }
        });
      });
    }

    return _.includes(settings.variants, GameVariantEnum.ALICE_CHESS)
      ? [startingBoard, this.emptyClassicStartingBoard]
      : [startingBoard];
  }

  static generateBoardsDataFromStartingBoards(startingBoards: StartingBoard[]): BoardData {
    const kings: GameKings = {
      [ColorEnum.WHITE]: [],
      [ColorEnum.BLACK]: []
    };
    const pieces: Piece[] = [];

    startingBoards.forEach((startingBoard, board) => {
      startingBoard.forEach((rank, y) => {
        rank.forEach((startingPiece, x) => {
          if (!startingPiece) {
            return null;
          }

          const piece: BoardPiece = {
            ...startingPiece,
            originalType: startingPiece.type,
            location: {
              type: PieceLocationEnum.BOARD,
              board,
              x,
              y
            },
            moved: false
          };

          pieces.push(piece);

          if (piece.type === PieceTypeEnum.KING) {
            kings[piece.color].push(piece);
          }
        });
      });
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
  startingBoards: StartingBoard[];
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
  is960: boolean;
  isKingOfTheHill: boolean;
  isAtomic: boolean;
  isCirce: boolean;
  isPatrol: boolean;
  isMadrasi: boolean;
  isLastChance: boolean;
  isMonsterChess: boolean;
  isAliceChess: boolean;
  isLeftInCheckAllowed: boolean;
  isThreefoldRepetitionDrawPossible: boolean = false;
  is50MoveDrawPossible: boolean = false;
  numberOfMovesBeforeStart: number;
  variants: GameVariantEnum[];
  drawOffer: ColorEnum | null = null;

  constructor(settings: GameCreateSettings & { id: string; startingBoards?: StartingBoard[]; }) {
    this.id = settings.id;
    this.startingBoards = settings.startingBoards || Game.getStartingBoards(settings);
    ({
      pieces: this.pieces,
      kings: this.kings
    } = Game.generateBoardsDataFromStartingBoards(this.startingBoards));

    this.timeControl = settings.timeControl;
    this.variants = settings.variants;

    this.positionString = this.generatePositionString();
    this.positionsMap[this.positionString] = 1;

    this.isPocketUsed = _.includes(this.variants, GameVariantEnum.CRAZYHOUSE);
    this.is960 = _.includes(this.variants, GameVariantEnum.CHESS_960);
    this.isKingOfTheHill = _.includes(this.variants, GameVariantEnum.KING_OF_THE_HILL);
    this.isAtomic = _.includes(this.variants, GameVariantEnum.ATOMIC);
    this.isCirce = _.includes(this.variants, GameVariantEnum.CIRCE);
    this.isPatrol = _.includes(this.variants, GameVariantEnum.PATROL);
    this.isMadrasi = _.includes(this.variants, GameVariantEnum.MADRASI);
    this.isLastChance = _.includes(this.variants, GameVariantEnum.LAST_CHANCE);
    this.isMonsterChess = _.includes(this.variants, GameVariantEnum.MONSTER_CHESS);
    this.isAliceChess = _.includes(this.variants, GameVariantEnum.ALICE_CHESS);
    this.isLeftInCheckAllowed = this.isAtomic || this.isMonsterChess;
    this.numberOfMovesBeforeStart = this.isMonsterChess ? 3 : 2;
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

      isTeleportMove = this.getAllowedMoves(fromLocation).every(({ x, y }) => (
        toY !== y
        || toX !== x
      ));

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
        : this.getBoardPiece({ ...toLocation, x: isKingSideCastling ? 7 : 0 })
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
            ? { board: toBoard, x: 6, y: toY }
            : { board: toBoard, x: 2, y: toY }
          : toLocation
      ),
      type: PieceLocationEnum.BOARD
    };

    if (this.isAtomic && isCapture) {
      const additionalSquares: (BoardPiece | null | undefined)[] = [];
      const board = (fromLocation as PieceBoardLocation).board;

      if (toY - 1 in this.startingBoards[0]) {
        additionalSquares.push(this.getBoardPiece({ board, y: toY - 1, x: toX - 1 }));
        additionalSquares.push(this.getBoardPiece({ board, y: toY - 1, x: toX }));
        additionalSquares.push(this.getBoardPiece({ board, y: toY - 1, x: toX + 1 }));
      }

      additionalSquares.push(this.getBoardPiece({ board, y: toY, x: toX - 1 }));
      additionalSquares.push(this.getBoardPiece({ board, y: toY, x: toX }));
      additionalSquares.push(this.getBoardPiece({ board, y: toY, x: toX + 1 }));

      if (toY + 1 in this.startingBoards[0]) {
        additionalSquares.push(this.getBoardPiece({ board, y: toY + 1, x: toX - 1 }));
        additionalSquares.push(this.getBoardPiece({ board, y: toY + 1, x: toX }));
        additionalSquares.push(this.getBoardPiece({ board, y: toY + 1, x: toX + 1 }));
      }

      additionalSquares.forEach((piece) => {
        if (piece && piece.type !== PieceTypeEnum.PAWN) {
          disappearedOrMovedPieces.push(piece);
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

        const otherBoardsToDropPiece = this.getAllowedMoves(fromLocation).some(({ board, x, y }) => (
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
            .filter(({ id, type, location }) => (
              type === pieceType
              && id !== piece.id
              && location.board !== piece.id
              && this.getAllowedMoves(location).some(({ x, y }) => x === toX && y === toY)
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
            .filter(({ id, type, location }) => (
              type === pieceType
              && id !== piece.id
              && this.getAllowedMoves(location).some(({ x, y }) => x === toX && y === toY)
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
      && Math.abs(toY - fromLocation.y) === 2
      && fromLocation.board === toBoard
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
      this.possibleEnPassantPieceLocation = newLocation;
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
      piece.originalType = isPawnPromotion && this.isPocketUsed
        ? piece.originalType
        : piece.type;
      piece.location = newLocation;
    }

    const removePieceOrMoveToOpponentPocket = (piece: Piece) => {
      piece.location = null;

      if (this.isPocketUsed && _.includes(this.pocketPiecesUsed, piece.originalType)) {
        const pieceType = piece.originalType;
        const opponentColor = this.getOppositeColor(piece.color);

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
          x: isKingSideCastling ? 5 : 3,
          y: toY
        };
      } else if (this.isCirce) {
        const oldSquare = piece.id === id
          ? toLocation
          : location;
        const pieceRankY = color === ColorEnum.WHITE
          ? 0
          : 7;

        if (type === PieceTypeEnum.KING) {
          // don't allow the king to be reborn if he was exploded on the initial square
          if (oldSquare.x !== 4 || oldSquare.y !== pieceRankY) {
            newSquare = {
              board: location.board,
              x: 4,
              y: pieceRankY
            };
          }
        } else if (type === PieceTypeEnum.QUEEN) {
          newSquare = {
            board: location.board,
            x: 3,
            y: pieceRankY
          };
        } else if (type === PieceTypeEnum.PAWN) {
          newSquare = {
            board: location.board,
            x: oldSquare.x,
            y: color === ColorEnum.WHITE
              ? 1
              : 6
          };
        } else {
          const squareColor = (oldSquare.x + oldSquare.y) % 2;
          const choicesX = type === PieceTypeEnum.ROOK
            ? [0, 7]
            : type === PieceTypeEnum.KNIGHT
              ? [1, 6]
              : [2, 5];
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
          if (pieceOnTheNextBoard || pieceOnTheNextAfterNextBoard) {
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
      this.startingBoards.map((board, boardNumber) => (
        board.map((rank, y) => (
          rank.map((_p, x) => {
            const pieceInSquare = this.getBoardPiece({ board: boardNumber, x, y });

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
    const {
      x: squareX,
      y: squareY
    } = square;

    if (squareX === 3 && squareY === 3) {
      return { top: true, left: true };
    }

    if (squareX === 3 && squareY === 4) {
      return { bottom: true, left: true };
    }

    if (squareX === 4 && squareY === 3) {
      return { top: true, right: true };
    }

    if (squareX === 4 && squareY === 4) {
      return { bottom: true, right: true };
    }

    return null;
  }

  getOppositeColor(color: ColorEnum): ColorEnum {
    return color === ColorEnum.WHITE
      ? ColorEnum.BLACK
      : ColorEnum.WHITE;
  }

  getNextBoard(board: number): number {
    return (board + 1) % this.startingBoards.length;
  }

  getPrevBoard(board: number): number {
    return (board + this.startingBoards.length - 1) % this.startingBoards.length;
  }

  getOpponentColor(): ColorEnum {
    return this.getOppositeColor(this.turn);
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
    const rankY = color === ColorEnum.WHITE ? 0 : 7;
    const rookCoordinates = this.startingBoards[0][rankY]
      .map((startingPiece, x) => (
        !!startingPiece
        && startingPiece.type === PieceTypeEnum.ROOK
          ? x
          : null
      ))
      .filter((x) => x !== null) as number[];

    return rookCoordinates.map((x) => {
      const pieceInSquare = this.getBoardPiece({ board: 0, y: rankY, x });

      return pieceInSquare && !pieceInSquare.moved
        ? pieceInSquare
        : null;
    });
  }

  getPossibleMoves(location: RealPieceLocation, onlyAttacked: boolean, onlyControlled: boolean): Square[] {
    const forMove = !onlyControlled && !onlyAttacked;
    const getSquaresForDrop = (pieceType: PieceTypeEnum): Square[] => {
      return this.startingBoards.reduce((possibleSquares, board, boardNumber) => (
        board.reduce((possibleSquares, rank, rankY) => {
          let newSquares: Square[] = [];

          if (
            (rankY !== 0 && rankY !== 7)
            || pieceType !== PieceTypeEnum.PAWN
          ) {
            newSquares = rank
              .map((piece, fileX) => ({
                piece,
                board: boardNumber,
                x: fileX,
                y: rankY
              }))
              .filter(({ board, x, y, piece }) => (
                !piece
                && !this.getBoardPiece({ board: this.getNextBoard(board), x, y })
              ))
              .map(({ board, x, y }) => ({ board, x, y }));
          }

          return [
            ...possibleSquares,
            ...newSquares
          ];
        }, possibleSquares)
      ), [] as Square[]);
    };

    if (location.type === PieceLocationEnum.POCKET) {
      return getSquaresForDrop(location.pieceType);
    }

    const board = location.board;
    const piece = this.getBoardPiece(location)!;
    const {
      color: pieceColor,
      type: pieceType
    } = piece;
    const {
      x: pieceX,
      y: pieceY
    } = location;
    const opponentColor = this.getOppositeColor(pieceColor);
    const captureAllowed = (
      !this.isPatrol
      || onlyControlled
      || this.isPatrolledByFriendlyPiece(piece)
    );
    let possibleSquares: Square[] = [];
    const traverseDirection = (incrementY: 0 | 1 | -1, incrementX: 0 | 1 | -1) => {
      let rankY = pieceY;
      let fileX = pieceX;

      while (true) {
        rankY += incrementY;
        fileX += incrementX;

        const newRank = this.startingBoards[board][rankY];

        if (!newRank || !(fileX in newRank)) {
          break;
        }

        const square = {
          board,
          x: fileX,
          y: rankY
        };
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

    if (
      pieceType === PieceTypeEnum.KING
      || pieceType === PieceTypeEnum.QUEEN
      || pieceType === PieceTypeEnum.ROOK
    ) {
      traverseDirection(+1, 0);
      traverseDirection(-1, 0);
      traverseDirection(0, +1);
      traverseDirection(0, -1);
    }

    if (
      pieceType === PieceTypeEnum.KING
      || pieceType === PieceTypeEnum.QUEEN
      || pieceType === PieceTypeEnum.BISHOP
    ) {
      traverseDirection(+1, +1);
      traverseDirection(+1, -1);
      traverseDirection(-1, +1);
      traverseDirection(-1, -1);
    }

    if (pieceType === PieceTypeEnum.KNIGHT) {
      const increments = [
        [-2, -1],
        [-2, +1],
        [-1, -2],
        [-1, +2],
        [+1, -2],
        [+1, +2],
        [+2, -1],
        [+2, +1]
      ];

      increments.forEach(([incrementY, incrementX]) => {
        const rankY = pieceY + incrementY;
        const fileX = pieceX + incrementX;
        const rank = this.startingBoards[board][rankY];

        if (!rank || !(fileX in rank)) {
          return;
        }

        const square = {
          board,
          x: fileX,
          y: rankY
        };
        const pieceInSquare = this.getBoardPiece(square);

        if (!forMove || !pieceInSquare || pieceInSquare.color !== pieceColor) {
          possibleSquares.push(square);
        }
      });
    }

    if (pieceType === PieceTypeEnum.PAWN) {
      const direction = pieceColor === ColorEnum.WHITE ? 1 : -1;
      const rankY = pieceY + direction;
      const nextRank = this.startingBoards[board][rankY];

      if (pieceX in nextRank && forMove) {
        // 1-forward move
        const square = {
          board,
          x: pieceX,
          y: rankY
        };
        const pieceInSquare = this.getBoardPiece(square);

        if (!pieceInSquare) {
          possibleSquares.push(square);

          if (pieceColor === ColorEnum.WHITE ? pieceY === 1 : pieceY === 6) {
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

        if (fileX in nextRank) {
          const square = {
            board,
            x: fileX,
            y: rankY
          };
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
      this.getCastlingRooks(pieceColor)
        .filter(Boolean)
        .filter((rook) => {
          const { location } = rook!;
          const isKingSideRook = location.x - pieceX > 0;
          const newKingX = isKingSideRook ? 6 : 2;
          const newRookX = isKingSideRook ? 5 : 3;
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

          if (this.startingBoards.length > 1) {
            // a piece cannot move to a square that is occupied on the next board
            canRookMove = canRookMove && !this.getBoardPiece({
              board: this.getNextBoard(location.board),
              y: location.y,
              x: location.x
            });

            if (this.startingBoards.length > 2) {
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
                ? 6
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

    if (this.startingBoards.length > 1 && forMove) {
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

      if (this.startingBoards.length > 2) {
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

  getAllowedMoves(location: RealPieceLocation): Square[] {
    const possibleMoves = this.getPossibleMoves(location, false, false);

    if (this.isLeftInCheckAllowed && !this.isAtomic) {
      return possibleMoves;
    }

    return possibleMoves.filter((square) => {
      const { allowed, revertMove } = this.performMove({
        from: location,
        to: square,
        timestamp: 0,
        promotion: PieceTypeEnum.QUEEN
      }, false, true);

      revertMove();

      return allowed;
    });
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
        piece.color === ColorEnum.WHITE && toY === 7
      ) || (
        piece.color === ColorEnum.BLACK && toY === 0
      ))
    );
  }

  isInCheck(color: ColorEnum): boolean {
    return (
      !this.isLeftInCheckAllowed
      && this.kings[color].some((king) => (
        Game.isBoardPiece(king)
        && this.isAttackedByOpponentPiece(king.location, this.getOppositeColor(king.color))
      ))
    );
  }

  isAttackedByOpponentPiece(square: Square, opponentColor: ColorEnum): boolean {
    return this.getPieces(opponentColor).some((piece) => (
      Game.isBoardPiece(piece)
      && this.getPossibleMoves(piece.location, true, false).some((possibleSquare) => (
        Game.areSquaresEqual(possibleSquare, square)
      ))
    ));
  }

  isPatrolledByFriendlyPiece(piece: BoardPiece): boolean {
    const pieceLocation = piece.location;

    return this.getPieces(piece.color).some((piece) => (
      Game.isBoardPiece(piece)
      && this.getPossibleMoves(piece.location, true, true).some((square) => (
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

    return null;
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
    if (this.isKingOfTheHill || this.isMonsterChess) {
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

    if (
      this.isPatrol
      || this.isAtomic
      || this.isMadrasi
    ) {
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
      this.getAllowedMoves(piece.location).length === 0
    ));
  }

  isStalemate(): boolean {
    return !this.isCheck && this.isNoMoves();
  }
}
