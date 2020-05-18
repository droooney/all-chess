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
  BaseMove,
  BoardPiece,
  CastlingTypeEnum,
  ColorEnum,
  GamePlayers,
  GameResult,
  GetPossibleMovesMode,
  Move,
  MovementType,
  Piece,
  PieceBoardLocation,
  PieceLocationEnum,
  PieceTypeEnum,
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

export default abstract class GameMovesUtils extends GamePositionUtils {
  abstract players: GamePlayers;

  moves: RevertableMove[] = [];
  pliesCount: number = 0;

  abstract end(winner: ColorEnum | null, reason: ResultReasonEnum): void;
  abstract isDraw(): ResultReasonEnum | null;
  abstract isWin(): GameResult | null;

  getAllowedMoves(piece: RealPiece): Generator<Square> {
    const possibleMoves = this.getFilteredPossibleMoves(piece, GetPossibleMovesMode.FOR_MOVE);

    if (this.isAntichess) {
      return this.hasCapturePieces(piece.color)
        ? possibleMoves.filter((square) => !!this.getCapturedPiece(piece, square))
        : possibleMoves;
    }

    if (this.isLeftInCheckAllowed && !this.isAtomic) {
      return possibleMoves;
    }

    return possibleMoves.filter((square) => {
      if (this.isPromoting(piece, square)) {
        return this.validPromotions.some((promotion) => {
          const { allowed, revertMove } = this.performMove({
            from: piece.location,
            to: square,
            promotion
          }, { checkIfAllowed: true });

          revertMove();

          return allowed;
        });
      }

      const { allowed, revertMove } = this.performMove({
        from: piece.location,
        to: square
      }, { checkIfAllowed: true });

      revertMove();

      return allowed;
    });
  }

  *getFilteredPossibleMoves(piece: RealPiece, mode: GetPossibleMovesMode): Generator<Square> {
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
      .filter((square) => (
        !this.isAliceChess || (!forMove && !onlyPossible) || this.isAvailableSquare(square)
      ))
      .filter((square) => captureAllowed || !this.getCapturedPiece(piece, square));
  }

  // do not call this anywhere except getFilteredPossibleMoves (allowed to call for premoves)
  *getPossibleMoves(piece: RealPiece, mode: GetPossibleMovesMode): Generator<Square> {
    const forMove = mode === GetPossibleMovesMode.FOR_MOVE;
    const onlyVisible = mode === GetPossibleMovesMode.VISIBLE;
    const onlyPossible = mode === GetPossibleMovesMode.POSSIBLE;
    const onlyPremove = mode === GetPossibleMovesMode.PREMOVES;

    if (GameMovesUtils.isPocketPiece(piece)) {
      const visibleSquares = this.isDarkChess && !onlyPremove ? this.getVisibleSquares(piece.color) : [];

      for (let board = 0; board < this.boardCount; board++) {
        for (let rankY = 0; rankY < this.boardHeight; rankY++) {
          for (let fileX = 0; fileX < this.boardWidth; fileX++) {
            const square: Square = {
              board,
              x: fileX,
              y: rankY
            };

            if (
              !this.isNullSquare(square)
              && (
                !GameMovesUtils.isPawn(piece)
                || (
                  !this.isFirstRank(square, piece.color)
                  && !this.isLastRank(square, piece.color)
                )
              )
              && (
                onlyPremove || (
                  (
                    !this.isDarkChess
                    || visibleSquares.some((visibleSquare) => GameMovesUtils.areSquaresEqual(square, visibleSquare))
                  )
                  && !this.getBoardPiece(square)
                )
              )
            ) {
              yield square;
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
    ): Generator<Square> {
      let iterations = 0;

      for (const square of this.traverseDirection(piece.location, movementType, incrementY, incrementX)) {
        const pieceInSquare = this.getBoardPiece(square);

        if (!onlyPremove && pieceInSquare && pieceInSquare.color === pieceColor) {
          if (!forMove && !onlyPossible) {
            yield square;
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

        yield square;

        if (pieceInSquare && !onlyPremove) {
          return;
        }

        if (++iterations === stopAfter) {
          return;
        }
      }
    }.bind(this);

    if (onlyVisible) {
      yield { board, x: pieceX, y: pieceY };
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
      let forwardDirection: number;

      if (this.isCircularChess) {
        forwardDirection = (
          pieceColor === ColorEnum.WHITE
          && pieceY < this.boardHeight / 2
        ) || (
          pieceColor === ColorEnum.BLACK
          && pieceY >= this.boardHeight / 2
        ) ? 1 : -1;
      } else {
        forwardDirection = pieceColor === ColorEnum.WHITE ? 1 : -1;
      }

      const rankY = this.adjustRankY(pieceY + forwardDirection);
      const square = {
        board,
        x: pieceX,
        y: rankY
      };

      if ((forMove || onlyPossible || onlyVisible || onlyPremove) && !this.isNullSquare(square)) {
        // 1-forward move
        const pieceInSquare = this.getBoardPiece(square);

        if (!pieceInSquare || onlyVisible || onlyPremove) {
          yield square;

          if ((!pieceInSquare || onlyPremove) && this.isPawnInitialRank(piece.location, pieceColor)) {
            // 2-forward move
            const square = {
              board,
              x: pieceX,
              y: rankY + forwardDirection
            };
            const pieceInSquare = this.getBoardPiece(square);

            if (!pieceInSquare || onlyVisible || onlyPremove) {
              yield square;
            }
          }
        }
      }

      if (this.isRetreatChess) {
        // backward move
        const rankY = this.adjustRankY(pieceY - forwardDirection);
        const square = {
          board,
          x: pieceX,
          y: rankY
        };

        if (!this.isNullSquare(square) && !this.isPawnInitialRank(piece.location, pieceColor)) {
          const pieceInSquare = this.getBoardPiece(square);

          if (!pieceInSquare || onlyVisible || onlyPremove) {
            yield square;
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
            ? rankY - forwardDirection
            : rankY
        };

        if (!this.isNullSquare(square)) {
          const pieceInSquare = this.getBoardPiece(square);
          const isEnPassant = (
            !!this.possibleEnPassant
            && GameMovesUtils.areSquaresEqual(square, this.possibleEnPassant.enPassantSquare)
          );

          if (
            (!forMove && !onlyPossible)
            || (!!pieceInSquare && pieceInSquare.color !== pieceColor)
            || isEnPassant
          ) {
            yield square;
          }
        }
      }
    }

    if (
      (forMove || onlyPremove)
      && isKing
      && !piece.moved
      && piece.location.y === (pieceColor === ColorEnum.WHITE ? 0 : this.boardHeight - 1)
      && (
        this.isLeftInCheckAllowed
        || onlyPremove
        || !this.isAttackedByOpponentPiece(piece.location, opponentColor)
      )
    ) {
      const queenSideKing = this.kings[pieceColor][0];
      const kingSideKing = _.last(this.kings[pieceColor])!;
      const validCastlingRooks = _
        .filter(this.getCastlingRooks(pieceColor), (rook, castlingSide) => (
          (
            // queen-side king and queen-side rook
            (piece.id === queenSideKing.id && castlingSide === CastlingTypeEnum.QUEEN_SIDE)
            // king-side king and king-side rook
            || (piece.id === kingSideKing.id && castlingSide === CastlingTypeEnum.KING_SIDE)
          )
          && this.startingData.possibleCastling[pieceColor][castlingSide]
          && !!rook
          && rook.location.board === board
          && (!onlyPremove || !this.isMadrasi || !this.isParalysed(rook))
        ))
        .filter((rook) => {
          const { location: rookLocation } = rook!;
          const isKingSideRook = rookLocation.x - pieceX > 0;
          const newKingX = isKingSideRook ? this.boardWidth - 2 : 2;
          const newRookX = isKingSideRook ? this.boardWidth - 3 : 3;
          let canKingMove = true;

          if (forMove) {
            _.forEach(_.times(Math.abs(pieceX - newKingX)), (x) => {
              const fileX = newKingX + (pieceX > newKingX ? +x : -x);
              const pieceInSquare = this.getBoardPiece({ board, y: pieceY, x: fileX });

              // square is attacked or square is occupied by a piece that is not the rook
              if ((
                fileX !== newKingX
                && !this.isLeftInCheckAllowed
                && this.isAttackedByOpponentPiece({ board, x: fileX, y: pieceY }, opponentColor)
              ) || (
                pieceInSquare
                && pieceInSquare.id !== rook!.id
              )) {
                return canKingMove = false;
              }
            });
          }

          if (!canKingMove) {
            return false;
          }

          let canRookMove = true;

          if (forMove) {
            _.forEach(_.times(Math.abs(rookLocation.x - newRookX)), (x) => {
              const fileX = newRookX + (rookLocation.x > newRookX ? +x : -x);
              const pieceInSquare = this.getBoardPiece({ board, y: pieceY, x: fileX });

              // square is occupied by a piece that is not the king
              if (
                pieceInSquare
                && pieceInSquare.id !== piece.id
              ) {
                return canRookMove = false;
              }
            });

            if (this.boardCount > 1) {
              // a rook cannot move to a square that is occupied on any other board
              canRookMove = canRookMove && _.times(this.boardCount - 1).every((board) => (
                !this.getBoardPiece({
                  board: this.getNextBoard(rookLocation.board + board),
                  y: rookLocation.y,
                  x: newRookX
                })
              ));
            }
          }

          return canRookMove;
        });

      for (const rook of validCastlingRooks) {
        const { location: rookLocation } = rook!;
        const isKingSideRook = rookLocation.x - pieceX > 0;

        yield {
          board,
          x: this.is960
            ? rookLocation.x
            : isKingSideRook
              ? this.boardWidth - 2
              : 2,
          y: pieceY
        };
      }
    }
  }

  isMoveAllowed(piece: RealPiece, square: Square, promotion: unknown): boolean {
    const possibleMove = this.getFilteredPossibleMoves(piece, GetPossibleMovesMode.FOR_MOVE).find((sq) => (
      GameMovesUtils.areSquaresEqual(square, sq)
    ));

    return (
      !!possibleMove
      && (!this.isPromoting(piece, square) || this.validPromotions.includes(promotion as any))
      && this.isPossibleMoveAllowed(piece, possibleMove, promotion as any)
    );
  }

  isNoMoves(): boolean {
    return this.getPieces(this.turn).every((piece) => (
      !this.getAllowedMoves(piece).take(0)
    ));
  }

  // do not call with a random move
  isPossibleMoveAllowed(piece: RealPiece, square: Square, promotion: PieceTypeEnum): boolean {
    if (this.isAntichess) {
      return !this.hasCapturePieces(piece.color) || !!this.getCapturedPiece(piece, square);
    }

    if (this.isLeftInCheckAllowed && !this.isAtomic) {
      return true;
    }

    const { allowed, revertMove } = this.performMove({
      from: piece.location,
      to: square,
      promotion
    }, { checkIfAllowed: true });

    revertMove();

    return allowed;
  }

  performMove(move: BaseMove, options: PerformMoveOptions = {}): PerformMoveReturnValue {
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
    const opponentPiece = this.getCapturedPiece(piece, toLocation);
    const isCapture = !!opponentPiece;
    const disappearedOrMovedPieces: Piece[] = [];
    const isPawnPromotion = this.isPromoting(piece, toLocation);
    const wasKing = GameMovesUtils.isKing(piece);
    const isMainPieceMovedOrDisappeared = this.isAtomic && isCapture;
    const castlingRook = this.getCastlingRook(piece, toLocation);
    const isCastling = !!castlingRook;
    const isKingSideCastling = isCastling && toX - (fromLocation as PieceBoardLocation).x > 0;

    const prevTurn = this.turn;
    const nextTurn = this.getOpponentColor();
    const prevIsCheck = this.isCheck;
    const prevPliesFor50MoveRule = this.pliesFor50MoveRule;
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
    let needToReset50MoveRule = isPawnPromotion || (!this.isRetreatChess && GameMovesUtils.isPawn(piece));

    if (this.isAtomic && isCapture) {
      const squaresAround: (Square | null)[] = [toLocation];

      for (const [incrementY, incrementX] of this.isHexagonalChess ? HEX_ROOK_MOVE_INCREMENTS : ROOK_MOVE_INCREMENTS) {
        squaresAround.push(this.traverseDirection(toLocation, PieceTypeEnum.ROOK, incrementY, incrementX).take(0));
      }

      for (const [incrementY, incrementX] of this.isHexagonalChess ? HEX_BISHOP_MOVE_INCREMENTS : BISHOP_MOVE_INCREMENTS) {
        squaresAround.push(this.traverseDirection(toLocation, PieceTypeEnum.BISHOP, incrementY, incrementX).take(0));
      }

      squaresAround.forEach((square) => {
        if (square) {
          const pieceInSquare = this.getBoardPiece(square);

          if (pieceInSquare && (!GameMovesUtils.isPawn(pieceInSquare) || pieceInSquare.abilities)) {
            disappearedOrMovedPieces.push(pieceInSquare);
          }
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

        const otherBoardsToDropPiece = this.getAllowedMoves(piece).any(({ board, x, y }) => (
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

        if (piece.type === PieceTypeEnum.PAWN) {
          if (isCapture) {
            const fileLiteral = GameMovesUtils.getFileLiteral(fromX);

            algebraic += fileLiteral;
            figurine += fileLiteral;
          } else if (this.isAliceChess || this.isRetreatChess) {
            const otherPawnsAbleToMakeMove = playerPieces
              .filter(GameMovesUtils.isBoardPiece)
              .filter((otherPawn) => (
                otherPawn.type === PieceTypeEnum.PAWN
                && otherPawn.id !== piece.id
                && this.getAllowedMoves(otherPawn).any((square) => GameMovesUtils.areSquaresEqual(square, toLocation, false))
              ));

            if (otherPawnsAbleToMakeMove.length) {
              const rankLiteral = GameMovesUtils.getRankLiteral(fromY);

              algebraic += rankLiteral;
              figurine += rankLiteral;
            }
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
              && this.getAllowedMoves(otherPiece).any((square) => GameMovesUtils.areSquaresEqual(square, toLocation, false))
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

    if (
      !this.isDarkChess
      && fromLocation.type === PieceLocationEnum.BOARD
      && GameMovesUtils.isPawn(piece)
      && Math.abs(toY - fromLocation.y) > 1
      // FIXME: is it possible to be different boards
      && fromLocation.board === toBoard
      && (!this.isHorde || fromLocation.y !== 0)
    ) {
      this.possibleEnPassant = {
        enPassantSquare: {
          board: this.getNextBoard(toBoard),
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
      } else {
        needToReset50MoveRule = true;
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
        const circularChessQueenSideRankY = color === ColorEnum.WHITE
          ? 0
          : this.boardOrthodoxHeight - 1;
        const circularChessKingSideRankY = color === ColorEnum.WHITE
          ? this.boardHeight - 1
          : this.boardOrthodoxHeight;

        if (GameMovesUtils.isQueen(disappearedOrMovedPiece)) {
          newSquare = {
            x: this.isCapablanca
              ? 4
              : this.isCircularChess
                ? !this.isTwoFamilies || oldSquare.y < this.boardOrthodoxHeight
                  ? 3
                  : 4
                : !this.isTwoFamilies || oldSquare.x < this.boardWidth / 2
                  ? 3
                  : 5,
            y: this.isCircularChess
              ? !this.isTwoFamilies || oldSquare.y < this.boardOrthodoxHeight
                ? circularChessQueenSideRankY
                : circularChessKingSideRankY
              : pieceRankY
          };
        } else if (GameMovesUtils.isEmpress(disappearedOrMovedPiece)) {
          newSquare = {
            x: 3,
            y: this.isCircularChess
              ? circularChessQueenSideRankY
              : pieceRankY
          };
        } else if (GameMovesUtils.isCardinal(disappearedOrMovedPiece)) {
          newSquare = {
            x: this.isCircularChess ? 3 : 6,
            y: this.isCircularChess
              ? circularChessKingSideRankY
              : pieceRankY
          };
        } else if (GameMovesUtils.isPawn(disappearedOrMovedPiece)) {
          newSquare = {
            x: oldSquare.x,
            y: this.isCircularChess
              ? color === ColorEnum.WHITE
                ? oldSquare.y < this.boardOrthodoxHeight
                  ? 1
                  : this.boardHeight - 2
                : oldSquare.y < this.boardOrthodoxHeight
                  ? this.boardOrthodoxHeight - 2
                  : this.boardOrthodoxHeight + 1
              : color === ColorEnum.WHITE
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
          const circularFileX = GameMovesUtils.isRook(disappearedOrMovedPiece)
            ? 0
            : GameMovesUtils.isKnight(disappearedOrMovedPiece)
              ? 1
              : 2;

          newSquare = {
            x: this.isCircularChess
              ? circularFileX
              : choicesX.find((fileX) => (fileX + pieceRankY) % 2 === squareColor)!,
            y: this.isCircularChess
              ? (circularFileX + circularChessQueenSideRankY) % 2 === squareColor
                ? circularChessQueenSideRankY
                : circularChessKingSideRankY
              : pieceRankY
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

    if (needToReset50MoveRule) {
      this.pliesFor50MoveRule = 0;
    } else {
      this.pliesFor50MoveRule++;
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
        this.pliesFor50MoveRule = prevPliesFor50MoveRule;
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
    const prevPiecesWorth = this.getPiecesWorth();
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
      prevPiecesWorth,
      timeBeforeMove: {
        [ColorEnum.WHITE]: this.players[ColorEnum.WHITE].time,
        [ColorEnum.BLACK]: this.players[ColorEnum.BLACK].time
      },
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
