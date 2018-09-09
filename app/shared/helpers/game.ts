import * as _ from 'lodash';
import {
  Board,
  ChatMessage,
  ColorEnum,
  Game as IGame,
  GameKings,
  GamePieces,
  GamePlayers,
  GameResult,
  GameStatusEnum,
  Move,
  Piece,
  PieceEnum,
  ResultReasonEnum,
  RevertableMove,
  Square,
  StartingBoard,
  StartingPiece,
  TimeControlEnum
} from '../../types';
import { PIECE_LITERALS, SHORT_PIECE_NAMES } from '../constants';

interface BoardData {
  board: Board;
  kings: GameKings;
  pieces: GamePieces;
}

export class Game implements IGame {
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
    const kings = {} as { [color in ColorEnum]: Piece; };
    const pieces: { [color in ColorEnum]: Piece[]; } = {
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
          square: { x, y },
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

  startingBoard: StartingBoard;
  board: Board;
  players: GamePlayers = {} as GamePlayers;
  status: GameStatusEnum = GameStatusEnum.BEFORE_START;
  isCheck: boolean = false;
  result: GameResult | null = null;
  turn: ColorEnum = ColorEnum.WHITE;
  timeControl: TimeControlEnum;
  moves: RevertableMove[] = [];
  chat: ChatMessage[] = [];
  possibleEnPassant: Square | null = null;
  positionsMap: { [position: string]: number; } = {};
  positionString: string;
  pliesWithoutCaptureOrPawnMove: number = 0;
  kings: GameKings;
  pieces: GamePieces;

  constructor(params: Pick<Game, 'timeControl'> & { startingBoard?: StartingBoard; }) {
    this.startingBoard = params.startingBoard || Game.getStartingBoard();
    ({
      board: this.board,
      pieces: this.pieces,
      kings: this.kings
    } = Game.generateBoardDataFromStartingBoard(this.startingBoard));

    this.timeControl = params.timeControl;
    this.positionString = this.generatePositionString();
    this.positionsMap[this.positionString] = 1;
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
      from: fromSquare,
      from: {
        x: fromX,
        y: fromY
      },
      to: toSquare,
      to: {
        x: toX,
        y: toY
      },
      promotion
    } = move;
    const piece = this.board[fromY][fromX]!;
    const pieceType = piece.type;
    const toPiece = this.board[toY][toX];
    const isEnPassant = (
      pieceType === PieceEnum.PAWN
      && Math.abs(fromX - toX) !== 0
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
    const isCastling = pieceType === PieceEnum.KING && Math.abs(toX - fromX) > 1;

    const prevTurn = this.turn;
    const prevIsCheck = this.isCheck;
    const prevPliesWithoutCaptureOrPawnMove = this.pliesWithoutCaptureOrPawnMove;
    const prevPossibleEnPassant = this.possibleEnPassant;
    const prevPieceMoved = piece.moved;
    const prevPieceType = pieceType;
    const opponentPieces = this.pieces[this.getOpponentColor()];

    let algebraic = '';
    let figurine = '';

    if (constructMoveLiterals) {
      if (isCastling) {
        const castling = toX - fromX > 0 ? 'O-O' : 'O-O-O';

        algebraic += castling;
        figurine += castling;
      } else {
        if (pieceType !== PieceEnum.PAWN) {
          algebraic += SHORT_PIECE_NAMES[pieceType];
          figurine += PIECE_LITERALS[piece.color][pieceType];

          const otherPiecesAbleToMakeMove = this.pieces[piece.color].filter(({ id, type, square }) => (
            type === pieceType
            && id !== piece.id
            && this.getAllowedMoves(square).some(({ x, y }) => x === toX && y === toY)
          ));

          if (otherPiecesAbleToMakeMove.length) {
            const areSameFile = otherPiecesAbleToMakeMove.some(({ square: { x, y } }) => (
              x === fromX
              && y !== fromY
            ));
            const areSameRank = otherPiecesAbleToMakeMove.some(({ square: { x, y } }) => (
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

      this.board[opponentPiece.square.y][opponentPiece.square.x] = null;
    }

    if (pieceType === PieceEnum.PAWN || opponentPiece) {
      this.pliesWithoutCaptureOrPawnMove = 0;
    } else {
      this.pliesWithoutCaptureOrPawnMove++;
    }

    if (pieceType === PieceEnum.PAWN && Math.abs(toY - fromY) === 2) {
      this.possibleEnPassant = {
        x: toX,
        y: Math.round((toY + fromY) / 2)
      };
    } else {
      this.possibleEnPassant = null;
    }

    this.board[fromY][fromX] = null;
    this.board[toY][toX] = piece;
    piece.moved = true;
    piece.square = toSquare;
    piece.type = isPawnPromotion
      ? promotion!
      : pieceType;

    let castlingRook: Piece | undefined;

    if (isCastling) {
      // castling

      const isKingSideCastling = toX - fromX > 0;
      const rook = this.board[fromY][isKingSideCastling ? 7 : 0]!;
      const newRookSquare = {
        x: isKingSideCastling ? 5 : 3,
        y: fromY
      };

      this.board[rook.square.y][rook.square.x] = null;
      this.board[newRookSquare.y][newRookSquare.x] = rook;
      rook.moved = true;
      rook.square = newRookSquare;
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

        this.board[fromY][fromX] = piece;
        this.board[toY][toX] = null;
        piece.square = fromSquare;
        piece.moved = prevPieceMoved;
        piece.type = prevPieceType;

        if (opponentPiece) {
          opponentPieces.push(opponentPiece);

          this.board[opponentPiece.square.y][opponentPiece.square.x] = opponentPiece;
        }

        if (castlingRook) {
          const isKingSideCastling = toX - fromX > 0;
          const oldRookSquare = {
            x: isKingSideCastling ? 7 : 0,
            y: fromY
          };

          this.board[castlingRook.square.y][castlingRook.square.x] = null;
          this.board[oldRookSquare.y][oldRookSquare.x] = castlingRook;
          castlingRook.moved = false;
          castlingRook.square = oldRookSquare;
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

  getOppositeColor(color: ColorEnum) {
    return color === ColorEnum.WHITE
      ? ColorEnum.BLACK
      : ColorEnum.WHITE;
  }

  getOpponentColor(): ColorEnum {
    return this.getOppositeColor(this.turn);
  }

  getPossibleMoves(square: Square, attacked: boolean): Square[] {
    const piece = this.board[square.y][square.x]!;
    const {
      x: pieceX,
      y: pieceY
    } = square;
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

  getAllowedMoves(square: Square): Square[] {
    const possibleMoves = this.getPossibleMoves(square, false);
    const piece = this.board[square.y][square.x]!;
    const king = this.kings[piece.color];
    const opponentColor = this.getOpponentColor();

    return possibleMoves.filter(({ x, y }) => {
      const { revertMove } = this.performMove({
        from: {
          x: square.x,
          y: square.y
        },
        to: { x, y },
        timestamp: 0,
        promotion: PieceEnum.QUEEN
      }, false);
      const isMoveAllowed = !this.isAttackedByOpponentPiece(king.square, opponentColor);

      revertMove();

      return isMoveAllowed;
    });
  }

  isInCheck(): boolean {
    return this.isAttackedByOpponentPiece(this.kings[this.turn].square, this.getOpponentColor());
  }

  isAttackedByOpponentPiece(square: Square, opponentColor: ColorEnum): boolean {
    return this.pieces[opponentColor].some((piece) => (
      this.getPossibleMoves(piece.square, true).some(({ x, y }) => (
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
    const pieces = _.sortBy([this.pieces[ColorEnum.WHITE], this.pieces[ColorEnum.BLACK]], 'length');

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

    const possibleBishopColor = pieces[1][1].square.x % 2 + pieces[1][1].square.y % 2;

    return pieces.every((pieces) => (
      pieces.slice(1).every(({ type, square }) => (
        type === PieceEnum.BISHOP
        && square.x % 2 + square.y % 2 === possibleBishopColor
      ))
    ));
  }

  isNoMoves() {
    return this.pieces[this.turn].every((piece) => (
      this.getAllowedMoves(piece.square).length === 0
    ));
  }

  isStalemate(): boolean {
    return !this.isCheck && this.isNoMoves();
  }
}
