/// <reference path="../../typings/generator.d.ts"/>

import * as _ from 'lodash';

import GamePositionUtils from './GamePositionUtils';
import {
  KNIGHT_MOVE_INCREMENTS,
  HEX_KNIGHT_MOVE_INCREMENTS,
  BISHOP_MOVE_INCREMENTS,
  HEX_BISHOP_MOVE_INCREMENTS,
  ROOK_MOVE_INCREMENTS,
  HEX_ROOK_MOVE_INCREMENTS
} from './GameBoardUtils';
import {
  BoardPiece,
  CastlingTypeEnum,
  ColorEnum,
  GameResult,
  GetPossibleMovesMode,
  Move,
  MovementType,
  Piece,
  PieceBoardLocation,
  PieceLocationEnum,
  PiecePocketLocation,
  PieceTypeEnum,
  PossibleMove,
  RealPiece,
  ResultReasonEnum,
  RevertableMove,
  Square
} from '../../types';

interface PerformMoveOptions {
  constructMoveLiterals?: boolean;
  constructPositionString?: boolean;
  checkIfAllowed?: boolean;
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

const ATOMIC_SQUARE_INCREMENTS: readonly [number, number][] = [
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

export default abstract class GameMovesUtils extends GamePositionUtils {
  moves: RevertableMove[] = [];
  pliesCount: number = 0;

  abstract end(winner: ColorEnum | null, reason: ResultReasonEnum): void;
  abstract isDraw(): ResultReasonEnum | null;
  abstract isWin(): GameResult | null;

  getAllowedMoves(piece: RealPiece): Generator<PossibleMove> {
    const possibleMoves = this.getFilteredPossibleMoves(piece, GetPossibleMovesMode.FOR_MOVE);

    if (this.isAntichess) {
      return this.hasCapturePieces(piece.color)
        ? possibleMoves.filter(({ capture }) => capture)
        : possibleMoves;
    }

    if (this.isLeftInCheckAllowed && !this.isAtomic) {
      return possibleMoves;
    }

    return possibleMoves.filter(({ square }) => {
      const { allowed, revertMove } = this.performMove({
        from: piece.location,
        to: square,
        duration: 0,
        promotion: PieceTypeEnum.QUEEN
      }, { checkIfAllowed: true });

      revertMove();

      return allowed;
    });
  }

  *getFilteredPossibleMoves(piece: RealPiece, mode: GetPossibleMovesMode): Generator<PossibleMove> {
    const forMove = mode === GetPossibleMovesMode.FOR_MOVE;
    const onlyAttacked = mode === GetPossibleMovesMode.ATTACKED;
    const onlyControlled = mode === GetPossibleMovesMode.CONTROLLED;
    const onlyPossible = mode === GetPossibleMovesMode.POSSIBLE;

    if (
      (forMove || onlyControlled || onlyAttacked)
      && this.isMadrasi
      && this.isParalysed(piece)
    ) {
      return;
    }

    const captureAllowed = (
      GameMovesUtils.isPocketPiece(piece)
      || !this.isPatrol
      || onlyControlled
      || onlyPossible
      || this.isPatrolledByFriendlyPiece(piece.location, piece.color)
    );

    if (onlyAttacked && !captureAllowed) {
      return;
    }

    yield* this.getPossibleMoves(piece, mode)
      .filter(({ square }) => (
        !this.isAliceChess || (!forMove && !onlyPossible) || this.isAvailableSquare(square)
      ))
      .filter(({ capture }) => captureAllowed || !capture);
  }

  // do not call this anywhere except getFilteredPossibleMoves
  *getPossibleMoves(piece: RealPiece, mode: GetPossibleMovesMode): Generator<PossibleMove> {
    const forMove = mode === GetPossibleMovesMode.FOR_MOVE;
    const onlyVisible = mode === GetPossibleMovesMode.VISIBLE;
    const onlyPossible = mode === GetPossibleMovesMode.POSSIBLE;

    if (GameMovesUtils.isPocketPiece(piece)) {
      const visibleSquares = this.isDarkChess ? this.getVisibleSquares(piece.color) : [];

      for (let board = 0; board < this.boardCount; board++) {
        for (let rankY = 0; rankY < this.boardHeight; rankY++) {
          if (
            (piece.location as PiecePocketLocation).pieceType !== PieceTypeEnum.PAWN
            || (
              rankY !== 0
              && rankY !== this.boardHeight - 1
              && (
                !this.isCircularChess || (
                  rankY !== this.boardOrthodoxHeight - 1
                  && rankY !== this.boardOrthodoxHeight
                )
              )
            )
          ) {
            for (let fileX = 0; fileX < this.boardWidth; fileX++) {
              const square: Square = {
                board,
                x: fileX,
                y: rankY
              };

              if (
                (
                  !this.isDarkChess
                  || visibleSquares.some((visibleSquare) => GameMovesUtils.areSquaresEqual(square, visibleSquare))
                )
                && !this.getBoardPiece(square)
              ) {
                yield {
                  square,
                  capture: null,
                  castling: null
                };
              }
            }
          }
        }
      }

      return;
    }

    const pieceColor = piece.color;
    const {
      board,
      x: pieceX,
      y: pieceY
    } = piece.location;
    const opponentColor = GameMovesUtils.getOppositeColor(pieceColor);
    const traverseDirection = function* (
      this: GameMovesUtils,
      movementType: MovementType,
      incrementY: number,
      incrementX: number,
      stopAfter: number
    ): Generator<PossibleMove> {
      let iterations = 0;

      for (const square of this.traverseDirection(piece.location, movementType, incrementY, incrementX)) {
        const pieceInSquare = this.getBoardPiece(square);

        if (pieceInSquare && pieceInSquare.color === pieceColor) {
          if (!forMove && !onlyPossible) {
            yield {
              square,
              capture: null,
              castling: null
            };
          }

          return;
        }

        if (
          isKing
          && forMove
          && !this.isLeftInCheckAllowed
          && !pieceInSquare
          && this.isAttackedByOpponentPiece(square, opponentColor)
        ) {
          return;
        }

        yield {
          square,
          capture: pieceInSquare && {
            piece: pieceInSquare,
            enPassant: false
          },
          castling: null
        };

        if (pieceInSquare) {
          return;
        }

        if (++iterations === stopAfter) {
          return;
        }
      }
    }.bind(this);

    if (onlyVisible) {
      yield {
        square: { board, x: pieceX, y: pieceY },
        capture: null,
        castling: null
      };
    }

    const isKing = GameMovesUtils.isKing(piece);
    const isKingMove = isKing && (!this.isFrankfurt || !piece.abilities);

    if (isKingMove || GameMovesUtils.isRookLike(piece)) {
      const stopAfter = isKingMove ? 1 : Infinity;

      for (const [incrementY, incrementX] of this.isHexagonalChess ? HEX_ROOK_MOVE_INCREMENTS : ROOK_MOVE_INCREMENTS) {
        yield* traverseDirection(PieceTypeEnum.ROOK, incrementY, incrementX, stopAfter);
      }
    }

    if (isKingMove || GameMovesUtils.isBishopLike(piece)) {
      const stopAfter = isKingMove ? 1 : Infinity;

      for (const [incrementY, incrementX] of this.isHexagonalChess ? HEX_BISHOP_MOVE_INCREMENTS : BISHOP_MOVE_INCREMENTS) {
        yield* traverseDirection(PieceTypeEnum.BISHOP, incrementY, incrementX, stopAfter);
      }
    }

    if (GameMovesUtils.isKnightLike(piece)) {
      for (const [incrementY, incrementX] of this.isHexagonalChess ? HEX_KNIGHT_MOVE_INCREMENTS : KNIGHT_MOVE_INCREMENTS) {
        yield* traverseDirection(PieceTypeEnum.KNIGHT, incrementY, incrementX, 1);
      }
    }

    if (GameMovesUtils.isPawn(piece)) {
      let direction: number;

      if (this.isCircularChess) {
        direction = (
          pieceColor === ColorEnum.WHITE
          && pieceY < this.boardHeight / 2
        ) || (
          pieceColor === ColorEnum.BLACK
          && pieceY >= this.boardHeight / 2
        ) ? 1 : -1;
      } else {
        direction = pieceColor === ColorEnum.WHITE ? 1 : -1;
      }

      const rankY = this.adjustRankY(pieceY + direction);
      const square = {
        board,
        x: pieceX,
        y: rankY
      };

      if ((forMove || onlyPossible || onlyVisible) && !this.isNullSquare(square)) {
        // 1-forward move
        const pieceInSquare = this.getBoardPiece(square);

        if (!pieceInSquare || onlyVisible) {
          yield {
            square,
            capture: null,
            castling: null
          };

          if (
            !pieceInSquare && (
              (
                pieceColor === ColorEnum.WHITE
                  ? this.isHexagonalChess
                    ? pieceY === this.middleFileX - 1 - Math.abs(pieceX - this.middleFileX)
                    : pieceY === 1 || (this.isCircularChess && pieceY === this.boardHeight - 2)
                  : this.isHexagonalChess
                    ? pieceY === this.middleRankY + 1
                    : pieceY === this.boardOrthodoxHeight - 2 || (this.isCircularChess && pieceY === this.boardOrthodoxHeight + 1)
              ) || (
                pieceColor === ColorEnum.WHITE
                && this.isHorde
                && (pieceY === 0 || (this.isCircularChess && pieceY === this.boardHeight - 1))
              )
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
              yield {
                square,
                capture: null,
                castling: null
              };
            }
          }
        }
      }

      for (const incrementX of [1, -1]) {
        // capture
        const square = {
          board,
          x: this.adjustFileX(pieceX + incrementX),
          y: this.isHexagonalChess && ((
            pieceColor === ColorEnum.WHITE
            && (pieceX - this.middleFileX) * incrementX >= 0
          ) || (
            pieceColor === ColorEnum.BLACK
            && (pieceX - this.middleFileX) * incrementX < 0
          ))
            ? rankY - direction
            : rankY
        };

        if (!this.isNullSquare(square)) {
          const pieceInSquare = this.getBoardPiece(square);
          const isEnPassant = (
            !!this.possibleEnPassant
            && GameMovesUtils.areSquaresEqual(square, this.possibleEnPassant.enPassantSquare)
          );
          const isCapture = (
            (!!pieceInSquare && pieceInSquare.color !== pieceColor)
            || isEnPassant
          );

          if (
            (!forMove && !onlyPossible)
            || isCapture
          ) {
            yield {
              square,
              capture: isCapture ? isEnPassant ? {
                piece: this.getBoardPiece(this.possibleEnPassant!.pieceLocation)!,
                enPassant: true
              } : {
                piece: pieceInSquare!,
                enPassant: false
              } : null,
              castling: null
            };
          }
        }
      }
    }

    if (
      forMove
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
      const validCastlingRooks = [castlingRooks[CastlingTypeEnum.QUEEN_SIDE], castlingRooks[CastlingTypeEnum.KING_SIDE]]
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
        });

      for (const rook of validCastlingRooks) {
        const { location: rookLocation } = rook!;
        const isKingSideRook = rookLocation.x - pieceX > 0;

        yield {
          square: {
            board,
            x: this.is960
              ? rookLocation.x
              : isKingSideRook
                ? this.boardWidth - 2
                : 2,
            y: pieceY
          },
          capture: null,
          castling: { rook: rook! }
        };
      }
    }
  }

  isMoveAllowed(piece: RealPiece, square: Square, promotion: PieceTypeEnum): boolean {
    const possibleMove = this.getFilteredPossibleMoves(piece, GetPossibleMovesMode.FOR_MOVE).find((move) => (
      GameMovesUtils.areSquaresEqual(square, move.square)
    ));

    return (
      !!possibleMove
      && (!this.isPromoting(piece, square) || this.validPromotions.includes(promotion))
      && this.isPossibleMoveAllowed(piece, possibleMove, promotion)
    );
  }

  isNoMoves(): boolean {
    return this.getPieces(this.turn).every((piece) => (
      !this.getAllowedMoves(piece).take(0)
    ));
  }

  // do not call with a random move
  isPossibleMoveAllowed(piece: RealPiece, move: PossibleMove, promotion: PieceTypeEnum): boolean {
    if (this.isAntichess) {
      return !this.hasCapturePieces(piece.color) || !!move.capture;
    }

    if (this.isLeftInCheckAllowed && !this.isAtomic) {
      return true;
    }

    const { allowed, revertMove } = this.performMove({
      from: piece.location,
      to: move.square,
      duration: 0,
      promotion
    }, { checkIfAllowed: true });

    revertMove();

    return allowed;
  }

  performMove(move: Move, options: PerformMoveOptions = {}): PerformMoveReturnValue {
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
    const possibleMove = this
      .getFilteredPossibleMoves(piece, GetPossibleMovesMode.FOR_MOVE)
      .find(({ square }) => GameMovesUtils.areSquaresEqual(square, toLocation))!;
    const opponentPiece = possibleMove.capture && possibleMove.capture.piece;
    const isCapture = !!opponentPiece;
    const disappearedOrMovedPieces: Piece[] = [];
    const isPawnPromotion = this.isPromoting(piece, toLocation);
    const wasKing = GameMovesUtils.isKing(piece);
    const isMainPieceMovedOrDisappeared = this.isAtomic && isCapture;
    const isCastling = !!possibleMove.castling;
    const isKingSideCastling = isCastling && toX - (fromLocation as PieceBoardLocation).x > 0;
    const castlingRook = possibleMove.castling && possibleMove.castling.rook;

    const prevTurn = this.turn;
    const nextTurn = this.getOpponentColor();
    const prevIsCheck = this.isCheck;
    const prevPliesWithoutCaptureOrPawnMove = this.pliesWithoutCaptureOrPawnMove;
    const prevPositionString = this.positionString;
    const prevPossibleEnPassant = this.possibleEnPassant;
    const prevChecksCount = this.checksCount[prevTurn];
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
          y: this.adjustRankY(toY + incrementY),
          x: this.adjustFileX(toX + incrementX)
        });

        if (pieceInSquare && (!GameMovesUtils.isPawn(pieceInSquare) || pieceInSquare.abilities)) {
          disappearedOrMovedPieces.push(pieceInSquare);
        }
      });
    }

    // in case of en passant
    if (opponentPiece && !disappearedOrMovedPieces.includes(opponentPiece)) {
      disappearedOrMovedPieces.push(opponentPiece);
    }

    if (isMainPieceMovedOrDisappeared && !disappearedOrMovedPieces.includes(piece)) {
      disappearedOrMovedPieces.push(piece);
    }

    if (castlingRook) {
      disappearedOrMovedPieces.push(castlingRook);
    }

    const disappearedOrMovedPiecesData = (disappearedOrMovedPieces as BoardPiece[]).map((piece) => (
      _.pick(piece, ['moved', 'color', 'type', 'originalType', 'location', 'abilities'])
    ));

    let algebraic = '';
    let figurine = '';

    if (constructMoveLiterals) {
      if (fromLocation.type === PieceLocationEnum.POCKET) {
        algebraic += GameMovesUtils.getPieceFullAlgebraicLiteral(piece);
        figurine += GameMovesUtils.getPieceFullFigurineLiteral(piece);

        const otherBoardsToDropPiece = this.getAllowedMoves(piece).any(({ square: { board, x, y } }) => (
          board !== toBoard
          && x === toX
          && y === toY
        ));

        if (otherBoardsToDropPiece) {
          const boardLiteral = GameMovesUtils.getBoardLiteral(toBoard);

          algebraic += boardLiteral;
          figurine += boardLiteral;
        }

        const destination = GameMovesUtils.getFileLiteral(toX) + GameMovesUtils.getRankLiteral(toY);

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

        if (GameMovesUtils.isPawn(piece)) {
          const otherPawnsOnOtherBoardsAbleToMakeMove = playerPieces
            .filter(GameMovesUtils.isBoardPiece)
            .filter((otherPawn) => (
              GameMovesUtils.isPawn(otherPawn)
              && otherPawn.id !== piece.id
              && otherPawn.location.board !== fromBoard
              && this.getAllowedMoves(otherPawn).any(({ square: { x, y } }) => x === toX && y === toY)
            ));

          if (otherPawnsOnOtherBoardsAbleToMakeMove.length) {
            const boardLiteral = GameMovesUtils.getBoardLiteral(fromBoard);

            algebraic += boardLiteral;
            figurine += boardLiteral;
          }

          if (isCapture) {
            const fileLiteral = GameMovesUtils.getFileLiteral(fromX);

            algebraic += fileLiteral;
            figurine += fileLiteral;
          }
        } else {
          algebraic += GameMovesUtils.getPieceFullAlgebraicLiteral(piece);
          figurine += GameMovesUtils.getPieceFullFigurineLiteral(piece);

          const otherPiecesAbleToMakeMove = playerPieces
            .filter(GameMovesUtils.isBoardPiece)
            .filter((otherPiece) => (
              otherPiece.type === piece.type
              && otherPiece.abilities === piece.abilities
              && otherPiece.id !== piece.id
              && this.getAllowedMoves(otherPiece).any(({ square: { x, y } }) => x === toX && y === toY)
            ));

          if (otherPiecesAbleToMakeMove.length) {
            const boardLiteral = GameMovesUtils.getBoardLiteral(fromBoard);
            const fileLiteral = GameMovesUtils.getFileLiteral(fromX);
            const rankLiteral = GameMovesUtils.getRankLiteral(fromY);

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

        const destination = GameMovesUtils.getFileLiteral(toX) + GameMovesUtils.getRankLiteral(toY);

        algebraic += destination;
        figurine += destination;

        if (isPawnPromotion) {
          algebraic += `=${GameMovesUtils.getPieceAlgebraicLiteral(promotion!)}`;
          figurine += `=${GameMovesUtils.getPieceFigurineLiteral(promotion!, piece.color)}`;
        }
      }
    }

    disappearedOrMovedPieces.forEach((disappearedOrMovedPiece) => {
      this.changePieceLocation(disappearedOrMovedPiece, null);
    });

    if (GameMovesUtils.isPawn(piece) || isCapture) {
      this.pliesWithoutCaptureOrPawnMove = 0;
    } else {
      this.pliesWithoutCaptureOrPawnMove++;
    }

    if (
      !this.isDarkChess
      && fromLocation.type === PieceLocationEnum.BOARD
      && GameMovesUtils.isPawn(piece)
      && Math.abs(toY - fromLocation.y) > 1
      && fromLocation.board === toBoard
      && (!this.isHorde || fromLocation.y !== 0)
    ) {
      this.possibleEnPassant = {
        enPassantSquare: {
          board: toBoard,
          x: toX,
          y: Math.round((toY + fromLocation.y) / 2)
        },
        pieceLocation: this.isAliceChess
          ? { ...newLocation, board: this.getNextBoard(toBoard) }
          : newLocation
      };
    } else {
      this.possibleEnPassant = null;
    }

    this.changePieceLocation(piece, fromLocation.type === PieceLocationEnum.BOARD ? null : newLocation);

    if (!isMainPieceMovedOrDisappeared) {
      const isRoyalKing = wasKing && !this.isAntichess;

      piece.moved = fromLocation.type === PieceLocationEnum.BOARD;
      piece.type = isPawnPromotion && (!this.isFrankfurt || !isRoyalKing)
        ? promotion!
        : piece.type;
      piece.originalType = this.isCrazyhouse
        ? piece.originalType
        : piece.type;
      piece.abilities = this.isFrankfurt && isRoyalKing && isPawnPromotion
        ? promotion!
        : piece.abilities;

      this.changePieceLocation(piece, newLocation);

      if (this.isAbsorption && isCapture) {
        const {
          type,
          abilities
        } = GameMovesUtils.getPieceTypeAfterAbsorption(piece, opponentPiece!);

        piece.type = type;
        piece.originalType = type;
        piece.abilities = abilities;
      } else if (this.isFrankfurt && isCapture && (!isRoyalKing || !isPawnPromotion)) {
        const isOpponentPieceRoyalKing = GameMovesUtils.isKing(opponentPiece!) && !this.isAntichess;
        const newPieceType = isPawnPromotion
          ? piece.type
          : isRoyalKing || isOpponentPieceRoyalKing
            ? PieceTypeEnum.KING
            : opponentPiece!.type;
        const newAbilities = isRoyalKing
          ? isOpponentPieceRoyalKing
            ? opponentPiece!.abilities
            : opponentPiece!.type
          : null;

        piece.type = newPieceType;
        piece.originalType = newPieceType;
        piece.abilities = newAbilities;
      }
    }

    const removePieceOrMoveToOpponentPocket = (piece: Piece) => {
      this.changePieceLocation(piece, null);

      if (this.isCrazyhouse && this.pocketPiecesUsed.includes(piece.originalType)) {
        const pieceType = piece.originalType;
        const opponentColor = GameMovesUtils.getOppositeColor(piece.color);

        piece.moved = false;
        piece.type = pieceType;
        piece.color = opponentColor;

        this.changePieceLocation(piece, {
          type: PieceLocationEnum.POCKET,
          pieceType,
          color: opponentColor
        });
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

        if (GameMovesUtils.isQueen(disappearedOrMovedPiece)) {
          newSquare = {
            x: this.isCapablanca
              ? 4
              : !this.isTwoFamilies || oldSquare.x < this.boardWidth / 2
                ? 3
                : 5,
            y: pieceRankY
          };
        } else if (GameMovesUtils.isEmpress(disappearedOrMovedPiece)) {
          newSquare = {
            x: 3,
            y: pieceRankY
          };
        } else if (GameMovesUtils.isCardinal(disappearedOrMovedPiece)) {
          newSquare = {
            x: 6,
            y: pieceRankY
          };
        } else if (GameMovesUtils.isPawn(disappearedOrMovedPiece)) {
          newSquare = {
            x: oldSquare.x,
            y: color === ColorEnum.WHITE
              ? 1
              : this.boardHeight - 2
          };
        } else if (
          GameMovesUtils.isRook(disappearedOrMovedPiece)
          || GameMovesUtils.isBishop(disappearedOrMovedPiece)
          || GameMovesUtils.isKnight(disappearedOrMovedPiece)
        ) {
          const squareColor = (oldSquare.x + oldSquare.y) % 2;
          const choicesX = GameMovesUtils.isRook(disappearedOrMovedPiece)
            ? [0, this.boardWidth - 1]
            : GameMovesUtils.isKnight(disappearedOrMovedPiece)
              ? [1, this.boardWidth - 2]
              : [2, this.boardWidth - 3];
          const fileX = choicesX.find((fileX) => (fileX + pieceRankY) % 2 === squareColor)!;

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

        this.changePieceLocation(disappearedOrMovedPiece, {
          ...newSquare,
          board: location.board,
          type: PieceLocationEnum.BOARD
        });
      } else {
        removePieceOrMoveToOpponentPocket(disappearedOrMovedPiece);
      }
    });

    let isAllowed = true;
    const isKing = GameMovesUtils.isKing(piece);
    const isTurnedKing = isKing && !wasKing;
    const isTurnedFromKing = !isKing && wasKing;
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
    } else if (isTurnedFromKing) {
      this.kings[this.turn].pop();
    }

    if (this.isAliceChess) {
      if (GameMovesUtils.isKing(piece)) {
        setMoveIsAllowed();
      }

      const nextBoard = this.getNextBoard(toBoard);

      if (!isMainPieceMovedOrDisappeared && fromLocation.type === PieceLocationEnum.BOARD) {
        this.changePieceLocation(piece, {
          ...newLocation,
          board: nextBoard
        });
      }

      disappearedOrMovedPieces.forEach((disappearedOrMovedPiece) => {
        if (GameMovesUtils.isBoardPiece(disappearedOrMovedPiece)) {
          const {
            x: squareX,
            y: squareY
          } = disappearedOrMovedPiece.location;
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
            this.changePieceLocation(disappearedOrMovedPiece, {
              ...square,
              board: nextBoard,
              type: PieceLocationEnum.BOARD
            });
          }
        }
      });
    }

    this.turn = nextTurn;
    this.isCheck = this.isInCheck(nextTurn);
    this.pliesCount++;

    if (this.isCheck) {
      this.checksCount[prevTurn]++;
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
        this.checksCount[prevTurn] = prevChecksCount;
        this.pliesCount--;

        if (oldPositionRepetitions) {
          this.positionsMap[positionString] = oldPositionRepetitions;
        } else {
          delete this.positionsMap[positionString];
        }

        if (isTurnedKing) {
          this.kings[prevTurn].pop();
        } else if (isTurnedFromKing) {
          this.kings[prevTurn].push(piece);
        }

        if (!isMainPieceMovedOrDisappeared) {
          piece.color = prevPieceColor;
          piece.moved = prevPieceMoved;
          piece.type = prevPieceType;
          piece.originalType = prevPieceOriginalType;
          piece.abilities = prevPieceAbilities;

          this.changePieceLocation(piece, prevPieceLocation);
        }

        disappearedOrMovedPiecesData.forEach((pieceData, ix) => {
          const disappearedPiece = disappearedOrMovedPieces[ix];

          disappearedPiece.color = pieceData.color;
          disappearedPiece.moved = pieceData.moved;
          disappearedPiece.type = pieceData.type;
          disappearedPiece.originalType = pieceData.originalType;
          disappearedPiece.abilities = pieceData.abilities;

          this.changePieceLocation(disappearedPiece, pieceData.location);
        });
      }
    };
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

  setupStartingData() {
    super.setupStartingData();

    this.pliesCount = this.startingMoveIndex;
  }
}
