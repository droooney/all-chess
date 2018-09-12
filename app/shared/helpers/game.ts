import * as _ from 'lodash';
import {
  Board,
  BoardPiece,
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
  static validateVariants(_variants: GameVariantEnum[]): boolean {
    return true;
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

  static getStartingBoard(): StartingBoard {
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
  variants: GameVariantEnum[];

  constructor(settings: GameCreateSettings & { id: string; startingBoard?: StartingBoard; }) {
    this.id = settings.id;
    this.startingBoard = settings.startingBoard || Game.getStartingBoard();
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

    if (this.isCheckmate()) {
      this.end(this.getOpponentColor(), ResultReasonEnum.CHECKMATE);
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
    const opponentPiece = isEnPassant
      ? this.board[toY + (this.turn === ColorEnum.WHITE ? -1 : 1)][toX]
      : toPiece;
    const isPawnPromotion = pieceType === PieceEnum.PAWN && ((
      this.turn === ColorEnum.WHITE && toY === 7
    ) || (
      this.turn === ColorEnum.BLACK && toY === 0
    ));
    const isCastling = (
      fromLocation.type === PieceLocationEnum.BOARD
      && pieceType === PieceEnum.KING
      && Math.abs(toX - fromLocation.x) > 1
    );
    const isKingSideCastling = isCastling && toX - (fromLocation as PieceBoardLocation).x > 0;

    const prevTurn = this.turn;
    const prevIsCheck = this.isCheck;
    const prevPliesWithoutCaptureOrPawnMove = this.pliesWithoutCaptureOrPawnMove;
    const prevPossibleEnPassant = this.possibleEnPassant;
    const prevOpponentPieceColor = opponentPiece
      ? opponentPiece.color
      : null;
    const prevOpponentPieceType = opponentPiece
      ? opponentPiece.type
      : null;
    const prevOpponentPieceLocation = opponentPiece
      ? opponentPiece.location
      : null;
    const prevPieceMoved = piece.moved;
    const prevPieceType = pieceType;
    const prevPieceLocation = piece.location;
    const playerPieces = this.pieces[this.turn];
    const opponentPieces = this.pieces[this.getOpponentColor()];

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
        } else if (opponentPiece) {
          const file = Game.getFileLiteral(fromX);

          algebraic += file;
          figurine += file;
        }

        if (opponentPiece) {
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

    if (opponentPiece) {
      opponentPieces.splice(opponentPieces.indexOf(opponentPiece), 1);

      this.board[opponentPiece.location.y][opponentPiece.location.x] = null;

      if (this.isPocketUsed && _.includes(this.pocketPiecesUsed, opponentPiece.originalType)) {
        const pieceType = opponentPiece.originalType;

        opponentPiece.type = pieceType;
        opponentPiece.color = this.turn;
        (opponentPiece as any as PocketPiece).location = {
          type: PieceLocationEnum.POCKET,
          pieceType
        };

        playerPocket[pieceType].push(opponentPiece as any as PocketPiece);
        playerPieces.push(opponentPiece);
      }
    }

    if (pieceType === PieceEnum.PAWN || opponentPiece) {
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

    this.board[toY][toX] = piece as BoardPiece;
    piece.moved = true;
    piece.location = {
      ...toLocation,
      type: PieceLocationEnum.BOARD
    };
    piece.type = isPawnPromotion
      ? promotion!
      : pieceType;

    let castlingRook: BoardPiece | undefined;

    if (isCastling) {
      // castling

      const rook = this.board[(fromLocation as PieceBoardLocation).y][isKingSideCastling ? 7 : 0]!;
      const newRookLocation = {
        type: PieceLocationEnum.BOARD,
        x: isKingSideCastling ? 5 : 3,
        y: (fromLocation as PieceBoardLocation).y
      } as PieceBoardLocation;

      this.board[rook.location.y][rook.location.x] = null;
      this.board[newRookLocation.y][newRookLocation.x] = rook;
      rook.moved = true;
      rook.location = newRookLocation;
      castlingRook = rook;
    }

    this.turn = this.getOpponentColor();
    this.isCheck = this.isInCheck();

    if (constructMoveLiterals) {
      if (this.isCheckmate()) {
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

        if (fromLocation.type === PieceLocationEnum.BOARD) {
          this.board[fromLocation.y][fromLocation.x] = piece as BoardPiece;
        } else {
          playerPocket[fromLocation.pieceType].unshift(piece as PocketPiece);
        }

        this.board[toY][toX] = null;
        piece.location = prevPieceLocation;
        piece.moved = prevPieceMoved;
        piece.type = prevPieceType;

        if (opponentPiece) {
          opponentPieces.push(opponentPiece);

          if (this.isPocketUsed && _.includes(this.pocketPiecesUsed, opponentPiece.originalType)) {
            opponentPiece.color = prevOpponentPieceColor!;
            opponentPiece.type = prevOpponentPieceType!;
            opponentPiece.location = prevOpponentPieceLocation!;

            playerPocket[opponentPiece.originalType].pop();
            playerPieces.splice(playerPieces.indexOf(opponentPiece), 1);
          }

          this.board[opponentPiece.location.y][opponentPiece.location.x] = opponentPiece;
        }

        if (castlingRook) {
          const oldRookLocation = {
            type: PieceLocationEnum.BOARD,
            x: isKingSideCastling ? 7 : 0,
            y: (fromLocation as PieceBoardLocation).y
          } as PieceBoardLocation;

          this.board[castlingRook.location.y][castlingRook.location.x] = null;
          this.board[oldRookLocation.y][oldRookLocation.x] = castlingRook;
          castlingRook.moved = false;
          castlingRook.location = oldRookLocation;
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
      // castling
      ([
        [0, 2, 3, [1, 2, 3]],
        [7, 6, 5, [5, 6]]
      ] as [number, number, number, number[]][]).forEach(([rookX, newKingX, middleSquareX, passingSquares]) => {
        const rook = this.board[pieceY][rookX];

        if (
          rook
          && !rook.moved
          && !this.isAttackedByOpponentPiece({ x: newKingX, y: pieceY }, opponentColor)
          && !this.isAttackedByOpponentPiece({ x: middleSquareX, y: pieceY }, opponentColor)
          && passingSquares.every((x) => !this.board[pieceY][x])
        ) {
          possibleSquares.push({
            x: newKingX,
            y: pieceY
          });
        }
      });
    }

    return possibleSquares;
  }

  getAllowedMoves(location: RealPieceLocation): Square[] {
    const possibleMoves = this.getPossibleMoves(location, false);
    const king = this.kings[this.turn];
    const opponentColor = this.getOpponentColor();

    return possibleMoves.filter(({ x, y }) => {
      const { revertMove } = this.performMove({
        from: location,
        to: { x, y },
        timestamp: 0,
        promotion: PieceEnum.QUEEN
      }, false);
      const isMoveAllowed = !this.isAttackedByOpponentPiece(king.location, opponentColor);

      revertMove();

      return isMoveAllowed;
    });
  }

  isInCheck(): boolean {
    return this.isAttackedByOpponentPiece(this.kings[this.turn].location, this.getOpponentColor());
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
