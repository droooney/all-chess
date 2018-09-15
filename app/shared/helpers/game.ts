import * as _ from 'lodash';
import {
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
      || !_.includes(variants, GameVariantEnum.CRAZYHOUSE)
    ) && (
      !_.includes(variants, GameVariantEnum.CIRCE)
      || !_.includes(variants, GameVariantEnum.CHESS_960)
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
    if (_.includes(settings.variants, GameVariantEnum.CHESS_960)) {
      return this.generateStarting960Board();
    }

    return this.classicStartingBoard;
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

        const piece = {
          ...startingPiece,
          originalType: startingPiece.type,
          location: {
            type: PieceLocationEnum.BOARD,
            x,
            y
          } as PieceBoardLocation,
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
  isPocketUsed: boolean;
  is960: boolean;
  isKingOfTheHill: boolean;
  isAtomic: boolean;
  isCirce: boolean;
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
    this.isLeftInCheckAllowed = this.isAtomic;

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
      this.end(this.getOpponentColor(), winReason);
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
    const isPawnPromotion = pieceType === PieceEnum.PAWN && ((
      this.turn === ColorEnum.WHITE && toY === 7
    ) || (
      this.turn === ColorEnum.BLACK && toY === 0
    ));
    const isCastling = (
      fromLocation.type === PieceLocationEnum.BOARD
      && pieceType === PieceEnum.KING
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
    const prevCastlingRookLocation = castlingRook
      ? castlingRook.location
      : null;
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

    let algebraic = '';
    let figurine = '';

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

    // in case of longer en passant on bigger boards in the future
    if (opponentPiece && !_.includes(disappearedOrMovedPieces, opponentPiece)) {
      disappearedOrMovedPieces.push(opponentPiece);
    }

    if (this.isAtomic && isCapture && !_.includes(disappearedOrMovedPieces, piece)) {
      disappearedOrMovedPieces.push(piece as BoardPiece);
    }

    const disappearedOrMovedPiecesData = disappearedOrMovedPieces.map(({ moved, color, type, location }) => ({
      moved,
      color,
      type,
      location
    }));
    const movedPiecesLocations = disappearedOrMovedPieces.map(({ id, type, color, location }) => {
      let newLocation: Square | null = null;

      if (this.isCirce) {
        const pieceRankY = color === ColorEnum.WHITE
          ? 0
          : 7;

        if (type === PieceEnum.KING) {
          // don't allow the king to be reborn if he was exploded on the initial square
          if (location.x !== 4 || location.y !== pieceRankY) {
            newLocation = {
              x: 4,
              y: pieceRankY
            };
          }
        } else if (type === PieceEnum.QUEEN) {
          newLocation = {
            x: 3,
            y: pieceRankY
          };
        } else if (type === PieceEnum.PAWN) {
          newLocation = {
            x: location.x,
            y: color === ColorEnum.WHITE
              ? 1
              : 6
          };
        } else {
          const squareColor = (location.x + location.y) % 2;
          const choicesX = type === PieceEnum.ROOK
            ? [0, 7]
            : type === PieceEnum.KNIGHT
              ? [1, 6]
              : [2, 5];
          const fileX = _.find(choicesX, (fileX) => (fileX + pieceRankY) % 2 === squareColor)!;

          newLocation = {
            x: fileX,
            y: pieceRankY
          };
        }

        if (newLocation) {
          const piece = this.board[newLocation.y][newLocation.x];

          // don't allow rebirth if it takes place on the square with another piece
          if (piece && piece.id !== id) {
            newLocation = null;
          }
        }
      }

      return newLocation;
    });

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

        const destination = Game.getFileLiteral(toX) + Game.getRankLiteral(toY);

        algebraic += destination;
        figurine += destination;

        if (isPawnPromotion) {
          algebraic += `=${SHORT_PIECE_NAMES[promotion!]}`;
          figurine += `=${PIECE_LITERALS[piece.color][promotion!]}`;
        }
      }
    }

    disappearedOrMovedPieces.forEach((disappearedPiece, ix) => {
      if (!movedPiecesLocations[ix]) {
        const playerPieces = this.pieces[disappearedPiece.color];
        const opponentColor = this.getOppositeColor(disappearedPiece.color);

        playerPieces.splice(playerPieces.indexOf(disappearedPiece), 1);

        this.board[disappearedPiece.location.y][disappearedPiece.location.x] = null;

        if (this.isPocketUsed && _.includes(this.pocketPiecesUsed, disappearedPiece.originalType)) {
          const pieceType = disappearedPiece.originalType;

          disappearedPiece.type = pieceType;
          disappearedPiece.color = opponentColor;
          (disappearedPiece as any as PocketPiece).location = {
            type: PieceLocationEnum.POCKET,
            pieceType
          };

          this.pocket[opponentColor][pieceType].push(disappearedPiece as any as PocketPiece);
          this.pieces[opponentColor].push(disappearedPiece);
        }
      }
    });

    if (pieceType === PieceEnum.PAWN || isCapture) {
      this.pliesWithoutCaptureOrPawnMove = 0;
    } else {
      this.pliesWithoutCaptureOrPawnMove++;
    }

    if (
      fromLocation.type === PieceLocationEnum.BOARD
      && pieceType === PieceEnum.PAWN
      && Math.abs(toY - fromLocation.y) === 2
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

    piece.moved = true;
    piece.type = isPawnPromotion
      ? promotion!
      : pieceType;
    piece.originalType = isPawnPromotion && this.isPocketUsed
      ? piece.originalType
      : piece.type;

    if (!this.isAtomic || !isCapture) {
      this.board[newLocation.y][newLocation.x] = piece as BoardPiece;
      piece.location = newLocation;
    }

    if (isCastling) {
      // castling

      const rook = castlingRook!;
      const newRookLocation = {
        type: PieceLocationEnum.BOARD,
        x: isKingSideCastling ? 5 : 3,
        y: toY
      } as PieceBoardLocation;

      // if it's not 960 and king and rook didn't switch places
      if (this.board[rook.location.y][rook.location.x]!.id === rook.id) {
        this.board[rook.location.y][rook.location.x] = null;
      }

      this.board[newRookLocation.y][newRookLocation.x] = rook;
      rook.moved = true;
      rook.location = newRookLocation;
    }

    movedPiecesLocations.forEach((square, ix) => {
      if (square) {
        const movedPiece = disappearedOrMovedPieces[ix];

        movedPiece.moved = false;
        movedPiece.location = {
          ...square,
          type: PieceLocationEnum.BOARD
        };
        this.board[square.y][square.x] = movedPiece;
      }
    });

    this.turn = opponentColor;
    this.isCheck = this.isInCheck(this.kings[opponentColor]);

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

        this.board[newLocation.y][newLocation.x] = null;

        if (fromLocation.type === PieceLocationEnum.BOARD) {
          this.board[fromLocation.y][fromLocation.x] = piece as BoardPiece;
        } else {
          playerPocket[fromLocation.pieceType].unshift(piece as PocketPiece);
        }

        piece.location = prevPieceLocation;
        piece.moved = prevPieceMoved;
        piece.type = prevPieceType;
        piece.originalType = prevPieceOriginalType;

        disappearedOrMovedPiecesData.forEach(({ moved, color, type, location }, ix) => {
          const disappearedOrMovedPiece = disappearedOrMovedPieces[ix];
          const opponentColor = this.getOppositeColor(color);
          const playerPieces = this.pieces[color];
          const opponentPieces = this.pieces[opponentColor];

          if (this.isCirce && _.includes(playerPieces, disappearedOrMovedPiece)) {
            this.board[disappearedOrMovedPiece.location.y][disappearedOrMovedPiece.location.x] = null;
          } else {
            playerPieces.push(disappearedOrMovedPiece);
          }

          disappearedOrMovedPiece.moved = moved;
          disappearedOrMovedPiece.color = color;
          disappearedOrMovedPiece.type = type;
          disappearedOrMovedPiece.location = location;

          if (this.isPocketUsed && _.includes(this.pocketPiecesUsed, disappearedOrMovedPiece.originalType)) {
            this.pocket[opponentColor][disappearedOrMovedPiece.originalType].pop();
            opponentPieces.splice(opponentPieces.indexOf(disappearedOrMovedPiece), 1);
          }

          this.board[location.y][location.x] = disappearedOrMovedPiece;
        });

        if (castlingRook) {
          // if it's not 960 and king and rook didn't switch places
          if (this.board[castlingRook.location.y][castlingRook.location.x]!.id === castlingRook!.id) {
            this.board[castlingRook.location.y][castlingRook.location.x] = null;
          }

          this.board[prevCastlingRookLocation!.y][prevCastlingRookLocation!.x] = castlingRook;
          castlingRook.moved = false;
          castlingRook.location = prevCastlingRookLocation!;
        }
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

  getOppositeColor(color: ColorEnum): ColorEnum {
    return color === ColorEnum.WHITE
      ? ColorEnum.BLACK
      : ColorEnum.WHITE;
  }

  getOpponentColor(): ColorEnum {
    return this.getOppositeColor(this.turn);
  }

  getPossibleMoves(location: RealPieceLocation, attacked: boolean): Square[] {
    if (location.type === PieceLocationEnum.POCKET) {
      return this.board.reduce((possibleSquares, rank, rankY) => {
        let newSquares: Square[] = [];

        if (
          (rankY !== 0 && rankY !== 7)
          || location.pieceType !== PieceEnum.PAWN
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
    }

    const piece = this.board[location.y][location.x]!;
    const {
      x: pieceX,
      y: pieceY
    } = location;
    const opponentColor = this.getOppositeColor(piece.color);
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

        const pieceInSquare = newRank[fileX];

        if (pieceInSquare && pieceInSquare.color === piece.color) {
          break;
        }

        possibleSquares.push({
          x: fileX,
          y: rankY
        });

        if (pieceInSquare) {
          break;
        }

        if (piece.type === PieceEnum.KING) {
          break;
        }
      }
    };

    if (
      piece.type === PieceEnum.KING
      || piece.type === PieceEnum.QUEEN
      || piece.type === PieceEnum.ROOK
    ) {
      traverseDirection(+1, 0);
      traverseDirection(-1, 0);
      traverseDirection(0, +1);
      traverseDirection(0, -1);
    }

    if (
      piece.type === PieceEnum.KING
      || piece.type === PieceEnum.QUEEN
      || piece.type === PieceEnum.BISHOP
    ) {
      traverseDirection(+1, +1);
      traverseDirection(+1, -1);
      traverseDirection(-1, +1);
      traverseDirection(-1, -1);
    }

    if (piece.type === PieceEnum.KNIGHT) {
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

        const square = rank[fileX];

        if (square && square.color === piece.color) {
          return;
        }

        possibleSquares.push({
          x: fileX,
          y: rankY
        });
      });
    }

    if (piece.type === PieceEnum.PAWN) {
      const direction = piece.color === ColorEnum.WHITE ? 1 : -1;
      const rankY = pieceY + direction;
      const nextRank = this.board[rankY];

      if (pieceX in nextRank && !attacked) {
        // 1-forward move
        const squarePiece = nextRank[pieceX];

        if (!squarePiece) {
          possibleSquares.push({
            x: pieceX,
            y: rankY
          });

          if (piece.color === ColorEnum.WHITE ? pieceY === 1 : pieceY === 6) {
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
          const square = nextRank[fileX];

          if (square && square.color !== piece.color) {
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

    if (piece.type === PieceEnum.KING && !piece.moved && !this.isCheck && !attacked) {
      this.board[pieceY]
        .filter((rook) => (
          rook
          && rook.color === piece.color
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

    return possibleSquares;
  }

  getAllowedMoves(location: RealPieceLocation): Square[] {
    const possibleMoves = this.getPossibleMoves(location, false);

    if (this.isLeftInCheckAllowed && !this.isAtomic) {
      return possibleMoves;
    }

    const king = this.kings[this.turn];
    const opponentColor = this.getOpponentColor();

    return possibleMoves.filter(({ x, y }) => {
      const { revertMove } = this.performMove({
        from: location,
        to: { x, y },
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

  isInCheck(king: BoardPiece): boolean {
    return (
      !this.isAtomic
      && this.isAttackedByOpponentPiece(king.location, this.getOpponentColor())
    );
  }

  isAttackedByOpponentPiece(square: Square, opponentColor: ColorEnum): boolean {
    return this.pieces[opponentColor]
      .filter(Game.isRealPiece)
      .some((piece) => (
        this.getPossibleMoves(piece.location, true).some(({ x, y }) => (
          square.x === x
          && square.y === y
        ))
      ));
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

    return null;
  }

  isKingInTheCenter(): boolean {
    const king = this.kings[this.getOpponentColor()];

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
    const pieces = _
      .sortBy([
        this.pieces[ColorEnum.WHITE],
        this.pieces[ColorEnum.BLACK]
      ], 'length')
      .map((pieces) => (
        pieces.filter(Game.isBoardPiece)
      ));

    if ((
      // king vs king
      pieces[0].length === 1
      && pieces[1].length === 1
    ) || (
      // king vs king & knight
      pieces[0].length === 1
      && pieces[1].length === 2
      && pieces[1][1].type === PieceEnum.KNIGHT
    )) {
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
