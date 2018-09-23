import * as _ from 'lodash';
import {
  BaseMove,
  Board,
  BoardPiece,
  CenterSquareParams,
  ChatMessage,
  ColorEnum,
  Game as IGame,
  GameCreateSettings,
  GameKings,
  GamePieces,
  GamePlayers,
  GameResult,
  GameStatusEnum,
  GameVariantEnum,
  Move,
  Piece,
  PieceBoardLocation,
  PieceEnum,
  PieceLocationEnum,
  Pocket,
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
  boards: Board[];
  kings: GameKings;
  pieces: GamePieces;
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
        const getPiece = (type: PieceEnum): StartingPiece => ({
          id: ++id,
          type,
          color: y < 2
            ? ColorEnum.WHITE
            : ColorEnum.BLACK
        });

        if (y === 1 || y === 6) {
          return getPiece(PieceEnum.PAWN);
        }

        if (y === 0 || y === 7) {
          if (x === 0 || x === 7) {
            return getPiece(PieceEnum.ROOK);
          }

          if (x === 1 || x === 6) {
            return getPiece(PieceEnum.KNIGHT);
          }

          if (x === 2 || x === 5) {
            return getPiece(PieceEnum.BISHOP);
          }

          if (x === 3) {
            return getPiece(PieceEnum.QUEEN);
          }

          return getPiece(PieceEnum.KING);
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
    const pieces: (PieceEnum | null)[] = _.times(8, () => null);
    const darkColoredBishopPosition = 2 * Math.floor(4 * Math.random());
    const lightColoredBishopPosition = 2 * Math.floor(4 * Math.random()) + 1;

    pieces[darkColoredBishopPosition] = PieceEnum.BISHOP;
    pieces[lightColoredBishopPosition] = PieceEnum.BISHOP;

    const placePiece = (type: PieceEnum, position: number) => {
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

    placePiece(PieceEnum.QUEEN, queenPositionNumber);
    placePiece(PieceEnum.KNIGHT, knight1PositionNumber);
    placePiece(PieceEnum.KNIGHT, knight2PositionNumber);

    const restPieces = [PieceEnum.ROOK, PieceEnum.KING, PieceEnum.ROOK];
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
      PieceEnum.QUEEN,
      PieceEnum.ROOK,
      PieceEnum.KING,
      PieceEnum.ROOK,
      PieceEnum.BISHOP,
      PieceEnum.BISHOP,
      PieceEnum.KNIGHT,
      PieceEnum.KNIGHT
    ];
    */

    return _.times(8, (y) => (
      _.times(8, (x) => {
        const getPiece = (type: PieceEnum): StartingPiece => ({
          id: ++id,
          type,
          color: y < 2
            ? ColorEnum.WHITE
            : ColorEnum.BLACK
        });

        if (y === 1 || y === 6) {
          return getPiece(PieceEnum.PAWN);
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
            piece!.type !== PieceEnum.KING
            && (
              piece!.type !== PieceEnum.PAWN
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
    const kings = {} as GameKings;
    const pieces: GamePieces = {
      [ColorEnum.WHITE]: [],
      [ColorEnum.BLACK]: []
    };
    const boards = startingBoards.map((startingBoard, board) => (
      startingBoard.map((rank, y) => (
        rank.map((startingPiece, x) => {
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

          pieces[piece.color].push(piece);

          if (piece.type === PieceEnum.KING) {
            kings[piece.color] = piece;
          }

          return piece;
        })
      ))
    ));

    _.forEach(pieces, (pieces, color) => {
      // king first
      const king = kings[color as ColorEnum];

      pieces.splice(pieces.indexOf(king), 1);
      pieces.unshift(king);
    });

    return {
      boards,
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

  static isRealPiece(piece: Piece): piece is RealPiece {
    return !!piece.location;
  }

  id: string;
  startingBoards: StartingBoard[];
  boards: Board[];
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
  positionsMap: { [position: string]: number; } = {};
  positionString: string;
  pliesWithoutCaptureOrPawnMove: number = 0;
  kings: GameKings;
  pieces: GamePieces;
  pocket: Pocket = {
    [ColorEnum.WHITE]: {},
    [ColorEnum.BLACK]: {}
  } as Pocket;
  pocketPiecesUsed: PieceEnum[] = [
    PieceEnum.QUEEN,
    PieceEnum.ROOK,
    PieceEnum.BISHOP,
    PieceEnum.KNIGHT,
    PieceEnum.PAWN
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
      boards: this.boards,
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

    if (this.isPocketUsed) {
      this.pocketPiecesUsed.forEach((pieceType) => {
        _.forEach(this.pocket, (pocket) => {
          pocket[pieceType] = [];
        });
      });
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
    const king = this.kings[this.turn];
    const playerPocket = this.pocket[this.turn];
    const piece = fromLocation.type === PieceLocationEnum.BOARD
      ? this.boards[fromLocation.board][fromLocation.y][fromLocation.x]!
      : playerPocket[fromLocation.pieceType][0];
    const pieceType = piece.type;
    const toPiece = this.boards[toBoard][toY][toX];
    const isEnPassant = (
      fromLocation.type === PieceLocationEnum.BOARD
      && pieceType === PieceEnum.PAWN
      && Math.abs(fromLocation.x - toX) !== 0
      && !toPiece
    );
    const opponentColor = this.getOpponentColor();
    const opponentPiece = isEnPassant
      ? this.boards[this.possibleEnPassant!.board][this.possibleEnPassant!.y][this.possibleEnPassant!.x]
      : toPiece && toPiece.color === opponentColor
        ? toPiece
        : null;
    const isCapture = !!opponentPiece;
    const disappearedOrMovedPieces: BoardPiece[] = [];
    const isPawnPromotion = this.isPawnPromotion(move);
    const isMainPieceMovedOrDisappeared = this.isAtomic && isCapture;
    let isTeleportMove = false;
    let isAllowed = true;

    if (
      this.isLastChance
      && piece.type === PieceEnum.KING
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
      && pieceType === PieceEnum.KING
      && !isTeleportMove
      && (
        this.is960
          ? !!toPiece && toPiece.color === this.turn && toPiece.type === PieceEnum.ROOK
          : Math.abs(toX - fromLocation.x) > 1
      )
    );
    const isKingSideCastling = isCastling && toX - (fromLocation as PieceBoardLocation).x > 0;
    const castlingRook = isCastling
      ? this.is960
        ? toPiece!
        : this.boards[toBoard][toY][isKingSideCastling ? 7 : 0]!
      : null;

    const prevTurn = this.turn;
    const prevIsCheck = this.isCheck;
    const prevPliesWithoutCaptureOrPawnMove = this.pliesWithoutCaptureOrPawnMove;
    const prevPossibleEnPassant = this.possibleEnPassant;
    const prevTeleportUsed = this.teleportUsed[this.turn];
    const prevPieceMoved = piece.moved;
    const prevPieceType = pieceType;
    const prevPieceLocation = piece.location;
    const prevPieceOriginalType = piece.originalType;
    const playerPieces = this.pieces[this.turn];
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
      const board = this.boards[(fromLocation as PieceBoardLocation).board];

      if (toY - 1 in board) {
        const topRank = board[toY - 1];

        additionalSquares.push(topRank[toX - 1]);
        additionalSquares.push(topRank[toX]);
        additionalSquares.push(topRank[toX + 1]);
      }

      additionalSquares.push(board[toY][toX - 1]);
      additionalSquares.push(board[toY][toX]);
      additionalSquares.push(board[toY][toX + 1]);

      if (toY + 1 in board) {
        const bottomRank = board[toY + 1];

        additionalSquares.push(bottomRank[toX - 1]);
        additionalSquares.push(bottomRank[toX]);
        additionalSquares.push(bottomRank[toX + 1]);
      }

      additionalSquares.forEach((piece) => {
        if (piece && piece.type !== PieceEnum.PAWN) {
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
      location
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

        if (pieceType === PieceEnum.PAWN) {
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
      this.boards[disappearedOrMovedPiece.location.board][disappearedOrMovedPiece.location.y][disappearedOrMovedPiece.location.x] = null;
    });

    this.movesCount++;

    if (pieceType === PieceEnum.PAWN || isCapture) {
      this.pliesWithoutCaptureOrPawnMove = 0;
    } else {
      this.pliesWithoutCaptureOrPawnMove++;
    }

    if (isTeleportMove) {
      this.teleportUsed[this.turn] = true;
    }

    if (
      fromLocation.type === PieceLocationEnum.BOARD
      && pieceType === PieceEnum.PAWN
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
    } else {
      this.possibleEnPassant = null;
    }

    if (fromLocation.type === PieceLocationEnum.BOARD) {
      this.boards[fromLocation.board][fromLocation.y][fromLocation.x] = null;
    } else {
      playerPocket[fromLocation.pieceType].shift();
    }

    if (!isMainPieceMovedOrDisappeared) {
      this.boards[newLocation.board][newLocation.y][newLocation.x] = piece as BoardPiece;
      piece.moved = fromLocation.type === PieceLocationEnum.BOARD;
      piece.type = isPawnPromotion
        ? promotion!
        : pieceType;
      piece.originalType = isPawnPromotion && this.isPocketUsed
        ? piece.originalType
        : piece.type;
      piece.location = newLocation;
    }

    const removePieceOrMoveToOpponentPocket = (piece: BoardPiece) => {
      const playerPieces = this.pieces[piece.color];

      playerPieces.splice(playerPieces.indexOf(piece), 1);

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

        this.pocket[opponentColor][pieceType].push(piece as any as PocketPiece);
        this.pieces[opponentColor].push(piece);
      }
    };

    disappearedOrMovedPieces.forEach((disappearedOrMovedPiece) => {
      const {
        id,
        type,
        color,
        location
      } = disappearedOrMovedPiece;
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

        if (type === PieceEnum.KING) {
          // don't allow the king to be reborn if he was exploded on the initial square
          if (oldSquare.x !== 4 || oldSquare.y !== pieceRankY) {
            newSquare = {
              board: location.board,
              x: 4,
              y: pieceRankY
            };
          }
        } else if (type === PieceEnum.QUEEN) {
          newSquare = {
            board: location.board,
            x: 3,
            y: pieceRankY
          };
        } else if (type === PieceEnum.PAWN) {
          newSquare = {
            board: location.board,
            x: oldSquare.x,
            y: color === ColorEnum.WHITE
              ? 1
              : 6
          };
        } else {
          const squareColor = (oldSquare.x + oldSquare.y) % 2;
          const choicesX = type === PieceEnum.ROOK
            ? [0, 7]
            : type === PieceEnum.KNIGHT
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
          const piece = this.boards[newSquare.board][newSquare.y][newSquare.x];

          // don't allow rebirth if it takes place on the square with another piece
          if (piece) {
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
        this.boards[newSquare.board][newSquare.y][newSquare.x] = disappearedOrMovedPiece;
      } else {
        removePieceOrMoveToOpponentPocket(disappearedOrMovedPiece);
      }
    });

    const setMoveIsAllowed = () => {
      if (checkIfAllowed) {
        isAllowed = isAllowed && (
          this.isAtomic
            ? this.boards[king.location.board][king.location.y][king.location.x] === king
            : !this.isAttackedByOpponentPiece(king.location, opponentColor)
        );
      }
    };

    if (this.isAliceChess && piece === king) {
      setMoveIsAllowed();
    }

    if (this.isAliceChess) {
      const nextBoard = this.getNextBoard(toBoard);
      const boardAfterNext = this.getNextBoard(nextBoard);

      if (!isMainPieceMovedOrDisappeared && fromLocation.type === PieceLocationEnum.BOARD) {
        this.boards[newLocation.board][newLocation.y][newLocation.x] = null;
        newLocation = {
          ...newLocation,
          board: nextBoard
        };
        piece.location = newLocation;
        this.boards[newLocation.board][newLocation.y][newLocation.x] = piece as BoardPiece;
      }

      disappearedOrMovedPieces.forEach((disappearedOrMovedPiece, ix) => {
        const playerPieces = this.pieces[disappearedOrMovedPiecesData[ix].color];
        const moved = _.includes(playerPieces, disappearedOrMovedPiece);
        const {
          x: pieceX,
          y: pieceY
        } = disappearedOrMovedPiece.location;

        if (moved) {
          const prevBoardSquare = disappearedOrMovedPiece.location;
          const nextBoardSquare = {
            ...prevBoardSquare,
            board: nextBoard
          };
          const piece = this.boards[nextBoardSquare.board][nextBoardSquare.y][nextBoardSquare.x];

          this.boards[prevBoardSquare.board][pieceY][pieceX] = null;

          // don't allow move to the next board if the square there or on the next board is occupied by another piece
          if (piece || this.boards[boardAfterNext][pieceY][pieceX]) {
            removePieceOrMoveToOpponentPocket(disappearedOrMovedPiece);
          } else {
            disappearedOrMovedPiece.location = nextBoardSquare;
            this.boards[nextBoardSquare.board][nextBoardSquare.y][nextBoardSquare.x] = disappearedOrMovedPiece;
          }
        }
      });
    }

    this.turn = this.getNextTurn();
    this.isCheck = this.isInCheck(this.kings[this.turn]);

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
        this.teleportUsed[this.turn] = prevTeleportUsed;
        this.movesCount--;

        if (!isMainPieceMovedOrDisappeared) {
          this.boards[newLocation.board][newLocation.y][newLocation.x] = null;
          piece.location = prevPieceLocation;
          piece.moved = prevPieceMoved;
          piece.type = prevPieceType;
          piece.originalType = prevPieceOriginalType;
        }

        if (fromLocation.type === PieceLocationEnum.BOARD) {
          this.boards[fromLocation.board][fromLocation.y][fromLocation.x] = piece as BoardPiece;
        } else {
          playerPocket[fromLocation.pieceType].unshift(piece as PocketPiece);
        }

        disappearedOrMovedPiecesData.forEach(({ moved, color, type, location }, ix) => {
          const disappearedOrMovedPiece = disappearedOrMovedPieces[ix];
          const playerPieces = this.pieces[color];
          const disappeared = !_.includes(playerPieces, disappearedOrMovedPiece);

          if (disappeared) {
            playerPieces.push(disappearedOrMovedPiece);
          } else {
            const pieceInSquare = this.boards[disappearedOrMovedPiece.location.board][disappearedOrMovedPiece.location.y][disappearedOrMovedPiece.location.x];

            if (pieceInSquare && pieceInSquare.id === disappearedOrMovedPiece.id) {
              this.boards[disappearedOrMovedPiece.location.board][disappearedOrMovedPiece.location.y][disappearedOrMovedPiece.location.x] = null;
            }
          }

          disappearedOrMovedPiece.moved = moved;
          disappearedOrMovedPiece.color = color;
          disappearedOrMovedPiece.type = type;
          disappearedOrMovedPiece.location = location;

          if (disappeared && this.isPocketUsed && _.includes(this.pocketPiecesUsed, disappearedOrMovedPiece.originalType)) {
            const opponentColor = this.getOppositeColor(color);
            const opponentPieces = this.pieces[opponentColor];

            this.pocket[opponentColor][disappearedOrMovedPiece.originalType].pop();
            opponentPieces.splice(opponentPieces.indexOf(disappearedOrMovedPiece), 1);
          }

          this.boards[location.board][location.y][location.x] = disappearedOrMovedPiece;
        });
      }
    };
  }

  generatePositionString(): string {
    return JSON.stringify([
      this.turn,
      // en passant square
      this.possibleEnPassant,
      // white queen-side castling is possible
      (
        !this.kings[ColorEnum.WHITE].moved
        && !!this.boards[0][0][0]
        && !this.boards[0][0][0]!.moved
      ),
      // white king-side castling is possible
      (
        !this.kings[ColorEnum.WHITE].moved
        && !!this.boards[0][0][7]
        && !this.boards[0][0][7]!.moved
      ),
      // black queen-side castling is possible
      (
        !this.kings[ColorEnum.BLACK].moved
        && !!this.boards[0][7][0]
        && !this.boards[0][7][0]!.moved
      ),
      // black king-side castling is possible
      (
        !this.kings[ColorEnum.BLACK].moved
        && !!this.boards[0][7][7]
        && !this.boards[0][7][7]!.moved
      ),
      this.boards.map((board) => (
        board.map((rank) => (
          rank.map((piece) => (
            piece && [piece.type, piece.color]
          ))
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
    return (board + 1) % this.boards.length;
  }

  getOpponentColor(): ColorEnum {
    return this.getOppositeColor(this.turn);
  }

  getPossibleMoves(location: RealPieceLocation, onlyAttacked: boolean, onlyControlled: boolean): Square[] {
    const forMove = !onlyControlled && !onlyAttacked;
    const getSquaresForDrop = (pieceType: PieceEnum): Square[] => {
      return this.boards.reduce((possibleSquares, board, boardNumber) => (
        board.reduce((possibleSquares, rank, rankY) => {
          let newSquares: Square[] = [];

          if (
            (rankY !== 0 && rankY !== 7)
            || pieceType !== PieceEnum.PAWN
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
                && !this.boards[this.getNextBoard(board)][y][x]
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
    const piece = this.boards[location.board][location.y][location.x]!;
    const {
      color: pieceColor,
      type: pieceType
    } = piece;
    const {
      x: pieceX,
      y: pieceY
    } = location;
    const opponentColor = this.getOppositeColor(pieceColor);
    let possibleSquares: Square[] = [];
    const traverseDirection = (incrementY: 0 | 1 | -1, incrementX: 0 | 1 | -1) => {
      let rankY = pieceY;
      let fileX = pieceX;

      while (true) {
        rankY += incrementY;
        fileX += incrementX;

        const newRank = this.boards[board][rankY];

        if (!newRank || !(fileX in newRank)) {
          break;
        }

        const square = {
          board,
          x: fileX,
          y: rankY
        };
        const pieceInSquare = newRank[fileX];

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

        if (pieceType === PieceEnum.KING) {
          break;
        }
      }
    };

    if (
      pieceType === PieceEnum.KING
      || pieceType === PieceEnum.QUEEN
      || pieceType === PieceEnum.ROOK
    ) {
      traverseDirection(+1, 0);
      traverseDirection(-1, 0);
      traverseDirection(0, +1);
      traverseDirection(0, -1);
    }

    if (
      pieceType === PieceEnum.KING
      || pieceType === PieceEnum.QUEEN
      || pieceType === PieceEnum.BISHOP
    ) {
      traverseDirection(+1, +1);
      traverseDirection(+1, -1);
      traverseDirection(-1, +1);
      traverseDirection(-1, -1);
    }

    if (pieceType === PieceEnum.KNIGHT) {
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
        const rank = this.boards[board][rankY];

        if (!rank || !(fileX in rank)) {
          return;
        }

        const pieceInSquare = rank[fileX];

        if (!forMove || !pieceInSquare || pieceInSquare.color !== pieceColor) {
          possibleSquares.push({
            board,
            x: fileX,
            y: rankY
          });
        }
      });
    }

    if (pieceType === PieceEnum.PAWN) {
      const direction = pieceColor === ColorEnum.WHITE ? 1 : -1;
      const rankY = pieceY + direction;
      const nextRank = this.boards[board][rankY];

      if (pieceX in nextRank && forMove) {
        // 1-forward move
        const squarePiece = nextRank[pieceX];

        if (!squarePiece) {
          possibleSquares.push({
            board,
            x: pieceX,
            y: rankY
          });

          if (pieceColor === ColorEnum.WHITE ? pieceY === 1 : pieceY === 6) {
            // 2-forward move
            const squarePiece = this.boards[board][rankY + direction][pieceX];

            if (!squarePiece) {
              possibleSquares.push({
                board,
                x: pieceX,
                y: rankY + direction
              });
            }
          }
        }
      }

      [1, -1].forEach((incrementX) => {
        // capture
        const fileX = pieceX + incrementX;

        if (fileX in nextRank) {
          const pieceInSquare = nextRank[fileX];

          if (!forMove || (pieceInSquare && pieceInSquare.color !== pieceColor)) {
            possibleSquares.push({
              board,
              x: fileX,
              y: rankY
            });
          }
        }
      });

      if (
        this.possibleEnPassant
        && this.possibleEnPassant.board === board
        && pieceY + direction === this.possibleEnPassant.y
        && Math.abs(pieceX - this.possibleEnPassant.x) === 1
      ) {
        // en passant
        possibleSquares.push(this.possibleEnPassant);
      }
    }

    if (
      forMove
      && this.isLastChance
      && !this.isCheck
      && pieceType === PieceEnum.KING
      && !this.teleportUsed[pieceColor]
    ) {
      possibleSquares.push(
        ...getSquaresForDrop(pieceType).filter((square) => square.board === board)
      );
    }

    if (pieceType === PieceEnum.KING && !piece.moved && !this.isCheck && forMove) {
      this.boards[board][pieceY]
        .filter((rook) => (
          rook
          && rook.color === pieceColor
          && rook.type === PieceEnum.ROOK
          && !rook.moved
        ))
        .filter((rook) => {
          const { location } = rook!;
          const isKingSideRook = location.x - pieceX > 0;
          const newKingX = isKingSideRook ? 6 : 2;
          const newRookX = isKingSideRook ? 5 : 3;
          let canKingMove = true;

          _.times(Math.abs(pieceX - newKingX), (x) => {
            const fileX = newKingX + (pieceX > newKingX ? +x : -x);

            // square is attacked or square is a piece that is not the rook
            if ((
              fileX !== newKingX
              && !this.isLeftInCheckAllowed
              && this.isAttackedByOpponentPiece({ board, x: fileX, y: pieceY }, opponentColor)
            ) || (
              this.boards[board][pieceY][fileX]
              && this.boards[board][pieceY][fileX] !== rook
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

            // square is a piece that is not the king
            if (
              this.boards[board][pieceY][fileX]
              && this.boards[board][pieceY][fileX] !== piece
            ) {
              canRookMove = false;
            }
          });

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
        const pieceInSquare = this.boards[square.board][square.y][square.x];

        return (
          !!pieceInSquare
          && pieceInSquare.color !== pieceColor
          && pieceInSquare.type === pieceType
        );
      })
    ) {
      return [];
    }

    if (this.boards.length > 1) {
      // a piece cannot move to a square that is occupied on the next board
      possibleSquares = possibleSquares.filter(({ board, x, y }) => (
        !this.boards[this.getNextBoard(board)][y][x]
      ));
    }

    if (this.boards.length > 2) {
      // a piece cannot move to a square that is occupied on the next board after the next board
      possibleSquares = possibleSquares.filter(({ board, x, y }) => (
        !this.boards[this.getNextBoard(board)][y][x]
      ));
    }

    if (
      this.isPatrol
      && !onlyControlled
      && !this.isPatrolledByFriendlyPiece(location)
    ) {
      return possibleSquares.filter((square) => (
        !this.boards[square.board][square.y][square.x]
      ));
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
        promotion: PieceEnum.QUEEN
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
      ? this.boards[fromLocation.board][fromLocation.y][fromLocation.x]!
      : null!;

    return (
      fromLocation.type === PieceLocationEnum.BOARD
      && piece.type === PieceEnum.PAWN
      && ((
        piece.color === ColorEnum.WHITE && toY === 7
      ) || (
        piece.color === ColorEnum.BLACK && toY === 0
      ))
    );
  }

  isInCheck(king: BoardPiece): boolean {
    return (
      !this.isLeftInCheckAllowed
      && (
        this.isMonsterChess && this.movesCount === 2
          ? false
          : this.isAttackedByOpponentPiece(king.location, this.getOppositeColor(king.color))
      )
    );
  }

  isAttackedByOpponentPiece(square: Square, opponentColor: ColorEnum): boolean {
    return this.pieces[opponentColor]
      .filter(Game.isBoardPiece)
      .some((piece) => (
        this.getPossibleMoves(piece.location, true, false).some(({ x, y }) => (
          square.x === x
          && square.y === y
        ))
      ));
  }

  isPatrolledByFriendlyPiece(square: Square): boolean {
    return this.pieces[this.boards[square.board][square.y][square.x]!.color]
      .filter(Game.isBoardPiece)
      .some((piece) => (
        this.getPossibleMoves(piece.location, true, true).some(({ x, y }) => (
          square.x === x
          && square.y === y
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

    if (this.isAtomic && !this.isKingOnTheBoard()) {
      return ResultReasonEnum.KING_EXPLODED;
    }

    if (this.isMonsterChess && !this.isKingOnTheBoard()) {
      return ResultReasonEnum.KING_CAPTURED;
    }

    return null;
  }

  isKingInTheCenter(): boolean {
    const king = this.kings[this.getPrevTurn()];

    return !!this.getCenterSquareParams(king.location);
  }

  isKingOnTheBoard(): boolean {
    const king = this.kings[this.turn];

    return (
      king.location.type === PieceLocationEnum.BOARD
      && this.boards[king.location.board][king.location.y][king.location.x] === king
    );
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

    const pieces = _
      .sortBy([
        this.pieces[ColorEnum.WHITE],
        this.pieces[ColorEnum.BLACK]
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
      && pieces[1][1].type === PieceEnum.KNIGHT
    ) {
      return true;
    }

    const possibleBishopColor = pieces[1][1].location.x % 2 + pieces[1][1].location.y % 2;

    return pieces.every((pieces) => (
      pieces.slice(1).every(({ type, location }) => (
        type === PieceEnum.BISHOP
        && location.x % 2 + location.y % 2 === possibleBishopColor
      ))
    ));
  }

  isNoMoves(): boolean {
    return this.pieces[this.turn]
      .filter(Game.isRealPiece)
      .every((piece) => (
        this.getAllowedMoves(piece.location).length === 0
      ));
  }

  isStalemate(): boolean {
    return !this.isCheck && this.isNoMoves();
  }
}
