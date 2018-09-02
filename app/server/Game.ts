import * as _ from 'lodash';
import { Namespace, Socket } from 'socket.io';
import {
  Board,
  ColorEnum,
  Game as IGame,
  GameResult,
  GameStatusEnum,
  Move,
  Piece,
  PieceEnum,
  Player,
  Square
} from '../types';

interface BoardData {
  board: Board;
  kings: {
    [color in ColorEnum]: Piece;
  };
  pieces: {
    [color in ColorEnum]: Piece[];
  };
}

export default class Game implements IGame {
  static generateBoard(): BoardData {
    return this.generateClassicBoard();
  }

  static generateClassicBoard(): BoardData {
    const kings = {} as { [color in ColorEnum]: Piece; };
    const pieces: { [color in ColorEnum]: Piece[]; } = {
      [ColorEnum.WHITE]: [],
      [ColorEnum.BLACK]: []
    };
    const board = _.times(8, (y) => (
      _.times(8, (x) => {
        const getPiece = (type: PieceEnum): Piece => {
          const color = y < 2
            ? ColorEnum.WHITE
            : ColorEnum.BLACK;
          const piece = {
            type,
            color,
            square: { x, y },
            moved: false,
            allowedMoves: []
          };

          pieces[color].push(piece);

          if (type === PieceEnum.KING) {
            kings[color] = piece;
          }

          return piece;
        };

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

    [ColorEnum.WHITE, ColorEnum.BLACK].forEach((color) => {
      // king first
      pieces[color].splice(pieces[color].indexOf(kings[color]), 1);
      pieces[color].unshift(kings[color]);
    });

    return {
      board,
      kings,
      pieces
    };
  }

  board: Board;
  players: Player[];
  status: GameStatusEnum = GameStatusEnum.BEFORE_START;
  isCheck: boolean = false;
  result: GameResult | null = null;
  turn: ColorEnum = ColorEnum.WHITE;
  possibleEnPassant: Square | null = null;
  positionsMap: { [position: string]: number; } = {};
  positionString: string;
  pliesWithoutCaptureOrPawnMove: number = 0;
  kings: {
    [color in ColorEnum]: Piece;
  };
  pieces: {
    [color in ColorEnum]: Piece[];
  };
  io: Namespace;

  constructor(io: Namespace, players: Player[]) {
    this.io = io;
    ({
      board: this.board,
      pieces: this.pieces,
      kings: this.kings
    } = Game.generateBoard());

    this.constructAllowedMoves();

    this.positionString = this.generatePositionString();
    this.positionsMap[this.positionString] = 1;
    this.players = players;

    io.on('connection', (socket) => {
      const user = socket.user;
      const existingPlayer = (user && players.find(({ login }) => login === user.login)) || null;
      const isNewPlayer = !existingPlayer && user && this.players.length < 2;
      let player: Player | null = null;

      if (isNewPlayer) {
        const color = this.players.length === 0
          ? Math.random() > 0.5
            ? ColorEnum.WHITE
            : ColorEnum.BLACK
          : this.getOppositeColor(this.players[0].color);

        player = {
          ...socket.user!,
          color
        };

        players.push(player!);

        if (players.length === 2) {
          this.status = GameStatusEnum.ONGOING;
        }

        socket.on('move', (move) => {
          this.move(socket, move);
        });
      } else {
        player = existingPlayer;
      }

      if (player) {
        socket.player = player;

        socket.on('move', (move) => {
          this.move(socket, move);
        });
      }

      if (isNewPlayer) {
        socket.broadcast.emit('updateGame', this);
      }

      socket.emit('initialGameData', {
        player,
        game: this
      });
    });
  }

  move(socket: Socket, move: Move) {
    const player = socket.player!;
    const {
      from: fromSquare,
      from: {
        x: fromX,
        y: fromY
      },
      to: {
        x: toX,
        y: toY
      },
      promotion
    } = move;
    const piece = this.board[fromY][fromX];

    if (
      this.turn !== player.color
      || !piece
      || piece.color !== player.color
      || this.status !== GameStatusEnum.ONGOING
    ) {
      // no piece, wrong turn, color or status

      return;
    }

    const isSquareAllowed = this.getAllowedMoves(fromSquare).some(({ x, y }) => (
      toX === x && toY === y
    ));
    const isPawnPromotion = piece.type === PieceEnum.PAWN && ((
      this.turn === ColorEnum.WHITE && toY === 7
    ) || (
      this.turn === ColorEnum.BLACK && toY === 0
    ));
    const isValidPromotion =  (
      promotion === PieceEnum.QUEEN
      || promotion === PieceEnum.ROOK
      || promotion === PieceEnum.BISHOP
      || promotion === PieceEnum.KNIGHT
    );
    const isMoveAllowed = isSquareAllowed && (!isPawnPromotion || isValidPromotion);

    if (!isMoveAllowed) {
      return;
    }

    this.performMove(move);
    this.constructAllowedMoves();

    this.positionString = this.generatePositionString();
    this.positionsMap[this.positionString] = (this.positionsMap[this.positionString] || 0) + 1;

    this.io.emit('updateGame', this);

    if (this.isCheckmate()) {
      this.result = {
        winner: this.getOpponentColor()
      };
      this.status = GameStatusEnum.FINISHED;

      this.io.emit('gameOver', { winner: this.getOpponentColor() });
    } else if (this.isDraw()) {
      this.result = {
        winner: null
      };
      this.status = GameStatusEnum.FINISHED;

      this.io.emit('gameOver', { winner: null });
    }
  }

  constructAllowedMoves() {
    this.pieces[this.turn].forEach((piece) => {
      piece.allowedMoves = this.getAllowedMoves(piece.square);
    });
  }

  performMove(move: Move): () => void {
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
    const toPiece = this.board[toY][toX];
    const isEnPassant = (
      piece.type === PieceEnum.PAWN
      && Math.abs(fromX - toX) !== 0
      && !toPiece
    );
    const opponentPiece = isEnPassant
      ? this.board[toY + (this.turn === ColorEnum.WHITE ? -1 : 1)][toX]
      : toPiece;
    const isPawnPromotion = piece.type === PieceEnum.PAWN && ((
      this.turn === ColorEnum.WHITE && toY === 7
    ) || (
      this.turn === ColorEnum.BLACK && toY === 0
    ));

    const prevTurn = this.turn;
    const prevIsCheck = this.isCheck;
    const prevPliesWithoutCaptureOrPawnMove = this.pliesWithoutCaptureOrPawnMove;
    const prevPossibleEnPassant = this.possibleEnPassant;
    const prevPieceMoved = piece.moved;
    const prevPieceType = piece.type;
    const opponentPieces = this.getOpponentPieces();

    if (opponentPiece) {
      opponentPieces.splice(opponentPieces.indexOf(opponentPiece), 1);

      this.board[opponentPiece.square.y][opponentPiece.square.x] = null;
    }

    if (piece.type === PieceEnum.PAWN || opponentPiece) {
      this.pliesWithoutCaptureOrPawnMove = 0;
    } else {
      this.pliesWithoutCaptureOrPawnMove++;
    }

    if (piece.type === PieceEnum.PAWN && Math.abs(toY - fromY) === 2) {
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
      : piece.type;

    let castlingRook: Piece | undefined;

    if (piece.type === PieceEnum.KING && Math.abs(toX - fromX) > 1) {
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

    // return revert-move function
    return () => {
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

  getOpponentPieces(): Piece[] {
    return this.pieces[this.getOpponentColor()];
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

        const pieceInSquare = newRank[pieceX];

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
      const direction = this.turn === ColorEnum.WHITE ? 1 : -1;
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

          if (this.turn === ColorEnum.WHITE ? pieceY === 1 : pieceY === 6) {
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
    const king = this.kings[this.turn];
    const opponentColor = this.getOpponentColor();

    return possibleMoves.filter(({ x, y }) => {
      const revertMove = this.performMove({
        from: {
          x: square.x,
          y: square.y
        },
        to: { x, y },
        promotion: PieceEnum.QUEEN
      });
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

  isDraw(): boolean {
    return (
      this.isStalemate()
      || this.isInsufficientMaterial()
      || this.pliesWithoutCaptureOrPawnMove === 100
      || this.positionsMap[this.positionString] === 3
    );
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

  toJSON(): IGame {
    return _.pick(this, [
      'board',
      'turn',
      'status',
      'players',
      'result',
      'isCheck'
    ]);
  }
}
