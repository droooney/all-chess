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
import { PIECE_LITERALS, SHORT_PIECE_NAMES } from '../constants';

interface BoardData {
  board: Board;
  kings: GameKings;
  pieces: GamePieces;
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

  static getStartingBoard(settings: GameCreateSettings): StartingBoard {
    const startingBoard = _.includes(settings.variants, GameVariantEnum.CHESS_960)
      ? this.generateStarting960Board()
      : this.classicStartingBoard;

    if (_.includes(settings.variants, GameVariantEnum.MONSTER_CHESS)) {
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

    return startingBoard;
  }

  static generateBoardDataFromStartingBoard(startingBoard: StartingBoard): BoardData {
    const kings = {} as GameKings;
    const pieces: GamePieces = {
      [ColorEnum.WHITE]: [],
      [ColorEnum.BLACK]: []
    };
    const board = startingBoard.map((rank, y) => (
      rank.map((startingPiece, x) => {
        if (!startingPiece) {
          return null;
        }

        const piece: BoardPiece = {
          ...startingPiece,
          originalType: startingPiece.type,
          location: {
            type: PieceLocationEnum.BOARD,
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
    ));

    _.forEach(pieces, (pieces, color) => {
      // king first
      const king = kings[color as ColorEnum];

      pieces.splice(pieces.indexOf(king), 1);
      pieces.unshift(king);
    });

    return {
      board,
      kings,
      pieces
    };
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
  startingBoard: StartingBoard;
  board: Board;
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
  isLeftInCheckAllowed: boolean;
  variants: GameVariantEnum[];

  constructor(settings: GameCreateSettings & { id: string; startingBoard?: StartingBoard; }) {
    this.id = settings.id;
    this.startingBoard = settings.startingBoard || Game.getStartingBoard(settings);
    ({
      board: this.board,
      pieces: this.pieces,
      kings: this.kings
    } = Game.generateBoardDataFromStartingBoard(this.startingBoard));

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
    this.isLeftInCheckAllowed = this.isAtomic || this.isMonsterChess;

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
    } = this.performMove(move, true);

    this.moves.push({
      ...move,
      algebraic,
      figurine,
      revertMove
    });

    this.positionString = this.generatePositionString();
    this.positionsMap[this.positionString] = (this.positionsMap[this.positionString] || 0) + 1;

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

  performMove(move: Move, constructMoveLiterals: boolean): { algebraic: string; figurine: string; revertMove(): void; } {
    const {
      from: fromLocation,
      to: toLocation,
      to: {
        x: toX,
        y: toY
      },
      promotion
    } = move;
    const playerPocket = this.pocket[this.turn];
    const piece = fromLocation.type === PieceLocationEnum.BOARD
      ? this.board[fromLocation.y][fromLocation.x]!
      : playerPocket[fromLocation.pieceType][0];
    const pieceType = piece.type;
    const toPiece = this.board[toY][toX];
    const isEnPassant = (
      fromLocation.type === PieceLocationEnum.BOARD
      && pieceType === PieceEnum.PAWN
      && Math.abs(fromLocation.x - toX) !== 0
      && !toPiece
    );
    const opponentColor = this.getOpponentColor();
    const opponentPiece = isEnPassant
      ? this.board[this.possibleEnPassant!.y][this.possibleEnPassant!.x]
      : toPiece && toPiece.color === opponentColor
        ? toPiece
        : null;
    const isCapture = !!opponentPiece;
    const disappearedOrMovedPieces: BoardPiece[] = [];
    const isPawnPromotion = this.isPawnPromotion(move);
    const isMainPieceMovedOrDisappeared = this.isAtomic && isCapture;
    let isTeleportMove = false;

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
        : this.board[toY][isKingSideCastling ? 7 : 0]!
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
    const newLocation: PieceBoardLocation = {
      ...(
        isCastling
          ? isKingSideCastling
            ? { x: 6, y: toY }
            : { x: 2, y: toY }
          : toLocation
      ),
      type: PieceLocationEnum.BOARD
    };

    if (this.isAtomic && isCapture) {
      const additionalSquares: (BoardPiece | null | undefined)[] = [];

      if (toY - 1 in this.board) {
        const topRank = this.board[toY - 1];

        additionalSquares.push(topRank[toX - 1]);
        additionalSquares.push(topRank[toX]);
        additionalSquares.push(topRank[toX + 1]);
      }

      additionalSquares.push(this.board[toY][toX - 1]);
      additionalSquares.push(this.board[toY][toX]);
      additionalSquares.push(this.board[toY][toX + 1]);

      if (toY + 1 in this.board) {
        const bottomRank = this.board[toY + 1];

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
        const destination = Game.getFileLiteral(toX) + Game.getRankLiteral(toY);

        algebraic += `${SHORT_PIECE_NAMES[pieceType]}@${destination}`;
        figurine += `${PIECE_LITERALS[piece.color][pieceType]}@${destination}`;
      } else if (isCastling) {
        const castling = isKingSideCastling ? 'O-O' : 'O-O-O';

        algebraic += castling;
        figurine += castling;
      } else {
        const {
          x: fromX,
          y: fromY
        } = fromLocation;

        if (pieceType !== PieceEnum.PAWN) {
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
            const areSameFile = otherPiecesAbleToMakeMove.some(({ location: { x, y } }) => (
              x === fromX
              && y !== fromY
            ));
            const areSameRank = otherPiecesAbleToMakeMove.some(({ location: { x, y } }) => (
              y === fromY
              && x !== fromX
            ));
            const fileLiteral = Game.getFileLiteral(fromX);
            const rankLiteral = Game.getRankLiteral(fromY);

            if (areSameFile && areSameRank) {
              algebraic += fileLiteral + rankLiteral;
              figurine += fileLiteral + rankLiteral;
            } else if (areSameFile) {
              algebraic += rankLiteral;
              figurine += rankLiteral;
            } else {
              algebraic += fileLiteral;
              figurine += fileLiteral;
            }
          }
        } else if (isCapture) {
          const file = Game.getFileLiteral(fromX);

          algebraic += file;
          figurine += file;
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
      this.board[disappearedOrMovedPiece.location.y][disappearedOrMovedPiece.location.x] = null;
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
      && (
        !this.isMonsterChess
        || this.movesCount % 3 !== 1
      )
    ) {
      this.possibleEnPassant = {
        x: toX,
        y: Math.round((toY + fromLocation.y) / 2)
      };
    } else {
      this.possibleEnPassant = null;
    }

    if (fromLocation.type === PieceLocationEnum.BOARD) {
      this.board[fromLocation.y][fromLocation.x] = null;
    } else {
      playerPocket[fromLocation.pieceType].shift();
    }

    if (!isMainPieceMovedOrDisappeared) {
      this.board[newLocation.y][newLocation.x] = piece as BoardPiece;
      piece.moved = true;
      piece.type = isPawnPromotion
        ? promotion!
        : pieceType;
      piece.originalType = isPawnPromotion && this.isPocketUsed
        ? piece.originalType
        : piece.type;
      piece.location = newLocation;
    }

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
              x: 4,
              y: pieceRankY
            };
          }
        } else if (type === PieceEnum.QUEEN) {
          newSquare = {
            x: 3,
            y: pieceRankY
          };
        } else if (type === PieceEnum.PAWN) {
          newSquare = {
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
            x: fileX,
            y: pieceRankY
          };
        }

        if (newSquare) {
          const piece = this.board[newSquare.y][newSquare.x];

          // don't allow rebirth if it takes place on the square with another piece
          if (piece) {
            newSquare = null;
          }
        }
      }

      if (newSquare) {
        disappearedOrMovedPiece.moved = false;
        disappearedOrMovedPiece.location = {
          ...newSquare,
          type: PieceLocationEnum.BOARD
        };
        this.board[newSquare.y][newSquare.x] = disappearedOrMovedPiece;
      } else {
        const playerPieces = this.pieces[disappearedOrMovedPiece.color];

        playerPieces.splice(playerPieces.indexOf(disappearedOrMovedPiece), 1);

        if (this.isPocketUsed && _.includes(this.pocketPiecesUsed, disappearedOrMovedPiece.originalType)) {
          const pieceType = disappearedOrMovedPiece.originalType;
          const opponentColor = this.getOppositeColor(disappearedOrMovedPiece.color);

          disappearedOrMovedPiece.moved = false;
          disappearedOrMovedPiece.type = pieceType;
          disappearedOrMovedPiece.color = opponentColor;
          (disappearedOrMovedPiece as any as PocketPiece).location = {
            type: PieceLocationEnum.POCKET,
            pieceType
          };

          this.pocket[opponentColor][pieceType].push(disappearedOrMovedPiece as any as PocketPiece);
          this.pieces[opponentColor].push(disappearedOrMovedPiece);
        }
      }
    });

    this.turn = this.getNextTurn();
    this.isCheck = this.isInCheck(this.kings[this.turn]);

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
          this.board[newLocation.y][newLocation.x] = null;
          piece.location = prevPieceLocation;
          piece.moved = prevPieceMoved;
          piece.type = prevPieceType;
          piece.originalType = prevPieceOriginalType;
        }

        if (fromLocation.type === PieceLocationEnum.BOARD) {
          this.board[fromLocation.y][fromLocation.x] = piece as BoardPiece;
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
            const pieceInSquare = this.board[disappearedOrMovedPiece.location.y][disappearedOrMovedPiece.location.x];

            if (pieceInSquare && pieceInSquare.id === disappearedOrMovedPiece.id) {
              this.board[disappearedOrMovedPiece.location.y][disappearedOrMovedPiece.location.x] = null;
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

          this.board[location.y][location.x] = disappearedOrMovedPiece;
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
        && !!this.board[0][0]
        && !this.board[0][0]!.moved
      ),
      // white king-side castling is possible
      (
        !this.kings[ColorEnum.WHITE].moved
        && !!this.board[0][7]
        && !this.board[0][7]!.moved
      ),
      // black queen-side castling is possible
      (
        !this.kings[ColorEnum.BLACK].moved
        && !!this.board[7][0]
        && !this.board[7][0]!.moved
      ),
      // black king-side castling is possible
      (
        !this.kings[ColorEnum.BLACK].moved
        && !!this.board[7][7]
        && !this.board[7][7]!.moved
      ),
      _.map(this.board, (rank) => (
        _.map(rank, (piece) => (
          piece && [piece.type, piece.color]
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

  getOpponentColor(): ColorEnum {
    return this.getOppositeColor(this.turn);
  }

  getPossibleMoves(location: RealPieceLocation, onlyAttacked: boolean, onlyControlled: boolean): Square[] {
    const forMove = !onlyControlled && !onlyAttacked;
    const getSquaresForDrop = (pieceType: PieceEnum): Square[] => {
      return this.board.reduce((possibleSquares, rank, rankY) => {
        let newSquares: Square[] = [];

        if (
          (rankY !== 0 && rankY !== 7)
          || pieceType !== PieceEnum.PAWN
        ) {
          newSquares = rank
            .map((piece, fileX) => ({
              piece,
              x: fileX,
              y: rankY
            }))
            .filter(({ piece }) => !piece)
            .map(({ x, y }) => ({ x, y }));
        }

        return [
          ...possibleSquares,
          ...newSquares
        ];
      }, [] as Square[]);
    };

    if (location.type === PieceLocationEnum.POCKET) {
      return getSquaresForDrop(location.pieceType);
    }

    const piece = this.board[location.y][location.x]!;
    const {
      color: pieceColor,
      type: pieceType
    } = piece;
    const {
      x: pieceX,
      y: pieceY
    } = location;
    const opponentColor = this.getOppositeColor(pieceColor);
    const possibleSquares: Square[] = [];
    const traverseDirection = (incrementY: 0 | 1 | -1, incrementX: 0 | 1 | -1) => {
      let rankY = pieceY;
      let fileX = pieceX;

      while (true) {
        rankY += incrementY;
        fileX += incrementX;

        const newRank = this.board[rankY];

        if (!newRank || !(fileX in newRank)) {
          break;
        }

        const square = {
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
        const rank = this.board[rankY];

        if (!rank || !(fileX in rank)) {
          return;
        }

        const pieceInSquare = rank[fileX];

        if (!forMove || !pieceInSquare || pieceInSquare.color !== pieceColor) {
          possibleSquares.push({
            x: fileX,
            y: rankY
          });
        }
      });
    }

    if (pieceType === PieceEnum.PAWN) {
      const direction = pieceColor === ColorEnum.WHITE ? 1 : -1;
      const rankY = pieceY + direction;
      const nextRank = this.board[rankY];

      if (pieceX in nextRank && forMove) {
        // 1-forward move
        const squarePiece = nextRank[pieceX];

        if (!squarePiece) {
          possibleSquares.push({
            x: pieceX,
            y: rankY
          });

          if (pieceColor === ColorEnum.WHITE ? pieceY === 1 : pieceY === 6) {
            // 2-forward move
            const squarePiece = this.board[rankY + direction][pieceX];

            if (!squarePiece) {
              possibleSquares.push({
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
              x: fileX,
              y: rankY
            });
          }
        }
      });

      if (
        this.possibleEnPassant
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
      possibleSquares.push(...getSquaresForDrop(pieceType));
    }

    if (pieceType === PieceEnum.KING && !piece.moved && !this.isCheck && forMove) {
      this.board[pieceY]
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
              && this.isAttackedByOpponentPiece({ x: fileX, y: pieceY }, opponentColor)
            ) || (
              this.board[pieceY][fileX]
              && this.board[pieceY][fileX] !== rook
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
              this.board[pieceY][fileX]
              && this.board[pieceY][fileX] !== piece
            ) {
              canRookMove = false;
            }
          });

          return canRookMove;
        })
        .forEach((rook) => {
          const { location } = rook!;
          const isKingSideRook = location.x - pieceX > 0;

          if (this.is960) {
            possibleSquares.push({
              x: location.x,
              y: pieceY
            });
          } else {
            possibleSquares.push({
              x: isKingSideRook ? 6 : 2,
              y: pieceY
            });
          }
        });
    }

    if (
      this.isMadrasi
      && possibleSquares.some((square) => {
        const pieceInSquare = this.board[square.y][square.x];

        return (
          !!pieceInSquare
          && pieceInSquare.color !== pieceColor
          && pieceInSquare.type === pieceType
        );
      })
    ) {
      return [];
    }

    if (
      this.isPatrol
      && !onlyControlled
      && !this.isPatrolledByFriendlyPiece(location)
    ) {
      return possibleSquares.filter((square) => (
        !this.board[square.y][square.x]
      ));
    }

    return possibleSquares;
  }

  getAllowedMoves(location: RealPieceLocation): Square[] {
    const possibleMoves = this.getPossibleMoves(location, false, false);

    if (this.isLeftInCheckAllowed && !this.isAtomic) {
      return possibleMoves;
    }

    const king = this.kings[this.turn];
    const opponentColor = this.getOpponentColor();

    return possibleMoves.filter((square) => {
      const { revertMove } = this.performMove({
        from: location,
        to: square,
        timestamp: 0,
        promotion: PieceEnum.QUEEN
      }, false);
      const isMoveAllowed = this.isAtomic
        ? this.board[king.location.y][king.location.x] === king
        : !this.isAttackedByOpponentPiece(king.location, opponentColor);

      revertMove();

      return isMoveAllowed;
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
      ? this.board[fromLocation.y][fromLocation.x]!
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
    return this.pieces[this.board[square.y][square.x]!.color]
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
      && this.board[king.location.y][king.location.x] === king
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
