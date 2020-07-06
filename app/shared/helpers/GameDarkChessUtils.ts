import * as _ from 'lodash';

import GameMovesUtils from './GameMovesUtils';
import {
  ColorEnum,
  DarkChessRevertableMove,
  DarkChessVisiblePiece,
  Dictionary,
  EachColor,
  Move,
  Piece,
  PieceBoardLocation,
  PieceLocationEnum
} from '../../types';

export default abstract class GameDarkChessUtils extends GameMovesUtils {
  colorMoves: EachColor<DarkChessRevertableMove[]> = {
    [ColorEnum.WHITE]: [],
    [ColorEnum.BLACK]: []
  };
  visiblePieces: EachColor<readonly DarkChessVisiblePiece[]> = {
    [ColorEnum.WHITE]: [],
    [ColorEnum.BLACK]: []
  };
  startingVisiblePieces: EachColor<readonly DarkChessVisiblePiece[]> = {
    [ColorEnum.WHITE]: [],
    [ColorEnum.BLACK]: []
  };

  getVisiblePieces(forColor: ColorEnum): Piece[] {
    const visibleSquares = this.getVisibleSquares(forColor);

    return this.pieces.filter((piece) => (
      piece.color === forColor || (
        GameDarkChessUtils.isBoardPiece(piece)
        && visibleSquares.some((square) => GameDarkChessUtils.areSquaresEqual(square, piece.location))
      )
    ));
  }

  registerAnyMove(move: Move) {
    if (this.isDarkChess) {
      this.registerDarkChessMove(move);
    } else {
      this.registerMove(move);
    }
  }

  registerDarkChessMove(move: Move) {
    const prevPieceLocations = this.pieces.map(({ location }) => location);
    const idMap = this.pieces.reduce<Dictionary<true>>((map, piece) => {
      map[piece.id] = true;

      return map;
    }, {});
    const prevVisibleSquares = {
      [ColorEnum.WHITE]: this.getVisibleSquares(ColorEnum.WHITE),
      [ColorEnum.BLACK]: this.getVisibleSquares(ColorEnum.BLACK)
    };

    const {
      movedPiece: piece,
      isWin,
      isCapture
    } = this.registerMove(move);

    const registeredMove = _.last(this.moves)!;
    const isPromotion = !!move.promotion;

    _.forEach(ColorEnum, (color) => {
      const isOwnMove = color === piece.color;
      const oldVisiblePieces = this.visiblePieces[color];
      const newVisiblePieces = this.getVisiblePieces(color);
      const visibleSquares = this.getVisibleSquares(color);

      const newPieces = newVisiblePieces.map((piece) => {
        const isOwnPiece = piece.color === color;
        const oldPiece = oldVisiblePieces.find(({ realId }) => realId === piece.id);
        const prevPieceLocation = prevPieceLocations[this.pieces.findIndex(({ id }) => id === piece.id)];
        const oldLocationVisible = (
          !!prevPieceLocation
          && prevPieceLocation.type === PieceLocationEnum.BOARD
          && prevVisibleSquares[color].some((square) => GameDarkChessUtils.areSquaresEqual(square, prevPieceLocation))
          && visibleSquares.some((square) => GameDarkChessUtils.areSquaresEqual(square, prevPieceLocation))
        );
        const newLocationVisible = (
          GameDarkChessUtils.isBoardPiece(piece)
          && visibleSquares.some((square) => GameDarkChessUtils.areSquaresEqual(square, piece.location))
        );
        const newId = oldPiece && (isOwnPiece || (oldLocationVisible && newLocationVisible))
          ? oldPiece.id
          : GameDarkChessUtils.generateUid(idMap);

        return {
          ...piece,
          moved: isOwnPiece && piece.moved,
          id: newId,
          realId: piece.id
        };
      });
      const fromLocationVisible = (
        move.from.type === PieceLocationEnum.BOARD
        && prevVisibleSquares[color].some((square) => GameDarkChessUtils.areSquaresEqual(square, move.from as PieceBoardLocation))
        && visibleSquares.some((square) => GameDarkChessUtils.areSquaresEqual(square, move.from as PieceBoardLocation))
      );
      const toLocationVisible = visibleSquares.some((square) => GameDarkChessUtils.areSquaresEqual(square, move.to));
      let algebraic = '';
      let figurine = '';

      if (isOwnMove) {
        algebraic = registeredMove.algebraic;
        figurine = registeredMove.figurine;
      } else if (fromLocationVisible || toLocationVisible || isCapture) {
        if (fromLocationVisible || toLocationVisible) {
          algebraic += GameDarkChessUtils.getPieceFullAlgebraicLiteral(piece);
          figurine += GameDarkChessUtils.getPieceFullFigurineLiteral(piece);
        }

        if (fromLocationVisible) {
          const {
            x: fromX,
            y: fromY
          } = move.from as PieceBoardLocation;
          const fileLiteral = GameDarkChessUtils.getFileLiteral(fromX);
          const rankLiteral = GameDarkChessUtils.getRankLiteral(fromY);
          const fromLocationLiteral = fileLiteral + rankLiteral;

          algebraic += fromLocationLiteral;
          figurine += fromLocationLiteral;
        } else {
          algebraic += '?';
          figurine += '?';
        }

        if (isCapture) {
          algebraic += 'x';
          figurine += 'x';
        }

        if (toLocationVisible || isCapture) {
          const {
            x: toX,
            y: toY
          } = move.to;
          const fileLiteral = GameDarkChessUtils.getFileLiteral(toX);
          const rankLiteral = GameDarkChessUtils.getRankLiteral(toY);
          const toLocationLiteral = fileLiteral + rankLiteral;

          algebraic += toLocationLiteral;
          figurine += toLocationLiteral;
        } else {
          algebraic += '?';
          figurine += '?';
        }

        const promotionVisible = (
          isPromotion
          && fromLocationVisible
          && (!this.isHexagonalChess || toLocationVisible)
        );

        if (promotionVisible) {
          algebraic += `=${toLocationVisible ? GameDarkChessUtils.getPieceAlgebraicLiteral(move.promotion!) : '?'}`;
          figurine += `=${toLocationVisible ? GameDarkChessUtils.getPieceFigurineLiteral(move.promotion!, piece.color) : '?'}`;
        }

        if (isWin) {
          algebraic += '#';
          figurine += '#';
        }
      } else {
        algebraic = '?';
        figurine = '?';
      }

      this.visiblePieces[color] = newPieces;

      this.colorMoves[color].push({
        ...move,
        from: fromLocationVisible ? move.from : null,
        to: toLocationVisible || isCapture ? move.to : null,
        algebraic,
        figurine,
        isCapture,
        pieces: newPieces.map((piece) => _.omit(piece, 'realId')),
        prevPiecesWorth: this.isFrankfurt || this.isAbsorption || this.isAtomic || this.isCirce
          ? { [ColorEnum.WHITE]: 0, [ColorEnum.BLACK]: 0 }
          : registeredMove.prevPiecesWorth,
        timeBeforeMove: registeredMove.timeBeforeMove,
        revertMove: () => {
          this.visiblePieces[color] = oldVisiblePieces;
        }
      });
    });
  }

  setupStartingData() {
    super.setupStartingData();

    if (this.isDarkChess) {
      _.forEach(ColorEnum, (color) => {
        this.visiblePieces[color] = this.startingVisiblePieces[color] = this.getVisiblePieces(color).map((piece) => ({
          ...piece,
          realId: piece.id
        }));
      });
    }
  }
}
